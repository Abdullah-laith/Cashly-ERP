import { supabase } from '@/lib/supabase';

export const logTransaction = async (type: string, refId: string, amount: number, desc: string) => {
  const { error } = await supabase.from('ledger').insert([{
    transaction_type: type,
    reference_id: refId,
    amount,
    description: desc
  }]);

  if (error) {
    console.error('Ledger Error:', error);
  } else {
    console.log('Transaction logged:', type);
  }
};
