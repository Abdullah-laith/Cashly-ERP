import { supabase } from '@/lib/supabase';

export async function getCurrencies() {
  const { data, error } = await supabase.from('currencies').select('*');
  if (error) throw error;
  return data;
}

export async function updateExchangeRate(currencyId: string, newRate: number) {
  const { error } = await supabase.from('exchange_rate_history').insert([{
    currency_id: currencyId,
    rate: newRate
  }]);
  if (error) throw error;
}
