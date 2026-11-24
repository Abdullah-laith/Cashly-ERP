import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = new URL('..', import.meta.url);
const envPath = new URL('.env.local', ROOT);
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
  if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'TEST_EMAIL', 'TEST_PASSWORD'];
for (const key of required) {
  if (!env[key]) throw new Error(`${key} is missing from .env.local`);
}
if (process.argv[2] !== '--confirm' && env.RESET_CONFIRM !== 'YES') {
  throw new Error('This deletes demo data. Re-run with --confirm or set RESET_CONFIRM=YES.');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const missingTable = new Set();

async function call(label, operation) {
  const result = await operation();
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function tableExists(table) {
  if (missingTable.has(table)) return false;
  const { error } = await supabase.from(table).select('*').limit(0);
  if (error) {
    if (/relation|table|schema cache|could not find/i.test(error.message)) {
      missingTable.add(table);
      console.warn(`Skipping missing table: ${table}`);
      return false;
    }
    throw new Error(`Cannot inspect ${table}: ${error.message}`);
  }
  return true;
}

async function deleteAll(table, column = 'id') {
  if (!(await tableExists(table))) return;
  const { error } = await supabase.from(table).delete().not(column, 'is', null);
  if (error) throw new Error(`Clear ${table}: ${error.message}`);
  console.log(`Cleared ${table}`);
}

function unknownColumn(message) {
  return message.match(/column ['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?/i)?.[1]
    || message.match(/'([a-zA-Z_][a-zA-Z0-9_]*)' column/i)?.[1];
}

async function insert(table, rows) {
  if (!(await tableExists(table))) return [];
  let pending = rows.map((row) => ({ ...row }));
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await supabase.from(table).insert(pending).select();
    if (!error) return data || [];
    const column = unknownColumn(error.message);
    if (!column || !pending.some((row) => Object.hasOwn(row, column))) {
      throw new Error(`Seed ${table}: ${error.message}`);
    }
    pending = pending.map((row) => {
      const copy = { ...row };
      delete copy[column];
      return copy;
    });
    console.warn(`Column ${table}.${column} is not present; retrying without it`);
  }
  throw new Error(`Seed ${table}: too many schema retries`);
}

async function main() {
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: env.TEST_EMAIL,
    password: env.TEST_PASSWORD,
  });
  if (authError) throw new Error(`Supabase login failed: ${authError.message}`);

  const clearOrder = [
    ['journal_entry_lines'], ['journal_entries'], ['ledger'], ['installment_items'], ['installments'],
    ['vouchers'], ['expenses'], ['invoice_items'], ['invoices'], ['sales_invoices'], ['purchases'],
    ['product_warehouse_stock', 'product_id'], ['products'], ['customers'], ['suppliers'], ['warehouses'],
    ['treasuries'], ['exchange_rate_history'], ['brands'], ['categories'], ['unit_templates'],
  ];
  for (const [table, column] of clearOrder) await deleteAll(table, column);

  const warehouses = await insert('warehouses', [
    { id: id(101), name: 'مخزن الكرادة', location: 'بغداد - الكرادة' },
    { id: id(102), name: 'مخزن المنصور', location: 'بغداد - المنصور' },
  ]);
  const treasuries = await insert('treasuries', [
    { id: id(201), name: 'خزينة الدينار العراقي', currency: 'IQD', balance: 12500000 },
    { id: id(202), name: 'خزينة الدولار الأمريكي', currency: 'USD', balance: 4200 },
  ]);
  const suppliers = await insert('suppliers', [
    { id: id(301), name: 'شركة الرافدين للتجهيز', phone: '07701234567', address: 'بغداد - شارع الصناعة', balance: 0 },
    { id: id(302), name: 'مؤسسة النخبة التجارية', phone: '07802345678', address: 'البصرة - العشار', balance: 0 },
    { id: id(303), name: 'شركة دجلة للإلكترونيات', phone: '07903456789', address: 'أربيل - عينكاوة', balance: 0 },
    { id: id(304), name: 'مكتب نور بغداد', phone: '07504567890', address: 'بغداد - زيونة', balance: 0 },
  ]);
  const customers = await insert('customers', [
    { id: id(401), name: 'أحمد محمد علي', phone: '07711223344', address: 'بغداد - الجادرية', balance: 0 },
    { id: id(402), name: 'سارة عبدالحسين', phone: '07822334455', address: 'بغداد - الكاظمية', balance: 0 },
    { id: id(403), name: 'شركة المستقبل', phone: '07933445566', address: 'بغداد - المنصور', balance: 0 },
    { id: id(404), name: 'علي كريم', phone: '07544556677', address: 'النجف - المركز', balance: 0 },
    { id: id(405), name: 'مؤسسة زهرة الرافدين', phone: '07755667788', address: 'كربلاء - العباسية', balance: 0 },
  ]);
  const products = await insert('products', [
    { id: id(501), code: 'ELEC-001', sku: 'ELEC-001', name: 'هاتف سامسونج Galaxy A55', category: 'هواتف', buy_price: 430000, cost_price: 430000, sell_price: 515000, quantity: 18, min_quantity: 5 },
    { id: id(502), code: 'ELEC-002', sku: 'ELEC-002', name: 'هاتف آيفون 15', category: 'هواتف', buy_price: 1020000, cost_price: 1020000, sell_price: 1190000, quantity: 9, min_quantity: 3 },
    { id: id(503), code: 'ELEC-003', sku: 'ELEC-003', name: 'لابتوب Lenovo IdeaPad', category: 'حاسبات', buy_price: 720000, cost_price: 720000, sell_price: 850000, quantity: 7, min_quantity: 2 },
    { id: id(504), code: 'ELEC-004', sku: 'ELEC-004', name: 'لابتوب MacBook Air M3', category: 'حاسبات', buy_price: 1580000, cost_price: 1580000, sell_price: 1850000, quantity: 4, min_quantity: 2 },
    { id: id(505), code: 'ACC-001', sku: 'ACC-001', name: 'سماعة Sony WH-1000XM5', category: 'إكسسوارات', buy_price: 310000, cost_price: 310000, sell_price: 395000, quantity: 14, min_quantity: 4 },
    { id: id(506), code: 'ACC-002', sku: 'ACC-002', name: 'شاحن سريع 65 واط', category: 'إكسسوارات', buy_price: 18000, cost_price: 18000, sell_price: 35000, quantity: 55, min_quantity: 10 },
    { id: id(507), code: 'ACC-003', sku: 'ACC-003', name: 'كابل USB-C أصلي', category: 'إكسسوارات', buy_price: 7000, cost_price: 7000, sell_price: 15000, quantity: 80, min_quantity: 15 },
    { id: id(508), code: 'HOME-001', sku: 'HOME-001', name: 'شاشة LG 55 بوصة', category: 'شاشات', buy_price: 680000, cost_price: 680000, sell_price: 795000, quantity: 6, min_quantity: 2 },
    { id: id(509), code: 'HOME-002', sku: 'HOME-002', name: 'طابعة HP LaserJet', category: 'مكاتب', buy_price: 245000, cost_price: 245000, sell_price: 295000, quantity: 8, min_quantity: 2 },
    { id: id(510), code: 'HOME-003', sku: 'HOME-003', name: 'راوتر TP-Link Archer', category: 'شبكات', buy_price: 65000, cost_price: 65000, sell_price: 90000, quantity: 22, min_quantity: 5 },
  ]);
  await insert('product_warehouse_stock', products.flatMap((product, index) => [
    { product_id: product.id || id(501 + index), warehouse_id: id(101), quantity: Math.ceil((Number(product.quantity) || 0) * 0.6), avg_cost: product.cost_price || product.buy_price || 0 },
    { product_id: product.id || id(501 + index), warehouse_id: id(102), quantity: Math.floor((Number(product.quantity) || 0) * 0.4), avg_cost: product.cost_price || product.buy_price || 0 },
  ]));

  const invoiceRows = [
    [601, 401, 1545000, 'cash', 0], [602, 402, 515000, 'cash', 0], [603, 403, 1190000, 'credit', 1190000],
    [604, 404, 395000, 'partial', 195000], [605, 405, 850000, 'cash', 0], [606, 401, 795000, 'credit', 795000],
  ];
  for (let i = 0; i < invoiceRows.length; i += 1) {
    const [number, customerId, total, paymentType, debt] = invoiceRows[i];
    const created = new Date(Date.now() - (i + 1) * 86400000).toISOString();
    const [invoice] = await insert('invoices', [{ id: id(number), invoice_number: `INV-${number}`, customer_id: id(customerId), customer_name: customers.find((c) => c.id === id(customerId))?.name, total_amount: total, payment_type: paymentType, remaining_debt: debt, customer_phone: customers.find((c) => c.id === id(customerId))?.phone, created_at: created }]);
    await insert('invoice_items', [{ invoice_id: invoice?.id || id(number), product_id: id(501 + (i % 5)), quantity: i % 2 ? 1 : 2, price: total / (i % 2 ? 1 : 2) }]);
  }
  await insert('purchases', [
    { id: id(701), supplier_name: 'شركة الرافدين للتجهيز', total_cost: 5200000, created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: id(702), supplier_name: 'مؤسسة النخبة التجارية', total_cost: 3400000, created_at: new Date(Date.now() - 4 * 86400000).toISOString() },
    { id: id(703), supplier_name: 'شركة دجلة للإلكترونيات', total_cost: 2750000, created_at: new Date(Date.now() - 86400000).toISOString() },
  ]);
  await insert('expenses', [
    { id: id(801), title: 'إيجار المحل', amount: 1200000, description: 'إيجار شهري', created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
    { id: id(802), title: 'كهرباء واتصالات', amount: 185000, description: 'خدمات شهرية', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  ]);
  await insert('vouchers', [
    { id: id(901), type: 'receipt', amount: 195000, treasury_id: id(201), account_id: id(404), description: 'تحصيل دفعة من علي كريم' },
    { id: id(902), type: 'expense', amount: 1200000, treasury_id: id(201), description: 'سند صرف إيجار المحل' },
    { id: id(903), type: 'receipt', amount: 4200, treasury_id: id(202), description: 'إيداع نقدي بالدولار' },
  ]);
  const [plan] = await insert('installments', [{ id: id(1001), customer_id: id(403), total_amount: 1190000, installments_count: 4, status: 'active', created_at: new Date().toISOString() }]);
  await insert('installment_items', [1, 2, 3, 4].map((n) => ({ installment_id: plan?.id || id(1001), due_date: new Date(Date.now() + n * 30 * 86400000).toISOString().slice(0, 10), amount: 297500, paid: n === 1 })));
  const [entry] = await insert('journal_entries', [{ id: id(1101), description: 'قيد افتتاحي للمبيعات والمخزون', type: 'general', total_amount: 3500000 }]);
  await insert('journal_entry_lines', [
    { journal_entry_id: entry?.id || id(1101), account_id: id(1201), debit: 3500000, credit: 0 },
    { journal_entry_id: entry?.id || id(1101), account_id: id(1202), debit: 0, credit: 3500000 },
  ]);
  await insert('ledger', [
    { id: id(1201), transaction_type: 'SALE', reference_id: id(601), amount: 1545000, description: 'فاتورة بيع INV-601' },
    { id: id(1202), transaction_type: 'PURCHASE', reference_id: id(701), amount: 5200000, description: 'فاتورة شراء شركة الرافدين' },
  ]);
  console.log('Seed complete: 2 warehouses, 2 treasuries, 10 products, 5 customers, 4 suppliers, 6 sales, 3 purchases, vouchers, installments, and journal entries.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
