'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { saveOrganizationSettings } from '@/lib/organization-settings';
import { AuthShowcase } from '@/components/auth/AuthShowcase';
import { soundEngine } from '@/lib/sound-engine';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [resending, setResending] = useState(false);

  const sendRecovery = async () => {
    if (!email.trim()) { setMessage({ type: 'error', text: 'اكتب بريدك الإلكتروني أولاً.' }); return; }
    setResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
    setMessage(error ? { type: 'error', text: 'تعذر إرسال رابط إعادة التعيين.' } : { type: 'success', text: 'إذا كان البريد مسجلاً، سيصلك رابط إعادة تعيين كلمة المرور.' });
    setResending(false);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    soundEngine.playTap();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      soundEngine.playError();
      const text = error.message.toLowerCase().includes('invalid login credentials') ? 'البريد أو كلمة المرور غير صحيحة.' : 'تعذر تسجيل الدخول. حاول مرة أخرى.';
      setMessage({ type: 'error', text });
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: settings } = await supabase.from('organization_settings').select('user_id').eq('user_id', user.id).maybeSingle();
      if (!settings) await saveOrganizationSettings(user.id, { default_currency: 'IQD', onboarding_completed: false, trial_starts_at: new Date().toISOString(), trial_ends_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), subscription_status: 'trial' });
    }
    soundEngine.playSuccess();
    setMessage({ type: 'success', text: 'تم تسجيل الدخول، جاري التحويل...' });
    window.location.href = '/dashboard';
  };

  const loginError = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('error');
  return (
    <main className="auth-page min-h-screen" dir="rtl">
      <div className="mx-auto grid min-h-screen max-w-[1440px] gap-6 p-0 lg:grid-cols-2 lg:p-6">
        <AuthShowcase />
        <section className="relative flex items-center justify-center px-4 py-8 sm:px-8"><div className="pointer-events-none absolute inset-0 opacity-5"><ShieldCheck className="absolute right-8 top-12 h-24 w-24 text-orange-500" /><KeyRound className="absolute bottom-16 left-10 h-32 w-32 text-orange-500" /></div>
          <div className="auth-card relative w-full max-w-lg rounded-3xl p-6 sm:p-10">
            <div className="mb-8 flex items-center justify-between gap-3"><Link href="/login" className="rounded-xl bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">تسجيل الدخول</Link><Link href="/signup" className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-orange-50 hover:text-orange-700">إنشاء حساب جديد</Link></div>
            <div className="mb-8"><div className="mb-5 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-xl font-black text-white shadow-lg shadow-orange-500/25">C</span><div><p className="text-lg font-black text-slate-900">Cashly</p><p className="text-xs text-slate-500">مساحتك التجارية الذكية</p></div></div><h1 className="text-3xl font-black text-slate-900">مرحباً بعودتك</h1><p className="mt-2 text-sm text-slate-500">سجّل دخولك واستكمل إدارة تجارتك.</p></div>
            <form onSubmit={handleLogin} className="space-y-5">
              <Field label="البريد الإلكتروني" icon={<Mail />} type="email" value={email} onChange={setEmail} placeholder="name@example.com" />
              <div className="space-y-2"><div className="flex items-center justify-between"><label className="text-sm font-bold text-slate-700">كلمة المرور</label><button type="button" onClick={() => { soundEngine.playTap(); setShowRecovery(!showRecovery); }} className="text-xs font-bold text-orange-600 hover:underline">نسيت كلمة المرور؟</button></div><div className="relative"><Lock className="absolute right-3 top-3 h-5 w-5 text-slate-400" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="auth-field h-12 w-full rounded-2xl border px-11 text-sm outline-none" required /><button type="button" onClick={() => { soundEngine.playTap(); setShowPassword(!showPassword); }} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} className="absolute left-3 top-3 text-slate-400 hover:text-orange-600">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></div>
              {(message || loginError) && <div className={`rounded-2xl border p-3 text-sm ${message?.type === 'error' || loginError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message?.text || (loginError === 'invalid_link' ? 'الرابط غير صالح أو انتهت صلاحيته. اطلب رسالة جديدة.' : '')}</div>}
              {showRecovery && <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3 text-sm text-slate-600"><p className="mb-2">سنرسل رابطاً آمناً لإعادة تعيين كلمة المرور إلى هذا البريد.</p><button type="button" onClick={sendRecovery} disabled={resending} className="flex items-center gap-2 font-bold text-orange-700 hover:underline"><KeyRound className="h-4 w-4" /> إرسال رابط الاستعادة</button></div>}
              <button type="submit" disabled={loading || resending} className="auth-shimmer h-13 flex w-full items-center justify-center rounded-2xl bg-gradient-to-l from-orange-500 to-amber-500 text-base font-black text-white shadow-lg shadow-orange-500/25 transition-all hover:from-orange-600 hover:to-amber-600 active:scale-[.98]">{loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'دخول النظام'}</button>
            </form>
            <p className="mt-7 text-center text-sm text-slate-500">ليس لديك حساب؟ <Link href="/signup" className="font-black text-orange-600 hover:underline">أنشئ حساباً مجاناً</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, icon, type, value, onChange, placeholder }: { label: string; icon: React.ReactNode; type: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <div className="space-y-2"><label className="text-sm font-bold text-slate-700">{label}</label><div className="relative"><span className="absolute right-3 top-3 text-slate-400">{icon}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="auth-field h-12 w-full rounded-2xl border px-11 text-sm outline-none" required /></div></div>; }
