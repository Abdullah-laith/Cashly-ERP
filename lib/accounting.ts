import { supabase } from '@/lib/supabase';

export async function getGeneralLedger() {
  const { data, error } = await supabase.from('journal_entries')
    .select('*, journal_entry_lines(*, chart_of_accounts(name))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addJournalEntry(entryData: any, lines: any[]) {
  // Use RPC for transaction safety
  const { data, error } = await supabase.rpc('add_journal_entry', {
    entry: entryData,
    lines: lines
  });
  if (error) throw error;
  return data;
}
