import { supabase } from '@/lib/supabase';

export async function getProfitReport(startDate: string, endDate: string) {
  // Profit = Total Sales (Invoices) - Cost of Goods Sold (Avg Cost * Qty)
  const { data, error } = await supabase.rpc('get_profit_report', {
    start_date: startDate,
    end_date: endDate
  });
  if (error) throw error;
  return data;
}

export async function getInventorySummary() {
  const { data, error } = await supabase.from('product_warehouse_stock')
    .select('products(name), quantity, avg_cost');
  if (error) throw error;
  return data;
}
