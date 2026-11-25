'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/layout/Topbar";
import GlobalSoundProvider from "@/components/global-sound-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // جلب صلاحية المستخدم
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
        if (roleData) setUserRole(roleData.role);
      }
    };
    fetchData();
  }, []);

  return (
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
          <main className="dashboard-main">{children}</main>
        </div>
      </div>
    </GlobalSoundProvider>
  );
}
