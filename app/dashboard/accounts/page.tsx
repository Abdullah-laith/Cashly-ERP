'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Plus, Trash2 } from 'lucide-react';
import { logTransaction } from '@/lib/ledger';
import { useToast } from '@/components/ui/toast-provider';

export default function AccountsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'debts' | 'expenses'>('debts');
  const [debts, setDebts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newExpense, setNewExpense] = useState({ title: '', amount: 0, date: '' });

  useEffect(() => {
    setNewExpense(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: d } = await supabase.from('invoices').select('*').gt('remaining_debt', 0);
    if (d) setDebts(d);
    const { data: e } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (e) setExpenses(e);
  };

  const addExpense = async () => {
    if (!newExpense.title || !newExpense.amount) return showToast('يرجى ملء البيانات');

    const { data, error } = await supabase.from('expenses').insert([{
      title: newExpense.title,
      amount: newExpense.amount,
      created_at: newExpense.date
    }]).select().single();

    if (error) return showToast('خطأ في التسجيل');

    await logTransaction('EXPENSE', data.id, newExpense.amount, `مصروف: ${newExpense.title}`);
    setNewExpense({ title: '', amount: 0, date: new Date().toISOString().split('T')[0] });
    showToast('تم تسجيل المصروف بنجاح');
    fetchData();
  };

  const settleDebt = async (id: string, current: number) => {
    const amount = prompt('أدخل المبلغ المسدد:');
    if (!amount || isNaN(Number(amount))) return;
    const val = Number(amount);
    await supabase.from('invoices').update({ remaining_debt: current - val }).eq('id', id);
    await logTransaction('DEBT_SETTLEMENT', id, val, `تسديد دين - فاتورة ${id.substring(0,8)}`);
    showToast('تم تسديد الدين بنجاح');
    fetchData();
  };

  return (
    <div className="p-8 space-y-6 bg-[#0F172A] min-h-screen text-slate-100">
      <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
        <button className={`px-6 py-2 rounded-lg transition-all ${activeTab === 'debts' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`} onClick={() => setActiveTab('debts')}>سجل الديون</button>
        <button className={`px-6 py-2 rounded-lg transition-all ${activeTab === 'expenses' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`} onClick={() => setActiveTab('expenses')}>المصاريف التشغيلية</button>
      </div>

      {activeTab === 'debts' ? (
        <div className="space-y-6">
          <Card className="bg-[#1E293B] border-slate-700 w-fit"><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">إجمالي الديون لنا</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-[#FF6B5B]">{debts.reduce((s,d) => s + d.remaining_debt, 0).toLocaleString()} د.ع</p></CardContent></Card>
          <Input className="bg-[#1E293B] border-slate-700 max-w-sm" placeholder="بحث بالاسم أو الهاتف..." onChange={e => setSearchTerm(e.target.value)} />
          <Table className="bg-[#1E293B] border border-slate-700 rounded-xl">
            <TableHeader><TableRow className="border-slate-700 hover:bg-transparent"><TableHead>الزبون</TableHead><TableHead>المتبقي</TableHead><TableHead className="text-center">إجراءات</TableHead></TableRow></TableHeader>
            <TableBody>
              {debts.filter(d => d.customer_name.includes(searchTerm)).map(d => (
                <TableRow key={d.id} className="border-slate-700 hover:bg-slate-800">
                  <TableCell>{d.customer_name}<br/><span className="text-xs text-slate-400">{d.customer_phone}</span></TableCell>
                  <TableCell className="font-bold text-[#FF6B5B]">{d.remaining_debt.toLocaleString()} د.ع</TableCell>
                  <TableCell className="flex justify-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => settleDebt(d.id, d.remaining_debt)}>تسديد</Button>
                    <Button size="sm" variant="outline" className="text-green-500" onClick={() => window.open(`https://wa.me/${d.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`أهلاً ${d.customer_name}، المتبقي بذمتك ${d.remaining_debt.toLocaleString()} د.ع.`)}`)}><MessageCircle className="w-4 h-4"/></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="bg-[#1E293B] border-slate-700 w-fit"><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">إجمالي المصاريف</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-[#EF4444]">{expenses.reduce((s,e) => s + Number(e.amount), 0).toLocaleString()} د.ع</p></CardContent></Card>
          <Card className="bg-[#1E293B] border-slate-700 p-6 space-y-4">
            <div className="flex gap-2">
              <Input placeholder="عنوان المصروف" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} />
              <Input type="number" placeholder="المبلغ (د.ع)" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} />
              <Input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-40" />
              <Button onClick={addExpense} className="bg-blue-600"><Plus className="w-4 h-4 mr-2"/> تسجيل</Button>
            </div>
          </Card>
          <Table className="bg-[#1E293B] border border-slate-700 rounded-xl">
            <TableHeader><TableRow className="border-slate-700"><TableHead>العنوان</TableHead><TableHead>التاريخ</TableHead><TableHead>المبلغ</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
            <TableBody>
              {expenses.map(e => (
                <TableRow key={e.id} className="border-slate-700">
                  <TableCell>{e.title}</TableCell>
                  <TableCell>{new Date(e.created_at).toLocaleDateString('ar-IQ')}</TableCell>
                  <TableCell className="font-bold">{Number(e.amount).toLocaleString()} د.ع</TableCell>
                  <TableCell><Button variant="ghost" className="text-red-500" onClick={() => supabase.from('expenses').delete().eq('id', e.id).then(() => {fetchData(); showToast('تم الحذف');})}><Trash2 className="w-4 h-4"/></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
