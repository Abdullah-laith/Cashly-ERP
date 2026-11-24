import { supabase } from '@/lib/supabase';

export async function getAgingReport() {
  // Aging Report Logic: Categorize debts by age intervals
  const { data, error } = await supabase.from('customers').select('name, balance, last_invoice_date');
  if (error) throw error;

  return data.map(customer => {
    const days = Math.floor((new Date().getTime() - new Date(customer.last_invoice_date).getTime()) / (1000 * 3600 * 24));
    return {
      ...customer,
      ageGroup: days <= 30 ? '1-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+'
    };
  });
}
