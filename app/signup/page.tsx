'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Eye, EyeOff, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const inputClass = 'h-12 rounded-2xl border-[#40536b] bg-[#101d2d] text-white placeholder:text-[#8ea2b8] focus:border-[#55c2a5]';
const passwordRules = [
  { label: '10 أحرف على الأقل', test: (value: string) => value.length >= 10 },
  { label: 'حرف كبير وصغير', test: (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value) },
  { label: 'رقم واحد على الأقل', test: (value: string) => /\d/.test(value) },
  { label: 'رمز خاص مثل ! أو @', test: (value: string) => /[^A-Za-z\d]/.test(value) },
];

export default function SignupPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', currency: 'IQD', password: '', confirmPassword: '', terms: false });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const errors = useMemo(() => ({
    firstName: form.firstName.trim() ? '' : 'اكتب الاسم الأول',
    lastName: form.lastName.trim() ? '' : 'اكتب اسم العائلة',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'أدخل بريداً إلكترونياً صحيحاً',
    phone: /^\+?[0-9\s-]{8,}$/.test(form.phone) ? '' : 'أدخل رقم هاتف صحيحاً',
    password: passwordRules.every((rule) => rule.test(form.password)) ? '' : 'استخدم كلمة مرور قوية حسب المتطلبات الظاهرة',
    confirmPassword: form.confirmPassword === form.password && form.confirmPassword ? '' : 'كلمتا المرور غير متطابقتين',
    terms: form.terms ? '' : 'يجب الموافقة على الشروط والأحكام',
  }), [form]);

  const setField = (field: string, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));
  const markTouched = (field: string) => setTouched((current) => ({ ...current, [field]: true }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched({ firstName: true, lastName: true, email: true, phone: true, password: true, confirmPassword: true, terms: true });
    if (Object.values(errors).some(Boolean)) return;
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { first_name: form.firstName.trim(), last_name: form.lastName.trim(), full_name: `${form.firstName.trim()} ${form.lastName.trim()}`, phone: form.phone.trim() } },
    });

    if (error || !data.user) {
      setMessage({ type: 'error', text: error?.message || 'تعذر إنشاء الحساب، حاول مرة أخرى' });
      setLoading(false);
      return;
    }

    // Supabase owns the unique email constraint. The identities check also
    // protects against the placeholder user returned for an existing email.
    if (!data.user.identities?.length) {
      setMessage({ type: 'error', text: 'هذا البريد مستخدم مسبقاً. سجّل الدخول أو استخدم نسيت كلمة المرور.' });
      setLoading(false);
      return;
    }

    const trialStartsAt = new Date().toISOString();
    const { error: settingsError } = await supabase.from('organization_settings').upsert({
      user_id: data.user.id,
      default_currency: form.currency,
      onboarding_completed: false,
      trial_starts_at: trialStartsAt,
      trial_ends_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      subscription_status: 'trial',
    }, { onConflict: 'user_id' });

    if (settingsError) {
      setMessage({ type: 'error', text: `تم إنشاء الحساب، لكن تعذر تجهيز المشروع: ${settingsError.message}` });
      setLoading(false);
      return;
    }

    if (!data.session) {
      setMessage({ type: 'error', text: 'تم إنشاء الحساب لكن لم تبدأ جلسة الدخول. عطّل تأكيد البريد من إعدادات Supabase ثم حاول مرة أخرى.' });
      setLoading(false);
      return;
    }

    setMessage({ type: 'success', text: 'تم إنشاء حسابك. نجهّز مساحة مشروعك الآن...' });
    window.location.href = '/onboarding';
  }

  const fieldError = (field: keyof typeof errors) => touched[field] ? errors[field] : '';

  return (
    <main className="auth-page relative min-h-screen overflow-hidden bg-[#0b1726] px-4 py-8 text-[#f8fafc] sm:px-8" dir="rtl">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#55c2a5]/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-[#f08a5d]/15 blur-[130px]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <motion.section initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:block">
          <div className="mb-8 inline-flex items-center gap-3 text-2xl font-black"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#55c2a5] text-[#101a27]">C</span> Cashly</div>
          <p className="mb-4 text-sm font-bold tracking-[.2em] text-[#55c2a5]">مساحتك التجارية تبدأ من هنا</p>
          <h1 className="max-w-lg text-5xl font-black leading-[1.2]">ابدأ بإدارة أذكى، <span className="text-[#f08a5d]">من أول يوم.</span></h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-slate-300">أنشئ حسابك مجاناً واستمتع بكل أدوات Cashly لمدة 10 أيام، بدون تعقيد أو التزام.</p>
          <div className="mt-10 space-y-4 text-slate-300"><div className="flex items-center gap-3"><Check className="text-[#55c2a5]" /> إعداد سريع لمشروعك</div><div className="flex items-center gap-3"><Check className="text-[#55c2a5]" /> بياناتك محمية ومشفرة</div><div className="flex items-center gap-3"><Check className="text-[#55c2a5]" /> تجربة كاملة لمدة 10 أيام</div></div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-xl rounded-[2rem] border border-[#314156] bg-[#1b2939]/95 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-9">
          <div className="mb-8 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#55c2a5]/20 text-[#55c2a5]"><ShieldCheck /></div><h2 className="text-3xl font-black">أنشئ حسابك</h2><p className="mt-2 text-sm text-slate-400">10 أيام مجانية كاملة — ابدأ بدون بطاقة</p></div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="الاسم الأول" value={form.firstName} onChange={(v) => setField('firstName', v)} onBlur={() => markTouched('firstName')} error={fieldError('firstName')} placeholder="مثلاً: أحمد" icon={<UserRound />} /><Field label="اسم العائلة" value={form.lastName} onChange={(v) => setField('lastName', v)} onBlur={() => markTouched('lastName')} error={fieldError('lastName')} placeholder="مثلاً: علي" icon={<UserRound />} /></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="البريد الإلكتروني" type="email" value={form.email} onChange={(v) => setField('email', v)} onBlur={() => markTouched('email')} error={fieldError('email')} placeholder="name@example.com" icon={<Mail />} /><Field label="رقم الهاتف" type="tel" value={form.phone} onChange={(v) => setField('phone', v)} onBlur={() => markTouched('phone')} error={fieldError('phone')} placeholder="07xx xxx xxxx" icon={<Phone />} /></div>
            <div className="space-y-2"><Label className="text-slate-300">العملة الافتراضية</Label><select value={form.currency} onChange={(e) => setField('currency', e.target.value)} className={`${inputClass} w-full px-4`}><option value="IQD">IQD - د.ع</option><option value="USD">USD - دولار أمريكي</option><option value="EUR">EUR - يورو</option></select></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><PasswordField label="كلمة المرور" value={form.password} show={showPassword} onToggle={() => setShowPassword(!showPassword)} onChange={(v) => setField('password', v)} onBlur={() => markTouched('password')} error={fieldError('password')} /><div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">{passwordRules.map((rule) => <span key={rule.label} className={rule.test(form.password) ? 'text-[#7ee2c3]' : ''}>{rule.test(form.password) ? '✓' : '○'} {rule.label}</span>)}</div></div><PasswordField label="تأكيد كلمة المرور" value={form.confirmPassword} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} onChange={(v) => setField('confirmPassword', v)} onBlur={() => markTouched('confirmPassword')} error={fieldError('confirmPassword')} /></div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-300"><input type="checkbox" checked={form.terms} onChange={(e) => setField('terms', e.target.checked)} onBlur={() => markTouched('terms')} className="mt-1 h-4 w-4 accent-[#55c2a5]" /><span>أوافق على <a href="#terms" className="text-[#55c2a5] underline">الشروط والأحكام</a> و<a href="#privacy" className="text-[#55c2a5] underline">سياسة الخصوصية</a>{fieldError('terms') && <small className="block text-red-300">{fieldError('terms')}</small>}</span></label>
            {message && <div className={`rounded-2xl border p-4 text-sm ${message.type === 'error' ? 'border-rose-400/30 bg-rose-500/15 text-rose-100' : 'border-[#55c2a5]/30 bg-[#55c2a5]/15 text-[#b9f4df]'}`}>{message.text}</div>}
            <Button type="submit" disabled={loading} className="h-13 w-full rounded-2xl bg-[#55c2a5] text-base font-black text-[#0b1726] hover:bg-[#70d7bb]">{loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب مجاني (10 أيام)'}</Button>
          </form>
          <p className="mt-7 text-center text-sm text-slate-400">لديك حساب بالفعل؟ <Link href="/login" className="font-bold text-[#f08a5d] hover:underline">تسجيل الدخول</Link></p>
        </motion.section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, onBlur, error, placeholder, type = 'text', icon }: { label: string; value: string; onChange: (value: string) => void; onBlur: () => void; error: string; placeholder: string; type?: string; icon: React.ReactNode }) { return <div className="space-y-2"><Label className="text-slate-300">{label}</Label><div className="relative"><span className="absolute right-3 top-3 text-slate-500 [&_svg]:h-5 [&_svg]:w-5">{icon}</span><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} className={`${inputClass} pr-11`} aria-invalid={!!error} /></div>{error && <p className="text-xs text-red-300">{error}</p>}</div> }
function PasswordField({ label, value, show, onToggle, onChange, onBlur, error }: { label: string; value: string; show: boolean; onToggle: () => void; onChange: (value: string) => void; onBlur: () => void; error: string }) { return <div className="space-y-2"><Label className="text-slate-300">{label}</Label><div className="relative"><LockKeyhole className="absolute right-3 top-3 h-5 w-5 text-slate-500" /><Input autoComplete={label.includes('تأكيد') ? 'new-password' : 'new-password'} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className={`${inputClass} px-11`} /><button type="button" onClick={onToggle} aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} className="absolute left-3 top-3 text-slate-500 hover:text-white">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>{error && <p className="text-xs text-red-300">{error}</p>}</div> }
