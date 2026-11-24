import { supabase } from '@/lib/supabase';

export async function createInstallmentPlan(plan: any, installments: any[]) {
  const { data, error } = await supabase.rpc('create_installment_plan', {
    plan_data: plan,
    installments_data: installments
  });
  if (error) throw error;
  return data;
}

export async function payInstallment(installmentId: string) {
  const { data, error } = await supabase.rpc('pay_installment', {
    installment_id: installmentId
  });
  if (error) throw error;
  return data;
}
