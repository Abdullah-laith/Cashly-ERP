import { supabase } from '@/lib/supabase';

export async function getCustomers() {
  const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addCustomer(customerData: any) {
  const { data, error } = await supabase.from('customers').insert([customerData]).select();
  if (error) throw error;
  return data;
}

export async function getCustomerById(id: string) {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getCustomerTransactions(customerId: string) {
  const { data, error } = await supabase.from('vouchers')
    .select('*')
    .eq('account_id', customerId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}
