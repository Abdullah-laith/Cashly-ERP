import { supabase } from '@/lib/supabase';

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  balance: number | null;
  created_at: string;
};

export type CustomerInput = Pick<Customer, 'name' | 'phone' | 'address'>;

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addCustomer(customerData: CustomerInput): Promise<Customer> {
  const { data, error } = await supabase.from('customers').insert([customerData]).select().single();
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
