'use client';
import { useState, useEffect } from 'react';
import { getCustomers, type Customer } from '@/lib/customers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Trash2, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setQ(new URLSearchParams(window.location.search).get('q') || '');

    let active = true;
    getCustomers()
      .then((data) => {
        if (active) setCustomers(data || []);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'تعذر تحميل العملاء');
      });
    return () => { active = false; };
  }, []);

  const removeCustomer = async (id: string) => {
    if (!window.confirm('هل تريد حذف هذا العميل؟')) return;
    const { error: deleteError } = await supabase.from('customers').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message || 'تعذر حذف العميل');
      return;
    }
    setCustomers((current) => current.filter((customer) => customer.id !== id));
  };

  const visibleCustomers = customers
    .filter((c) => !q || `${c.name} ${c.phone || ''} ${c.governorate || ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  return (
    <div dir="rtl" className="customers-page">
      <div className="customers-hero">
        <div><p className="customers-kicker">دليل العملاء</p><h1>إدارة العملاء</h1><p>تابع بيانات زبائنك ورتّبها حسب مكان وطريقة التواصل.</p></div>
        <Button onClick={() => router.push('/dashboard/customers/new')} className="customers-add-button"><Plus className="ml-2 w-4 h-4" /> إضافة عميل جديد</Button>
      </div>
      <div className="customers-summary"><div><UsersRound /><span><strong>{customers.length}</strong> عميل مسجل</span></div><div><MapPin /><span>بحث سريع بالاسم أو الهاتف أو المحافظة</span></div></div>
      <div className="customers-toolbar"><div className="customers-search-wrap"><span>⌕</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم العميل أو الهاتف أو المحافظة..." /></div><span className="customers-result-count">{visibleCustomers.length} نتيجة</span></div>
      {error && <p className="customers-error">{error}</p>}
      <div className="customers-table-shell"><Table>
        <TableHeader><TableRow><TableHead className="customer-col-name">الاسم</TableHead><TableHead className="customer-col-phone">رقم الهاتف</TableHead><TableHead className="customer-col-governorate">المحافظة</TableHead><TableHead className="customer-col-channel">نوع الزبون</TableHead><TableHead className="customer-col-balance">الرصيد</TableHead><TableHead className="customer-col-actions">الإجراءات</TableHead></TableRow></TableHeader>
        <TableBody>{visibleCustomers.map((c) => <TableRow key={c.id}><TableCell className="customer-name-cell"><button type="button" className="customer-name-link" onClick={() => router.push(`/dashboard/customers/${c.id}`)}>{c.name}</button></TableCell><TableCell>{c.phone || '—'}</TableCell><TableCell>{c.governorate || '—'}</TableCell><TableCell><span className={`customer-channel-badge ${c.customer_type === 'online' ? 'is-online' : 'is-store'}`}>{c.customer_type === 'online' ? 'أونلاين' : 'زيارة للمحل'}</span></TableCell><TableCell className={(c.balance ?? 0) < 0 ? 'text-red-500' : 'text-emerald-500'}>{(c.balance ?? 0).toLocaleString('ar-IQ')} د.ع</TableCell><TableCell><div className="customer-actions"><Button variant="ghost" size="sm" aria-label={`حذف ${c.name}`} onClick={() => removeCustomer(c.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></div></TableCell></TableRow>)}</TableBody>
      </Table></div>
    </div>
  );
}
