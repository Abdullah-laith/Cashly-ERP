import { supabase } from '@/lib/supabase';

export async function getTreasuries() {
  const { data, error } = await supabase.from('treasuries').select('*');
  if (error) throw error;
  return data;
}

export async function addVoucher(data: any) {
  const { data: result, error } = await supabase.from('vouchers').insert([data]).select();
  if (error) throw error;
  return result;
}

export async function getVouchers(type: 'expense' | 'receipt') {
  const { data, error } = await supabase.from('vouchers')
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
