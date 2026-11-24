import { supabase } from '@/lib/supabase';

export async function getUsers() {
  const { data, error } = await supabase.from('user_profiles').select('*, roles(name)');
  if (error) throw error;
  return data;
}

export async function getRoles() {
  const { data, error } = await supabase.from('roles').select('*');
  if (error) throw error;
  return data;
}
