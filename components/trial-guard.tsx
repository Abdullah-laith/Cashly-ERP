'use client';

import { useOrganization } from '@/components/organization-provider';

export default function TrialGuard({ children }: { children: React.ReactNode }) {
  const { trialExpired } = useOrganization();
  if (!trialExpired) return <>{children}</>;
  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center p-6" dir="rtl">
      <section className="w-full max-w-lg rounded-3xl border border-amber-400/20 bg-amber-400/10 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/15 text-3xl">⏳</div>
        <h1 className="text-2xl font-black text-slate-900">انتهت الفترة التجريبية</h1>
        <p className="mt-3 leading-8 text-slate-600">انتهت أيام التجربة المجانية لمشروعك. تواصل مع الدعم لتجديد الاشتراك واستعادة الوصول إلى النظام.</p>
        <a href="mailto:support@cashly.app" className="mt-6 inline-flex rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950">التواصل مع الدعم</a>
      </section>
    </div>
  );
}
