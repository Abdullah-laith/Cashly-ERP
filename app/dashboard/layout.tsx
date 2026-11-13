'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Sidebar from "@/components/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState({ use_inventory: true, use_invoicing: true });
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // جلب الإعدادات
      const { data: settingsData } = await supabase.from('organization_settings').select('*').single();
      if (settingsData) {
        setSettings({
          use_inventory: settingsData.use_inventory ?? true,
          use_invoicing: settingsData.use_invoicing ?? true,
        });
      }

      // جلب صلاحية المستخدم
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
        if (roleData) setUserRole(roleData.role);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-[#0F172A] text-white">
      {/* القائمة الجانبية */}
      <aside className="w-64 border-l border-slate-700/60 bg-[#0B1120] hidden md:flex flex-col">
        <div className="p-6 text-xl font-bold text-[#FF6B5B]">نظام ERP</div>
        <Sidebar settings={settings} />
      </aside>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-700/60 bg-[#0B1120] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-200">لوحة التحكم</span>
            {userRole && (
              <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-[#FF6B5B] uppercase tracking-wider font-bold">
                {userRole}
              </span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar className="cursor-pointer border border-slate-600">
                <AvatarImage src="/avatar.png" />
                <AvatarFallback className="bg-slate-700">أ</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-[#1E293B] border-slate-700" align="end">
              <DropdownMenuLabel className="text-slate-200">حساب المستخدم</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem className="text-slate-300">الملف الشخصي</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-400 cursor-pointer">
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
