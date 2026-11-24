import fs from 'node:fs';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url);
const env = {};
for (const line of fs.readFileSync(new URL('.env.local', ROOT), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
  if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}
const baseUrl = env.QA_BASE_URL || 'http://localhost:3000';
const reportPath = new URL('qa-report.json', ROOT);
const issues = [];
const visited = [];
const smoke = [];
let currentPage = '(startup)';
const add = (type, message, extra = {}) => {
  const key = `${currentPage}|${type}|${message}`;
  if (!issues.some((item) => item.key === key)) issues.push({ key, page: currentPage, type, message, ...extra });
};

if (!env.TEST_EMAIL || !env.TEST_PASSWORD) throw new Error('TEST_EMAIL / TEST_PASSWORD missing from .env.local');

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const responseBody = async (response) => {
    try { return (await response.text()).slice(0, 500); } catch { return ''; }
  };

  page.on('pageerror', (error) => add('pageerror', String(error.message || error).slice(0, 500)));
  page.on('console', (message) => {
    if (message.type() === 'error') add('console.error', message.text().slice(0, 500));
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || '';
    if (!failure.includes('ERR_ABORTED')) add('network.failed', `${request.method()} ${request.url()} - ${failure}`);
  });
  page.on('response', async (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    const isSupabase = url.includes('supabase');
    const isApp = url.startsWith(baseUrl) && !/\/(favicon|_next\/static)/.test(url);
    if (isSupabase || isApp) add(isSupabase ? 'supabase.error' : 'http.error', `${response.status()} ${response.request().method()} ${url}`, { response: await responseBody(response) });
  });

  try {
    currentPage = '/login';
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.fill('input[type="email"]', env.TEST_EMAIL);
    await page.fill('input[type="password"]', env.TEST_PASSWORD);
    await page.getByRole('button', { name: /دخول|login|sign in/i }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/dashboard'), { timeout: 45000, waitUntil: 'commit' });
  } catch (error) {
    add('login.failed', String(error.message || error).split('\n')[0]);
    await finish(browser);
    return;
  }

  const expandSidebar = async () => {
    const buttons = page.locator('nav button').filter({ hasNotText: /تسجيل الخروج/ });
    for (let index = 0, count = await buttons.count(); index < count; index += 1) await buttons.nth(index).click().catch(() => {});
  };
  const linksFromSidebar = async () => {
    await expandSidebar();
    return [...new Set(await page.locator('nav a[href^="/"]').evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')?.split('?')[0]).filter(Boolean)))];
  };
  const navigate = async (href) => {
    currentPage = href;
    await page.goto(`${baseUrl}${href}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
  };

  const links = await linksFromSidebar();
  if (!links.includes('/dashboard')) links.unshift('/dashboard');
  for (const href of links) {
    try {
      await navigate(href);
      const text = (await page.locator('body').innerText()).trim();
      if (page.url().includes('/login')) add('page.redirected', 'Redirected to /login');
      if (/This page could not be found|404/i.test(text)) add('page.404', 'Page shows 404');
      if (text.length < 5) add('page.empty', 'Page is blank');
      if (/قيد التطوير/.test(text)) add('page.stub', 'Page is a placeholder (قيد التطوير)');
      visited.push({ href, url: page.url(), ok: true });
    } catch (error) {
      add('page.load', String(error.message || error).split('\n')[0]);
      visited.push({ href, url: page.url(), ok: false });
    }
  }

  const step = async (name, fn) => {
    currentPage = `smoke:${name}`;
    try { await fn(); smoke.push({ name, ok: true }); }
    catch (error) { const note = String(error.message || error).split('\n')[0]; smoke.push({ name, ok: false, note }); add('smoke.failed', note); }
  };
  const saveCustomerForm = async (name) => {
    const form = page.locator('form');
    await form.getByPlaceholder('الاسم', { exact: true }).fill(name);
    await form.getByPlaceholder('رقم الهاتف', { exact: true }).fill('07700000000');
    await form.getByRole('button', { name: 'حفظ', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/dashboard/customers', { timeout: 30000, waitUntil: 'commit' });
  };
  const deleteRow = async (value) => {
    const row = page.locator('tr', { hasText: value }).first();
    if (!(await row.count())) throw new Error(`Created record "${value}" not visible`);
    const deleteButton = row.locator('button').filter({ hasText: /حذف|delete/i }).or(row.locator('button:has(svg.lucide-trash-2), button:has(svg.lucide-trash)')).first();
    if (!(await deleteButton.count())) throw new Error('Delete button not found');
    const nativeConfirmation = page.waitForEvent('dialog', { timeout: 3000 })
      .then((dialog) => dialog.accept())
      .catch(() => {});
    await deleteButton.click();
    await nativeConfirmation;
    const confirmationDialog = page.getByRole('dialog');
    if (await confirmationDialog.count()) {
      await confirmationDialog.getByRole('button', { name: /تأكيد|حذف|confirm|delete/i }).last().click();
    }
    await page.waitForTimeout(900);
    if (await page.locator('tr', { hasText: value }).count()) throw new Error(`Record "${value}" remains after delete`);
  };

  const stamp = Date.now();
  await step('product add and delete', async () => {
    const productName = `QA-Product-${stamp}`;
    await navigate('/dashboard/inventory/products');
    page.once('dialog', (dialog) => dialog.accept(productName));
    await page.getByRole('button', { name: 'إضافة', exact: true }).click();
    await page.waitForTimeout(1000);
    await deleteRow(productName);
  });
  await step('customer add and verify', async () => {
    const customerName = `QA-Customer-${stamp}`;
    await navigate('/dashboard/customers');
    await page.getByRole('button', { name: 'إضافة عميل جديد', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/dashboard/customers/new', { timeout: 30000, waitUntil: 'commit' });
    await saveCustomerForm(customerName);
    const row = page.locator('tr', { hasText: customerName }).first();
    try {
      await row.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      const search = page.getByPlaceholder('بحث بالاسم أو الهاتف...');
      await search.fill(customerName);
      await row.waitFor({ state: 'visible', timeout: 10000 });
    }
    if (!(await row.getByText('07700000000', { exact: true }).count())) throw new Error(`Created customer "${customerName}" has no matching phone`);
    await deleteRow(customerName);
  });
  await step('complete sales invoice', async () => {
    await navigate('/dashboard/invoicing');
    const product = page.locator('button').filter({ hasText: /المتوفر:/ }).filter({ hasNotText: /نافد/ }).first();
    if (!(await product.count())) throw new Error('No in-stock product card found');
    await product.click();
    await page.getByRole('button', { name: /إتمام البيع وحفظ/i }).click();
    await page.getByText(/تم حفظ البيع|فشل حفظ الفاتورة/i).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    if (await page.getByText(/فشل حفظ الفاتورة/i).count()) throw new Error('Invoice save reported failure');
  });

  await finish(browser);
}

async function finish(browser) {
  await browser.close();
  const cleanIssues = issues.map(({ key, ...item }) => item);
  fs.writeFileSync(reportPath, JSON.stringify({ date: new Date().toISOString(), pagesVisited: visited, smoke, issueCount: cleanIssues.length, issues: cleanIssues }, null, 2));
  console.log(`QA complete: ${cleanIssues.length} issue(s); report written to ${reportPath.pathname}`);
  process.exitCode = cleanIssues.length ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
