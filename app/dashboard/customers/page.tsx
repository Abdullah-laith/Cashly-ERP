'use client';
import { useState, useEffect } from 'react';
import { getCustomers } from '@/lib/customers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    setQ(new URLSearchParams(window.location.search).get('q') || '');
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data || []);
    } catch (e) {
      console.warn('تعذر تحميل العملاء', e);
    }
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
            {customers.filter((c) => !q || c.name?.includes(q) || c.phone?.includes(q)).map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell className={c.balance < 0 ? 'text-red-500' : 'text-emerald-500'}>
                  {c.balance?.toLocaleString()} د.ع
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/customers/${c.id}`)}>
                    <Eye className="w-4 h-4" />
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
