'use client';

import { BarChart3, Box, FileText, ShieldCheck, WalletCards, TrendingUp } from 'lucide-react';
import { Icon3D } from '@/components/ui/Icon3D';

const floatingIcons = [
  { icon: FileText, tone: 'amber' as const, className: 'right-[12%] top-[18%] animate-float-slow' },
  { icon: TrendingUp, tone: 'emerald' as const, className: 'left-[15%] top-[22%] animate-float-reverse' },
  { icon: Box, tone: 'blue' as const, className: 'right-[20%] bottom-[20%] animate-orbit-slow' },
  { icon: WalletCards, tone: 'violet' as const, className: 'left-[12%] bottom-[18%] animate-gentle-tilt' },
  { icon: ShieldCheck, tone: 'rose' as const, className: 'right-[45%] top-[12%] animate-float-reverse' },
  { icon: BarChart3, tone: 'orange' as const, className: 'left-[42%] bottom-[10%] animate-float-slow' },
];

export function AuthShowcase() {
  return (
    <>
    <section className="auth-showcase relative hidden min-h-[34rem] overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-8 text-white shadow-2xl shadow-orange-900/20 lg:flex lg:flex-col">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="auth-blob auth-blob-one" />
      <div className="auth-blob auth-blob-two" />
      {floatingIcons.map(({ icon, tone, className }, index) => (
        <div key={index} className={`absolute z-10 ${className}`}><Icon3D icon={icon} tone={tone} size="lg" /></div>
      ))}
      <div className="relative z-20 flex items-center justify-between">
        <div className="flex items-center gap-3 text-2xl font-black"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 text-xl shadow-inner">C</span> Cashly</div>
        <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur">منصة إدارة الأعمال</span>
      </div>
      <div className="relative z-20 my-auto max-w-lg self-center text-center">
        <p className="mb-4 text-sm font-bold tracking-[.18em] text-orange-100">إدارة أذكى. نمو أسرع.</p>
        <h1 className="text-4xl font-black leading-[1.25] xl:text-5xl">أدِر تجارتك بذكاء وسرعة فائقة</h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-8 text-orange-50/90">كل ما تحتاجه لمبيعاتك ومخزونك وفواتيرك في مساحة واحدة مصممة لتكبر معك.</p>
        <div className="mt-7 inline-flex rounded-full border border-white/25 bg-white/15 px-5 py-3 text-sm font-bold shadow-lg backdrop-blur-md">تجربة مجانية كاملة لمدة 10 أيام <span className="mx-2 text-orange-200">•</span> بدون بطاقة ائتمان</div>
      </div>
      <div className="relative z-20 mx-auto flex w-full max-w-md flex-col gap-3">
        <div className="glass-preview-card flex items-center justify-between rounded-2xl p-4"><div><p className="text-xs text-orange-100/80">مبيعات اليوم</p><strong className="mt-1 block text-xl">+2,450,000 د.ع</strong></div><span className="rounded-xl bg-emerald-400/20 px-3 py-2 text-sm font-black text-emerald-100">↗ 18%</span></div>
        <div className="glass-preview-card flex items-center gap-3 rounded-2xl p-3 text-sm"><span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-400/20 text-emerald-100">✓</span><span>تم إصدار الفاتورة بنجاح</span></div>
      </div>
    </section>
    <section className="auth-showcase-mobile relative hidden overflow-hidden bg-gradient-to-l from-orange-500 via-orange-600 to-amber-600 px-6 py-5 text-white lg:hidden">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative z-10 flex w-full items-center justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-lg font-black"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white/20">C</span> Cashly</div><h1 className="text-xl font-black">أدِر تجارتك بذكاء وسرعة فائقة</h1><p className="mt-1 text-xs text-orange-50">تجربة مجانية 10 أيام • بدون بطاقة ائتمان</p></div><Icon3D icon={BarChart3} tone="emerald" size="lg" /></div>
    </section>
    </>
  );
}
