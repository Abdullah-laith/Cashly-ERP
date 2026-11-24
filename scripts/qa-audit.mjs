import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.QA_BASE_URL || 'http://localhost:3000';

// Read .env.local without extra dependencies
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!env.TEST_EMAIL || !env.TEST_PASSWORD) {
  console.error('TEST_EMAIL / TEST_PASSWORD missing from .env.local');
  process.exit(2);
}

const issues = [];
let currentPage = '(startup)';
const add = (type, message, extra = {}) => {
  const key = `${currentPage}|${type}|${message}`;
  if (issues.some((i) => i.key === key)) return;
  issues.push({ key, page: currentPage, type, message, ...extra });
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  page.on('pageerror', (e) => add('pageerror', String(e.message || e).slice(0, 400)));
  page.on('console', (m) => {
    if (m.type() === 'error') add('console.error', m.text().slice(0, 400));
  });
  page.on('requestfailed', (r) => {
    const f = r.failure()?.errorText || '';
    if (f.includes('ERR_ABORTED')) return; // navigation cancellations
    add('network.failed', `${r.method()} ${r.url()} - ${f}`);
  });
  page.on('response', async (r) => {
    if (r.status() < 400) return;
    const url = r.url();
    const isSupabase = url.includes('supabase');
    if (!isSupabase && !url.startsWith(BASE)) return;
    if (!isSupabase && /\/(favicon|_next\/static)/.test(url)) return;
    let body = '';
    try { body = (await r.text()).slice(0, 300); } catch {}
    add(isSupabase ? 'supabase.error' : 'http.error', `${r.status()} ${r.request().method()} ${url}`, { response: body });
  });

  // --- Login
  try {
    currentPage = '/login';
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500); // let React hydrate
    await page.fill('input[type="email"]', env.TEST_EMAIL);
    await page.fill('input[type="password"]', env.TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/dashboard'), { timeout: 40000, waitUntil: 'commit' });
  } catch (e) {
    add('login.failed', String(e.message).split('\n')[0]);
    return finish(browser, []);
  }

  // --- Collect sidebar links (expand all accordions first)
  currentPage = '/dashboard';
  await page.waitForLoadState('networkidle').catch(() => {});
  const accordions = page.locator('nav button:not(:has-text("تسجيل الخروج"))');
  for (let i = 0, n = await accordions.count(); i < n; i++) {
    await accordions.nth(i).click({ timeout: 2000 }).catch(() => {});
  }
  await page.waitForTimeout(500);
  const links = [...new Set(await page.$$eval('nav a[href^="/"]', (as) => as.map((a) => a.getAttribute('href').split('?')[0])))];
  if (!links.includes('/dashboard')) links.unshift('/dashboard');
  console.log(`Sidebar links found: ${links.length}`);


  // Client-side navigation (full reloads of /dashboard/* are redirected by middleware - reported as its own issue)
  const nav = async (href) => {
    if (page.url().includes('/login')) return { status: 302 };
    const link = page.locator(`nav a[href="${href}"]`).first();
    if (!(await link.count())) {
      const btns = page.locator('nav button:not(:has-text("تسجيل الخروج"))');
      for (let i = 0, n = await btns.count(); i < n; i++) await btns.nth(i).click({ timeout: 1000 }).catch(() => {});
    }
    if (await link.count()) { await link.click(); await page.waitForURL((u) => u.pathname === href, { timeout: 60000, waitUntil: 'commit' }).catch(() => {}); return { status: 200 }; }
    await page.evaluate((h) => { history.pushState({}, '', h); window.dispatchEvent(new PopStateEvent('popstate')); }, href);
    return { status: 200 };
  };

  // --- Visit each page
  const visited = [];
  for (const href of links) {
    currentPage = href;
    let status = null;
    try {
      const resp = await nav(href);
      status = resp.status;
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(800);
      if (status && status >= 400) add('page.status', `HTTP ${status}`);
      const text = (await page.locator('body').innerText().catch(() => '')).trim();
      if (/This page could not be found/.test(text)) add('page.404', 'Page shows 404');
      if (text.length < 5) add('page.empty', 'Page is blank');
      if (/قيد التطوير/.test(text)) add('page.stub', 'Page is a placeholder (قيد التطوير)');
      if (await page.locator('nextjs-portal').count()) {
        const t = await page.locator('nextjs-portal').first().innerText().catch(() => '');
        if (t.trim()) add('next.overlay', t.trim().slice(0, 400));
      }
      if (page.url().includes('/login')) add('page.redirected', 'Redirected to /login (session lost)');
    } catch (e) {
      add('page.load', String(e.message).split('\n')[0]);
    }
    visited.push({ href, status });
  }

  // --- Dead-button check on the dashboard + topbar (buttons that do nothing when clicked)
  currentPage = '/dashboard (buttons)';
  await nav('/dashboard');
  await page.waitForTimeout(1500);
  const skip = /تسجيل الخروج|حذف|delete/i;
  const btnLoc = page.locator('header button, main button');
  const btnCount = await btnLoc.count();
  for (let i = 0; i < btnCount; i++) {
    if (!page.url().includes('/dashboard') || page.url().includes('/login')) break;
    const b = btnLoc.nth(i);
    const label = ((await b.innerText().catch(() => '')) || (await b.getAttribute('aria-label').catch(() => '')) || `button#${i}`).trim().slice(0, 40);
    if (skip.test(label) || !(await b.isVisible().catch(() => false)) || (await b.isDisabled().catch(() => false))) continue;
    const before = { url: page.url(), html: await page.evaluate(() => document.documentElement.outerHTML.length + '|' + document.documentElement.className) };
    await b.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(900);
    const after = { url: page.url(), html: await page.evaluate(() => document.documentElement.outerHTML.length + '|' + document.documentElement.className) };
    if (before.url === after.url && before.html === after.html) add('dead.button', `Button "${label}" does nothing when clicked`);
    if (after.url !== before.url) { await nav('/dashboard'); await page.waitForTimeout(1200); }
    else if (before.html !== after.html) await page.keyboard.press('Escape').catch(() => {});
  }

  // --- Smoke tests
  const smoke = [];
  const step = async (name, fn) => {
    currentPage = `smoke:${name}`;
    try { await fn(); smoke.push({ name, ok: true }); }
    catch (e) { const m = String(e.message).split('\n')[0]; smoke.push({ name, ok: false, note: m }); add('smoke.failed', m); }
  };
  const stamp = Date.now();
  const openAdd = async (path, re) => {
    await nav(path);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    if (page.url().includes('/login')) throw new Error(`redirected to /login on ${path} (session lost)`);
    const btn = page.getByRole('button', { name: re }).or(page.getByRole('link', { name: re })).first();
    if (!(await btn.count())) throw new Error(`No add button/link matching ${re} on ${path}`);
    await btn.click();
    await page.waitForTimeout(1000);
  };
  const fillAndSave = async (name) => {
    const dialog = page.locator('[role="dialog"]').first();
    const scope = (await dialog.count()) ? dialog : page;
    const inputs = scope.locator('input:not([type=hidden]):not([type=checkbox]):not([type=radio])');
    if (!(await inputs.count())) throw new Error('No form inputs appeared after clicking add');
    for (let i = 0, n = await inputs.count(); i < n; i++) {
      const el = inputs.nth(i);
      const type = (await el.getAttribute('type')) || 'text';
      const val = type === 'number' ? '1' : type === 'email' ? `qa${stamp}@example.com` : type === 'tel' ? '0500000000' : name;
      await el.fill(val).catch(() => {});
    }
    await scope.getByRole('button', { name: /حفظ|إضافة|save|add|submit/i }).last().click();
    await page.waitForTimeout(1500);
  };
  const deleteRow = async (name) => {
    const row = page.locator('tr', { hasText: name }).first();
    if (!(await row.count())) throw new Error(`Created record "${name}" not visible in list`);
    page.once('dialog', (d) => d.accept());
    await row
      .locator('button')
      .filter({ hasText: /حذف|delete/i })
      .or(row.locator('button[aria-label*="حذف"], button:has(svg.lucide-trash-2), button:has(svg.lucide-trash)'))
      .first()
      .click();
    await page.getByRole('button', { name: /تأكيد|حذف|confirm|delete/i }).last().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(1500);
    if (await page.locator('tr', { hasText: name }).count()) throw new Error(`Record "${name}" still present after delete`);
  };

  const prodName = `QA-Product-${stamp}`;
  await step('product add+delete', async () => {
    await openAdd('/dashboard/inventory/products', /إضافة|جديد|add|new/i);
    await fillAndSave(prodName);
    await deleteRow(prodName);
  });
  const custName = `QA-Customer-${stamp}`;
  await step('customer add+delete', async () => {
    await openAdd('/dashboard/customers', /إضافة|جديد|add|new/i);
    await fillAndSave(custName);
    await deleteRow(custName);
  });
  await step('invoice create page opens', async () => {
    const r = await nav('/dashboard/sales/create');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    if (r && r.status >= 400) throw new Error(`HTTP ${r.status()}`);
    if (page.url().includes('/login')) throw new Error('redirected to /login (session lost)');
    const t = (await page.locator('body').innerText()).trim();
    if (t.length < 5) throw new Error('blank page');
    if (/قيد التطوير/.test(t)) throw new Error('page is a placeholder');
  });

  // Probe: does a full reload keep the session?
  currentPage = '/dashboard (full reload)';
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(2000);
  if (page.url().includes('/login')) {
    add('auth.middleware', 'Full page load of /dashboard redirects to /login: middleware.ts uses deprecated cookies get/set/remove (needs getAll/setAll for @supabase/ssr 0.12), so it never sees the session');
  }


  return finish(browser, visited, smoke);
}

async function finish(browser, visited, smoke = []) {
  await browser.close();
  const clean = issues.map(({ key, ...r }) => r);
  fs.writeFileSync(
    'qa-report.json',
    JSON.stringify({ date: new Date().toISOString(), pagesVisited: visited, smoke, issueCount: clean.length, issues: clean }, null, 2)
  );
  const byPage = {};
  for (const i of clean) (byPage[i.page] ||= []).push(i);
  console.log('\n=== QA REPORT ===');
  for (const s of smoke) console.log(`${s.ok ? 'PASS' : 'FAIL'}  smoke: ${s.name}${s.ok ? '' : ' - ' + s.note}`);
  for (const [p, list] of Object.entries(byPage)) {
    console.log(`\n${p}  (${list.length})`);
    for (const i of list) console.log(`  [${i.type}] ${i.message}${i.response ? '\n      -> ' + i.response : ''}`);
  }
  console.log(`\nTotal issues: ${clean.length}  | report: qa-report.json`);
  process.exit(clean.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
