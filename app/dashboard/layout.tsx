'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/layout/Topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<string | null>(null);

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
    <div className="flex min-h-screen bg-[#0F172A] text-white">
      {/* القائمة الجانبية */}
      <aside className="hidden md:flex flex-col">
        <Sidebar />
      </aside>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
