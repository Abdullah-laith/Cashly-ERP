import { supabase } from '@/lib/supabase';

export type ReportPeriod = 'today' | 'week' | 'month' | 'year' | 'all';
export type CustomReportPeriod = { startDate: string; endDate: string };
export type ReportPeriodSelection = ReportPeriod | CustomReportPeriod;

export type ReportsData = {
  sales: number;
  purchases: number;
  expenses: number;
  profit: number;
  receivables: number;
  invoiceCount: number;
  topProducts: Array<{ name: string; quantity: number; sales: number }>;
};

const numberValue = (value: unknown) => Number(value || 0);

function periodRange(period: ReportPeriodSelection) {
  if (typeof period === 'object') {
    const start = new Date(`${period.startDate}T00:00:00`);
    const end = new Date(`${period.endDate}T23:59:59.999`);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (period === 'all') return null;
  const now = new Date();
  const start = new Date(now);
  if (period === 'today') start.setHours(0, 0, 0, 0);
  if (period === 'week') {
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
  }
  if (period === 'month') {
    start.setHours(0, 0, 0, 0);
    start.setDate(1);
  }
  if (period === 'year') {
    start.setHours(0, 0, 0, 0);
    start.setMonth(0, 1);
  }
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getReportsData(period: ReportPeriodSelection): Promise<ReportsData> {
  const range = periodRange(period);
  const invoiceQuery = supabase.from('invoices')
    .select('id, customer_name, total_amount, remaining_debt, created_at')
    .is('deleted_at', null);
  const purchaseQuery = supabase.from('purchases').select('total_cost, created_at');
  const expenseQuery = supabase.from('expenses').select('amount, created_at');

  if (range) {
    invoiceQuery.gte('created_at', range.start).lte('created_at', range.end);
    purchaseQuery.gte('created_at', range.start).lte('created_at', range.end);
    expenseQuery.gte('created_at', range.start).lte('created_at', range.end);
  }

  const [{ data: invoices, error: invoiceError }, { data: purchases, error: purchaseError }, { data: expenses, error: expenseError }] = await Promise.all([
    invoiceQuery,
    purchaseQuery,
    expenseQuery,
  ]);
  if (invoiceError) throw invoiceError;
  if (purchaseError) throw purchaseError;
  if (expenseError) throw expenseError;

  const invoiceIds = (invoices || []).map(invoice => invoice.id);
  let items: Array<{ product_id: string | null; quantity: number | null; price: number | null }> = [];
  if (invoiceIds.length) {
    const { data, error } = await supabase.from('invoice_items').select('product_id, quantity, price').in('invoice_id', invoiceIds);
    if (error) throw error;
    items = data || [];
  }

  const productIds = [...new Set(items.map(item => item.product_id).filter((id): id is string => Boolean(id)))];
  const productCosts = new Map<string, { name: string; cost: number }>();
  if (productIds.length) {
    const { data, error } = await supabase.from('products').select('id, name, cost_price').in('id', productIds);
    if (error) throw error;
    for (const product of data || []) productCosts.set(product.id, { name: product.name, cost: numberValue(product.cost_price) });
  }

  const sales = (invoices || []).reduce((sum, invoice) => sum + numberValue(invoice.total_amount), 0);
  const purchasesTotal = (purchases || []).reduce((sum, purchase) => sum + numberValue(purchase.total_cost), 0);
  const expensesTotal = (expenses || []).reduce((sum, expense) => sum + numberValue(expense.amount), 0);
  const costOfGoods = items.reduce((sum, item) => sum + numberValue(item.quantity) * numberValue(productCosts.get(item.product_id || '')?.cost), 0);
  const productTotals = new Map<string, { name: string; quantity: number; sales: number }>();
  for (const item of items) {
    const product = productCosts.get(item.product_id || '');
    if (!product) continue;
    const current = productTotals.get(item.product_id!) || { name: product.name, quantity: 0, sales: 0 };
    current.quantity += numberValue(item.quantity);
    current.sales += numberValue(item.quantity) * numberValue(item.price);
    productTotals.set(item.product_id!, current);
  }

  return {
    sales,
    purchases: purchasesTotal,
    expenses: expensesTotal,
    profit: sales - costOfGoods - expensesTotal,
    receivables: (invoices || []).reduce((sum, invoice) => sum + numberValue(invoice.remaining_debt), 0),
    invoiceCount: invoices?.length || 0,
    topProducts: [...productTotals.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
  };
}

export async function getSalesSummary(startDate: string, endDate: string) {
  const { data, error } = await supabase.from('invoices')
    .select('total_amount, created_at, payment_type')
    .is('deleted_at', null)
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  if (error) throw error;
  return data;
}

export async function getAccountingSummary() {
  const { data, error } = await supabase.from('journal_entries').select('total_amount, type');
  if (error) throw error;
  return data;
}
