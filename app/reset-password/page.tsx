'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const rules = [(v: string) => v.length >= 10, (v: string) => /[A-Z]/.test(v) && /[a-z]/.test(v), (v: string) => /\d/.test(v), (v: string) => /[^A-Za-z\d]/.test(v)];

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!rules.every((rule) => rule(password)) || password !== confirm) { setMessage('كلمة المرور لا تطابق المتطلبات أو التأكيد غير متطابق.'); return; } setSaving(true); const { error } = await supabase.auth.updateUser({ password }); setMessage(error ? 'تعذر تحديث كلمة المرور. أعد طلب رابط جديد.' : 'تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.'); setSaving(false); };
  return <main className="auth-page grid min-h-screen place-items-center bg-[#0b1726] p-4 text-white" dir="rtl"><form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl border border-[#314156] bg-[#1b2939] p-8"><h1 className="text-2xl font-black">تعيين كلمة مرور جديدة</h1><p className="text-sm text-slate-300">اختر كلمة مرور قوية لحماية حسابك.</p><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور الجديدة" className="border-[#40536b] bg-[#101d2d] text-white" /><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="تأكيد كلمة المرور" className="border-[#40536b] bg-[#101d2d] text-white" />{message && <p className="rounded-xl bg-white/10 p-3 text-sm text-[#b9f4df]">{message}</p>}<Button disabled={saving} className="h-12 w-full bg-[#55c2a5] font-bold text-[#0b1726]">{saving ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}</Button></form></main>;
}
