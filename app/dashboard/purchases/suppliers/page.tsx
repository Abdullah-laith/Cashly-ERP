'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getSuppliers, addSupplier } from '@/lib/suppliers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  address?: string | null;
  balance: number | null;
};

const emptyForm = { name: '', phone: '', address: '' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers((data || []) as Supplier[]);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر تحميل الموردين' });
    }
  };

  useEffect(() => { void loadSuppliers(); }, []);

  const saveSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'اكتب اسم المورد أولاً' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const created = await addSupplier({ name: form.name.trim(), phone: form.phone.trim() || null, address: form.address.trim() || null });
      if (!created?.[0]?.id) throw new Error('تعذر تأكيد حفظ المورد');
      setSuppliers((current) => [created[0] as Supplier, ...current]);
      setForm(emptyForm);
      setShowForm(false);
      setMessage({ type: 'success', text: 'تمت إضافة المورد بنجاح' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر حفظ المورد' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">إدارة الموردين</h1>
        <Button type="button" onClick={() => { setShowForm(true); setMessage(null); }} className="bg-[#FF685B] text-white">
          <Plus className="ml-2 h-4 w-4" /> إضافة مورد
        </Button>
      </div>

      {message && <p role="status" className={message.type === 'error' ? 'text-sm text-red-500' : 'text-sm text-emerald-500'}>{message.text}</p>}

      {showForm && (
        <form onSubmit={saveSupplier} className="rounded-xl border border-slate-200/80 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">إضافة مورد جديد</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="إغلاق" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Input placeholder="اسم المورد" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <Input placeholder="رقم الهاتف" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <Input placeholder="العنوان" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </div>
          <Button type="submit" disabled={saving} className="bg-[#FF685B] text-white">{saving ? 'جارٍ الحفظ...' : 'حفظ المورد'}</Button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="px-4 py-3 text-right whitespace-nowrap">الاسم</TableHead>
            <TableHead className="px-4 py-3 text-right whitespace-nowrap">رقم الهاتف</TableHead>
            <TableHead className="px-4 py-3 text-right whitespace-nowrap">الرصيد</TableHead>
          </TableRow></TableHeader>
          <TableBody>{suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell className="px-4 py-3 text-right whitespace-nowrap">{supplier.name}</TableCell>
              <TableCell className="px-4 py-3 text-right whitespace-nowrap">{supplier.phone || '—'}</TableCell>
              <TableCell className={`px-4 py-3 text-right whitespace-nowrap ${(supplier.balance ?? 0) < 0 ? 'text-red-500' : 'text-emerald-500'}`}>{(supplier.balance ?? 0).toLocaleString()} د.ع</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
    </div>
  );
}
