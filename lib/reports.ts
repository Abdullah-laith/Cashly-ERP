import { supabase } from '@/lib/supabase';

export async function getSalesSummary(startDate: string, endDate: string) {
  const { data, error } = await supabase.from('sales_invoices')
    .select('total_amount, created_at, status')
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
