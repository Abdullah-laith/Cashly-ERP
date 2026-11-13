'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage({ type: 'error', text: 'خطأ: ' + error.message });
      setLoading(false);
    } else {
      setMessage({ type: 'success', text: 'تم! جاري التحويل...' });
      // استخدام reload لضمان تحديث الـ Cookies والـ Middleware
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] p-4 text-white">
      <Card className="w-full max-w-md shadow-2xl border border-slate-700/60 bg-[#1E293B]">
        <CardHeader className="space-y-2 text-center border-b border-slate-700/60 pb-6">
          <CardTitle className="text-3xl font-extrabold tracking-tight text-white">سند ERP</CardTitle>
          <CardDescription className="text-slate-400">أدخل بياناتك للدخول</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-300">البريد الإلكتروني</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#0B1120] border-slate-700 text-white" required />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">كلمة المرور</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#0B1120] border-slate-700 text-white" required />
            </div>
            {message && <div className="p-3 rounded-lg text-sm bg-slate-800 text-white">{message.text}</div>}
            <Button type="submit" className="w-full bg-[#FF6B5B] hover:bg-[#FF6B5B]/90 font-bold h-11" disabled={loading}>
              {loading ? 'جاري...' : 'تسجيل الدخول'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
