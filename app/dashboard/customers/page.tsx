'use client';
import { useState, useEffect } from 'react';
import { getCustomers, type Customer } from '@/lib/customers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Trash2 } from 'lucide-react';
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إدارة العملاء</h1>
        <Button onClick={() => router.push('/dashboard/customers/new')} className="bg-[#FF685B] text-white">
          <Plus className="ml-2 w-4 h-4" /> إضافة عميل جديد
        </Button>
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>رقم الهاتف</TableHead>
              <TableHead>الرصيد</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers
              .filter((c) => !q || c.name?.includes(q) || c.phone?.includes(q))
              .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
              .map((c) => (
                <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell className={(c.balance ?? 0) < 0 ? 'text-red-500' : 'text-emerald-500'}>
                  {c.balance?.toLocaleString()} د.ع
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/customers/${c.id}`)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="حذف" onClick={() => removeCustomer(c.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
