import { supabase } from '@/lib/supabase';

export async function getSuppliers() {
  const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addSupplier(supplierData: any) {
  const { data, error } = await supabase.from('suppliers').insert([supplierData]).select();
  if (error) throw error;
  return data;
}

export async function createPurchaseInvoice(invoice: any, items: any[], expenses: any[]) {
  const { data, error } = await supabase.rpc('create_purchase_invoice', {
    invoice_data: invoice,
    items_data: items,
    expenses_data: expenses
  });
  if (error) throw error;
  return data;
}
