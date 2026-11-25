'use client';

import { ChangeEvent, DragEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, Check, ImagePlus, MapPin, Store, Upload, Globe2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const inputClass = 'h-12 rounded-2xl border-white/10 bg-white/[0.06] text-white placeholder:text-slate-500 focus:border-[#55c2a5]';
const channels = [
  { value: 'online', label: 'متجر إلكتروني', hint: 'مبيعاتك عبر الإنترنت', icon: Globe2 },
  { value: 'physical', label: 'محل / معرض فعلي', hint: 'مبيعات من موقعك', icon: Store },
  { value: 'both', label: 'الاثنين معاً', hint: 'أونلاين + محل', icon: Building2 },
];
const categories = ['إلكترونيات', 'أزياء', 'مواد غذائية', 'صيدلية', 'قطع غيار', 'أخرى'];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ channel: '', businessName: '', category: '', businessPhone: '', address: '' });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (!data.user) window.location.href = '/login'; else setUserId(data.user.id); setLoading(false); }); }, []);

  function chooseLogo(file?: File) {
    if (!file || !file.type.startsWith('image/')) { setError('اختر ملف صورة صالحاً بصيغة PNG أو JPG'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('حجم الشعار يجب ألا يتجاوز 5 ميغابايت'); return; }
    setError(''); setLogo(file); setLogoPreview(URL.createObjectURL(file));
  }
  function handleDrop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragging(false); chooseLogo(event.dataTransfer.files[0]); }
  function nextStep() { if (!form.channel || !form.businessName.trim() || !form.category) { setError('أكمل طبيعة المشروع واسم المشروع ومجال النشاط'); return; } setError(''); setStep(2); }
  function handleFile(event: ChangeEvent<HTMLInputElement>) { chooseLogo(event.target.files?.[0]); }

  async function finish() {
    if (!userId) return;
    if (!form.businessPhone.trim() || !form.address.trim()) { setError('أدخل رقم هاتف العمل والمدينة أو العنوان'); return; }
    setSaving(true); setError('');
    let logoUrl = '';
    if (logo) {
      const extension = logo.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${userId}/logo-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('company-logos').upload(path, logo, { upsert: true, contentType: logo.type });
      if (uploadError) { setError('تعذر رفع الشعار. تأكد من إنشاء bucket باسم company-logos'); setSaving(false); return; }
      logoUrl = supabase.storage.from('company-logos').getPublicUrl(path).data.publicUrl;
    }
    const { error: saveError } = await supabase.from('organization_settings').upsert({ user_id: userId, business_name: form.businessName.trim(), org_name: form.businessName.trim(), sales_channel: form.channel, business_category: form.category, business_phone: form.businessPhone.trim(), business_address: form.address.trim(), address: form.address.trim(), ...(logoUrl ? { logo_url: logoUrl } : {}), onboarding_completed: true }, { onConflict: 'user_id' });
    if (saveError) { setError('تعذر حفظ بيانات المشروع: ' + saveError.message); setSaving(false); return; }
    window.location.href = '/dashboard';
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#101a27] text-slate-300" dir="rtl">جاري تجهيز مساحة الإعداد...</main>;

  return <main className="min-h-screen bg-[#101a27] px-4 py-8 text-white sm:px-8" dir="rtl">
    <div className="mx-auto max-w-4xl">
      <header className="mb-10 flex items-center justify-between"><div className="flex items-center gap-3 text-xl font-black"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#55c2a5] text-[#101a27]">C</span> Cashly</div><span className="text-sm text-slate-400">إعداد مشروعك</span></header>
      <div className="mb-10"><div className="mb-3 flex items-center justify-between text-sm"><span className={step === 1 ? 'font-bold text-[#55c2a5]' : 'text-slate-400'}>01 طبيعة مشروعك</span><span className={step === 2 ? 'font-bold text-[#55c2a5]' : 'text-slate-400'}>02 هوية المشروع</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-gradient-to-l from-[#55c2a5] to-[#f08a5d]" animate={{ width: step === 1 ? '50%' : '100%' }} /></div></div>
      <motion.section key={step} initial={{ opacity: 0, x: step === 1 ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-2xl sm:p-10">
        {step === 1 ? <><div className="mb-8"><p className="mb-2 text-sm font-bold text-[#55c2a5]">الخطوة الأولى</p><h1 className="text-3xl font-black sm:text-4xl">أخبرنا عن مشروعك</h1><p className="mt-3 text-slate-400">سنخصص Cashly بما يناسب طريقة عملك.</p></div><div className="mb-8 grid gap-4 md:grid-cols-3">{channels.map(({ value, label, hint, icon: Icon }) => <button key={value} type="button" onClick={() => setForm({ ...form, channel: value })} className={`rounded-2xl border p-5 text-right transition ${form.channel === value ? 'border-[#55c2a5] bg-[#55c2a5]/15 shadow-lg shadow-[#55c2a5]/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}><Icon className={form.channel === value ? 'mb-5 text-[#55c2a5]' : 'mb-5 text-slate-400'} /><strong className="block">{label}</strong><span className="mt-1 block text-xs text-slate-400">{hint}</span>{form.channel === value && <Check className="mt-4 text-[#55c2a5]" size={18} />}</button>)}</div><div className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label className="text-slate-300">اسم المشروع / البراند *</Label><Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className={inputClass} placeholder="مثلاً: متجر النخبة" /></div><div className="space-y-2"><Label className="text-slate-300">مجال النشاط *</Label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={`${inputClass} w-full px-4`}><option value="">اختر مجال النشاط</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div></div><div className="mt-10 flex justify-start"><Button type="button" onClick={nextStep} className="h-12 rounded-2xl bg-[#55c2a5] px-7 font-bold text-[#102027]">التالي <ArrowLeft className="mr-2" size={18} /></Button></div></> : <><div className="mb-8"><p className="mb-2 text-sm font-bold text-[#55c2a5]">الخطوة الثانية</p><h1 className="text-3xl font-black sm:text-4xl">أكمل هوية مشروعك</h1><p className="mt-3 text-slate-400">أضف التفاصيل التي ستظهر في فواتيرك ومساحتك.</p></div><div className="grid gap-8 md:grid-cols-[.8fr_1.2fr]"><div><Label className="mb-3 block text-slate-300">شعار المشروع</Label><label onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center transition ${dragging ? 'border-[#55c2a5] bg-[#55c2a5]/10' : 'border-white/15 bg-white/[0.03] hover:border-white/30'}`}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} className="hidden" />{logoPreview ? <img src={logoPreview} alt="معاينة شعار المشروع" className="mb-4 h-28 w-28 rounded-3xl object-cover ring-4 ring-[#55c2a5]/20" /> : <ImagePlus className="mb-4 text-[#55c2a5]" size={42} />}<strong>{logo ? logo.name : 'اسحب الشعار هنا أو اختر ملفاً'}</strong><span className="mt-2 text-xs text-slate-500">PNG أو JPG، حتى 5 ميغابايت</span><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#55c2a5]"><Upload size={16} /> اختيار الشعار</span></label></div><div className="space-y-5"><div className="space-y-2"><Label className="text-slate-300">رقم هاتف العمل *</Label><Input value={form.businessPhone} onChange={(e) => setForm({ ...form, businessPhone: e.target.value })} className={inputClass} placeholder="07xx xxx xxxx" /></div><div className="space-y-2"><Label className="text-slate-300">المدينة / العنوان *</Label><div className="relative"><MapPin className="absolute right-3 top-3 h-5 w-5 text-slate-500" /><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`${inputClass} pr-11`} placeholder="بغداد، الكرادة" /></div></div><div className="rounded-2xl border border-[#55c2a5]/20 bg-[#55c2a5]/10 p-4 text-sm leading-7 text-[#b9f4df]">كل شيء جاهز تقريباً. بعد الإطلاق ستبدأ فترة التجربة المجانية لمدة 10 أيام.</div></div></div><div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button type="button" variant="ghost" onClick={() => { setStep(1); setError(''); }} className="h-12 rounded-2xl text-slate-300"><ArrowRight className="ml-2" size={18} /> رجوع</Button><Button type="button" onClick={finish} disabled={saving} className="h-12 rounded-2xl bg-gradient-to-l from-[#55c2a5] to-[#2fa487] px-7 font-black text-[#102027]">{saving ? 'جاري الإطلاق...' : 'إطلاق نظامي وبدء الـ 10 أيام المجانية 🚀'}</Button></div></>}
        {error && <p className="mt-5 rounded-2xl bg-red-500/15 p-4 text-sm text-red-200">{error}</p>}
      </motion.section>
    </div>
  </main>;
}
