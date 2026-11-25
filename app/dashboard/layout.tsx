'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/layout/Topbar";
import GlobalSoundProvider from "@/components/global-sound-provider";
import { OrganizationProvider } from '@/components/organization-provider';
import TrialGuard from '@/components/trial-guard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // جلب صلاحية المستخدم
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [{ data: roleData }, { data: settingsData }] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
          supabase.from('organization_settings').select('onboarding_completed').eq('user_id', user.id).maybeSingle(),
        ]);
        if (roleData) setUserRole(roleData.role);
        if (settingsData && settingsData.onboarding_completed === false) {
          window.location.replace('/onboarding');
          return;
        }
      }
    };
    fetchData().finally(() => setCheckingOnboarding(false));
  }, []);

  if (checkingOnboarding) return <div className="grid min-h-screen place-items-center bg-[#101a27] text-slate-300" dir="rtl">جاري التحقق من إعداد مشروعك...</div>;

  return (
    <OrganizationProvider>
      <GlobalSoundProvider>
      <div className="dashboard-shell min-h-screen bg-[#070B14] text-slate-50">
        <aside className="sidebar-slot hidden md:flex">
          <Sidebar />
        </aside>
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="mobile-sidebar-backdrop md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <aside className={`mobile-sidebar ${mobileMenuOpen ? 'is-open' : ''}`} aria-hidden={!mobileMenuOpen}>
          <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
        </aside>
        <div className="workspace">
          <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="dashboard-main"><TrialGuard>{children}</TrialGuard></main>
        </div>
      </div>
      </GlobalSoundProvider>
    </OrganizationProvider>
  );
}
