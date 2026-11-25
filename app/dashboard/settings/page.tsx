'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { Building2, Image as ImageIcon, Save, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { saveOrganizationSettings } from '@/lib/organization-settings';
import { useOrganization, OrganizationSettings } from '@/components/organization-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const channels = [{ value: 'online', label: 'متجر إلكتروني' }, { value: 'physical', label: 'محل / معرض فعلي' }, { value: 'both', label: 'الاثنين معاً' }];
const categories = ['إلكترونيات', 'أزياء', 'مواد غذائية', 'صيدلية', 'قطع غيار', 'أخرى'];
const inputClass = 'bg-[#0B1120] border-slate-700 text-white';

export default function SettingsPage() {
  const { organization, loading: organizationLoading, refreshOrganization } = useOrganization();
  const [settings, setSettings] = useState<OrganizationSettings>(organization);
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => setSettings(organization), [organization]);

  const update = (field: keyof OrganizationSettings, value: string) => setSettings((current) => ({ ...current, [field]: value }));
  const handleLogo = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { setMessage('اختر صورة صالحة بحجم لا يتجاوز 5 ميغابايت'); return; } setLogo(file); setPreview(URL.createObjectURL(file)); setMessage(''); };

  const handleSave = async () => {
    setSaving(true); setMessage('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage('انتهت جلسة الدخول'); setSaving(false); return; }
    let logoUrl = settings.logo_url;
    if (logo) {
      const extension = logo.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${user.id}/logo-${Date.now()}.${extension}`;
      const upload = await supabase.storage.from('company-logos').upload(path, logo, { upsert: true, contentType: logo.type });
      if (upload.error) { setMessage(`تعذر رفع الشعار: ${upload.error.message}`); setSaving(false); return; }
      logoUrl = supabase.storage.from('company-logos').getPublicUrl(path).data.publicUrl;
    }
    const payload = { user_id: user.id, business_name: settings.business_name.trim(), org_name: settings.business_name.trim(), logo_url: logoUrl, sales_channel: settings.sales_channel, business_category: settings.business_category, business_phone: settings.business_phone.trim(), business_address: settings.business_address.trim(), address: settings.business_address.trim(), default_currency: settings.default_currency };
    const { error } = await saveOrganizationSettings(user.id, payload);
    if (error) setMessage(`تعذر حفظ الإعدادات: ${error.message}`); else { setMessage('تم حفظ بيانات المشروع بنجاح'); setLogo(null); await refreshOrganization(); }
    setSaving(false);
  };

  if (organizationLoading) return <div className="p-8 text-white">جاري تحميل بيانات المشروع...</div>;
  return <div className="mx-auto max-w-4xl space-y-8 p-4 md:p-8" dir="rtl">
    <div className="border-b border-slate-700/60 pb-6"><h1 className="text-3xl font-extrabold text-white">إعدادات المشروع</h1><p className="mt-1 text-sm text-slate-400">حدّث هوية مشروعك وبياناتها التي تظهر في النظام والفواتير.</p></div>
    <Card className="rounded-xl border border-slate-700/60 bg-[#1E293B] text-white shadow-md"><CardHeader className="border-b border-slate-700/60"><CardTitle className="flex items-center gap-2 text-slate-200"><Building2 className="h-5 w-5 text-emerald-400" /> معلومات المشروع</CardTitle></CardHeader><CardContent className="space-y-6 p-6">
      <div className="grid gap-6 md:grid-cols-[180px_1fr]"><div><Label className="mb-2 block text-slate-400">شعار المشروع</Label><label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-600 bg-[#0B1120] p-3 text-center"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} className="hidden" />{preview || settings.logo_url ? <img src={preview || settings.logo_url} alt="شعار المشروع" className="h-24 w-24 rounded-xl object-cover" /> : <ImageIcon className="h-10 w-10 text-emerald-400" />}<span className="mt-2 flex items-center gap-1 text-xs text-slate-400"><Upload className="h-3 w-3" /> تغيير الشعار</span></label></div><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label className="text-slate-400">اسم المشروع / البراند</Label><Input value={settings.business_name} onChange={(e) => update('business_name', e.target.value)} className={inputClass} /></div><div className="space-y-2"><Label className="text-slate-400">نوع البيع</Label><select value={settings.sales_channel} onChange={(e) => update('sales_channel', e.target.value)} className={`${inputClass} w-full rounded-md px-3 py-2`}>{channels.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}</select></div><div className="space-y-2"><Label className="text-slate-400">مجال العمل</Label><select value={settings.business_category} onChange={(e) => update('business_category', e.target.value)} className={`${inputClass} w-full rounded-md px-3 py-2`}><option value="">اختر المجال</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div></div></div>
      <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label className="text-slate-400">هاتف المشروع</Label><Input value={settings.business_phone} onChange={(e) => update('business_phone', e.target.value)} className={inputClass} /></div><div className="space-y-2"><Label className="text-slate-400">العملة الافتراضية</Label><Input value={settings.default_currency} onChange={(e) => update('default_currency', e.target.value)} className={inputClass} /></div><div className="space-y-2 sm:col-span-2"><Label className="text-slate-400">عنوان المشروع</Label><Input value={settings.business_address} onChange={(e) => update('business_address', e.target.value)} className={inputClass} /></div></div>
      {message && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}<Button onClick={handleSave} disabled={saving} className="w-full bg-emerald-600 font-bold hover:bg-emerald-500 sm:w-auto"><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : 'حفظ بيانات المشروع'}</Button>
    </CardContent></Card>
  </div>;
}
