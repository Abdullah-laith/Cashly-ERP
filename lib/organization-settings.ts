import { supabase } from '@/lib/supabase';

export async function saveOrganizationSettings(userId: string, values: Record<string, unknown>) {
  const { data: existing, error: lookupError } = await supabase
    .from('organization_settings')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (lookupError) return { error: lookupError };

  if (existing) {
    return supabase
      .from('organization_settings')
      .update(values)
      .eq('user_id', userId)
      .select()
      .maybeSingle();
  }

  return supabase
    .from('organization_settings')
    .insert({ user_id: userId, ...values })
    .select()
    .single();
}
