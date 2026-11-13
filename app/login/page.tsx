'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, TrendingUp, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage({ type: 'error', text: 'خطأ: ' + error.message });
      setLoading(false);
    } else {
      setMessage({ type: 'success', text: 'تم! جاري التحويل...' });
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#070B14] text-white overflow-hidden font-sans">
      {/* Background Animated Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <motion.div animate={{ x: [0, 100, 0], y: [0, -50, 0] }} transition={{ repeat: Infinity, duration: 20 }} className="absolute top-10 left-10 w-72 h-72 bg-[#FF685B] rounded-full blur-[128px] opacity-20" />
        <motion.div animate={{ x: [0, -100, 0], y: [0, 50, 0] }} transition={{ repeat: Infinity, duration: 25 }} className="absolute bottom-10 right-10 w-96 h-96 bg-[#3B82F6] rounded-full blur-[128px] opacity-20" />
        <motion.div animate={{ x: [0, 50, 0], y: [0, 100, 0] }} transition={{ repeat: Infinity, duration: 30 }} className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#10B981] rounded-full blur-[128px] opacity-20" />
      </div>

      {/* Main Layout */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 w-full max-w-7xl mx-auto items-center p-8 gap-12">

        {/* Left: Showcase */}
        <div className="hidden md:flex flex-col gap-8 justify-center">
          <h1 className="text-5xl font-extrabold leading-tight">Cashly كاشلي</h1>
          <p className="text-xl text-slate-400">أدر مبيعاتك، ديونك، ومخزنك بذكاء وفي مكان واحد.</p>

          <div className="relative flex flex-col gap-6">
            <motion.div initial={{ y: 0 }} animate={{ y: [-10, 10, -10] }} transition={{ repeat: Infinity, duration: 4 }} className="bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 w-80">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">أرباح الشهر</span>
                <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded">+28%</span>
              </div>
              <div className="text-2xl font-bold">14,850,000 د.ع</div>
            </motion.div>

            <motion.div initial={{ y: 0 }} animate={{ y: [10, -10, 10] }} transition={{ repeat: Infinity, duration: 5 }} className="bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 w-80 self-end mr-12">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                <div>
                  <div className="font-semibold text-sm">تم تسديد دفعة دين</div>
                  <div className="text-emerald-400 text-xs">450,000 د.ع - محمد علي</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right: Login */}
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="flex justify-center">
          <div className="w-full max-w-md bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 shadow-2xl rounded-3xl p-8">
            <div className="text-center mb-8">
              <ShieldCheck className="w-16 h-16 text-[#FF685B] mx-auto mb-4" />
              <h2 className="text-2xl font-bold">تسجيل الدخول</h2>
              <p className="text-slate-400">مرحباً بك مجدداً في نظام كاشلي</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-300">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-[#0B1120] border-slate-700 focus:border-[#FF685B] transition-colors" placeholder="user@cashly.com" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 bg-[#0B1120] border-slate-700 focus:border-[#3B82F6] transition-colors" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-500 hover:text-white">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {message && <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{message.text}</div>}

              <Button type="submit" className="w-full bg-gradient-to-r from-[#FF685B] to-[#FF8E53] hover:opacity-90 transition-all text-white font-bold h-12 rounded-xl text-lg shadow-lg shadow-[#FF685B]/20" disabled={loading}>
                {loading ? 'جاري التحميل...' : 'دخول النظام'}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
