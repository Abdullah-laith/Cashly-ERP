'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addCustomer } from '@/lib/customers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const createdCustomer = await addCustomer(form);
      if (!createdCustomer?.id) throw new Error('تعذر تأكيد حفظ العميل');
      router.push('/dashboard/customers');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ العميل');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="p-6 space-y-4 max-w-md">
      <h1 className="text-2xl font-bold">إضافة عميل جديد</h1>
      <Input placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Input placeholder="رقم الهاتف" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <Input placeholder="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" disabled={saving} className="bg-[#FF685B] text-white">حفظ</Button>
    </form>
  );
}
