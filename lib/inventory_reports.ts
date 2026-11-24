import { supabase } from '@/lib/supabase';

export async function getInventoryValuation() {
  const { data, error } = await supabase.from('product_warehouse_stock')
    .select('products(name, code), quantity, avg_cost');
  if (error) throw error;

  // Supabase returns an array for joins.
  // We need to handle the case where 'products' is an object or array.
  return data.map((item: any) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    return {
      name: product?.name,
      code: product?.code,
      qty: item.quantity,
      totalValue: item.quantity * item.avg_cost
    };
  });
}
