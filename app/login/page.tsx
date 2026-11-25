'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { saveOrganizationSettings } from '@/lib/organization-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const text = error.message.toLowerCase().includes('invalid login credentials')
        ? 'البريد أو كلمة المرور غير صحيحة.'
        : 'تعذر تسجيل الدخول. حاول مرة أخرى.';
      setMessage({ type: 'error', text });
      setLoading(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveOrganizationSettings(user.id, {
          default_currency: 'IQD',
          onboarding_completed: false,
          trial_starts_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_status: 'trial',
        });
      }
      setMessage({ type: 'success', text: 'تم تسجيل الدخول، جاري التحويل...' });
      window.location.href = '/dashboard';
    }
  };

  const loginError = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('error');

  return (
    <div className="auth-page flex min-h-screen overflow-hidden bg-[#0b1726] font-sans text-[#f8fafc]">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <motion.div animate={{ x: [0, 100, 0], y: [0, -50, 0] }} transition={{ repeat: Infinity, duration: 20 }} className="absolute top-10 left-10 w-72 h-72 bg-[#FF685B] rounded-full blur-[128px] opacity-20" />
        <motion.div animate={{ x: [0, -100, 0], y: [0, 50, 0] }} transition={{ repeat: Infinity, duration: 25 }} className="absolute bottom-10 right-10 w-96 h-96 bg-[#3B82F6] rounded-full blur-[128px] opacity-20" />
        <motion.div animate={{ x: [0, 50, 0], y: [0, 100, 0] }} transition={{ repeat: Infinity, duration: 30 }} className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#10B981] rounded-full blur-[128px] opacity-20" />
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 w-full max-w-7xl mx-auto items-center p-8 gap-12">
        <div className="hidden md:flex flex-col gap-8 justify-center">
          <h1 className="text-5xl font-extrabold leading-tight">Cashly كاشلي</h1>
          <p className="text-xl text-slate-400">أدر مبيعاتك، ديونك، ومخزنك بذكاء وفي مكان واحد.</p>
        </div>

        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="flex justify-center">
          <div className="w-full max-w-md rounded-3xl border border-[#314156] bg-[#1b2939]/95 p-8 text-[#f8fafc] shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="text-center mb-8">
              <ShieldCheck className="mx-auto mb-4 h-16 w-16 text-[#55c2a5]" />
              <h2 className="text-2xl font-bold">تسجيل الدخول</h2>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-300">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-[#8ea2b8]" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-[#40536b] bg-[#101d2d] pl-10 text-white placeholder:text-[#8ea2b8] focus:border-[#55c2a5] transition-colors" placeholder="user@cashly.com" required />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label className="text-slate-300">كلمة المرور</Label><button type="button" onClick={() => setShowRecovery(!showRecovery)} className="text-xs text-[#7ee2c3] hover:underline">نسيت كلمة المرور؟</button></div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-[#8ea2b8]" />
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="border-[#40536b] bg-[#101d2d] pl-10 pr-10 text-white focus:border-[#55c2a5] transition-colors" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-500 hover:text-white">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {(message || loginError) && <div className={`p-3 rounded-lg text-sm ${message?.type === 'error' || loginError ? 'bg-rose-500/20 text-rose-100' : 'bg-emerald-500/20 text-emerald-100'}`}>{message?.text || (loginError === 'invalid_link' ? 'الرابط غير صالح أو انتهت صلاحيته. اطلب رسالة جديدة.' : '')}</div>}
              {showRecovery && <div className="rounded-xl border border-[#40536b] bg-[#101d2d] p-3 text-sm text-slate-300"><p className="mb-2">سنرسل رابطاً آمناً لإعادة تعيين كلمة المرور إلى هذا البريد.</p><button type="button" onClick={sendRecovery} disabled={resending} className="flex items-center gap-2 text-[#7ee2c3] hover:underline"><KeyRound className="h-4 w-4" /> إرسال رابط الاستعادة</button></div>}
              <Button type="submit" className="h-12 w-full rounded-xl bg-[#55c2a5] text-lg font-bold text-[#0b1726] shadow-lg shadow-[#55c2a5]/20 transition-all hover:bg-[#70d7bb]" disabled={loading || resending}>
                {loading ? 'جاري التحميل...' : 'دخول النظام'}
              </Button>
            </form>
            <div className="my-6 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-700" /><span>أو</span><span className="h-px flex-1 bg-slate-700" /></div>
            <Link href="/signup" className="flex h-12 w-full items-center justify-center rounded-xl border border-[#55c2a5]/50 bg-[#55c2a5]/10 font-bold text-[#a7f3d0] transition hover:bg-[#55c2a5]/20">إنشاء حساب مجاني (10 أيام)</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
