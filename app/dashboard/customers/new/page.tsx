'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addCustomer } from '@/lib/customers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { soundEngine } from '@/lib/sound-engine';

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', phone: '', address: '', governorate: '', customer_type: 'in_store' as 'online' | 'in_store' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const createdCustomer = await addCustomer(form);
      if (!createdCustomer?.id) throw new Error('تعذر تأكيد حفظ العميل');
      soundEngine.playSave();
      router.push('/dashboard/customers');
      router.refresh();
    } catch (err: unknown) {
      soundEngine.playError();
      setError(err instanceof Error ? err.message : 'تعذر حفظ العميل');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="customer-form-page">
      <form onSubmit={save} className="customer-form-card">
        <div className="customer-form-heading"><div><p>دليل العملاء</p><h1>إضافة عميل جديد</h1><span>أضف بيانات العميل لتظهر لك بسرعة عند إصدار الفواتير.</span></div></div>
        <div className="customer-form-grid">
          <label><span>اسم العميل</span><Input placeholder="مثال: أحمد محمد" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label><span>رقم الهاتف</span><Input placeholder="07xxxxxxxxx" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label><span>المحافظة</span><Input placeholder="مثال: بغداد" value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })} /></label>
          <label><span>نوع الزبون</span><select value={form.customer_type} onChange={(e) => setForm({ ...form, customer_type: e.target.value as 'online' | 'in_store' })}><option value="in_store">زيارة للمحل (In-Store)</option><option value="online">أونلاين (Online)</option></select></label>
          <label className="customer-form-wide"><span>العنوان التفصيلي</span><Input placeholder="المنطقة، الشارع، أقرب نقطة دالة" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
        </div>
        {error && <p className="customer-form-error">{error}</p>}
        <div className="customer-form-actions"><Button type="button" variant="outline" onClick={() => router.back()}>إلغاء</Button><Button type="submit" disabled={saving} className="bg-[#FF685B] text-white">{saving ? 'جارٍ الحفظ...' : 'حفظ العميل'}</Button></div>
      </form>
    </div>
  );
}
