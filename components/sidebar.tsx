import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingCart, Users, Boxes, Receipt,
  Wallet, Percent, BookOpen, UserShield, Printer, BarChart3, Settings,
  LogOut, ChevronDown, X
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

const menuItems = [
  { name: 'لوحة التحكم', path: '/dashboard', icon: LayoutDashboard },
  {
    name: 'المبيعات', icon: Receipt, children: [
      { name: 'إنشاء فاتورة', path: '/dashboard/invoicing' },
      { name: 'سجل المبيعات', path: '/dashboard/sales' }
    ]
  },
  { name: 'العملاء', path: '/dashboard/customers', icon: Users },
  { name: 'المخزون والمنتجات', path: '/dashboard/inventory', icon: Boxes },
  {
    name: 'المشتريات', icon: ShoppingCart, children: [
      { name: 'سجل المشتريات', path: '/dashboard/purchases' },
      { name: 'الموردون', path: '/dashboard/purchases/suppliers' }
    ]
  },
  {
    name: 'المالية', icon: Wallet, children: [
      { name: 'المصروفات', path: '/dashboard/accounts' },
      { name: 'الديون والتحصيل', path: '/dashboard/debts' },
      { name: 'إغلاق الصندوق', path: '/dashboard/closing' },
      { name: 'سند جديد', path: '/dashboard/finance/vouchers/new' }
    ]
  },
  { name: 'إدارة التقسيط', icon: Percent, path: '/dashboard/installments' },
  { name: 'الحسابات العامة', icon: BookOpen, path: '/dashboard/accounting' },
  { name: 'المستخدمون', icon: UserShield, path: '/dashboard/users' },
  {
    name: 'التقارير', icon: BarChart3, children: [
      { name: 'المركز الرئيسي', path: '/dashboard/reports' },
      { name: 'الأرباح والخسائر', path: '/dashboard/reports/accounting/profit' },
      { name: 'أعمار الديون', path: '/dashboard/reports/customers/aging' },
      { name: 'جرد المخزون', path: '/dashboard/reports/inventory/valuation' }
    ]
  },
  {
    name: 'الإعدادات', icon: Settings, children: [
      { name: 'إعدادات النظام', path: '/dashboard/settings' },
      { name: 'العملات', path: '/dashboard/settings/currencies' }
    ]
  },
];

export default function Sidebar({ settings, onNavigate }: { settings?: any; onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleAccordion = (name: string) => {
    setOpenItems(prev => prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <nav className="sidebar-glass w-64 text-white flex flex-col h-screen overflow-y-auto p-4">
      <div className="brand-lockup mb-8 gap-2.5 px-4">
        <span className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 font-bold text-emerald-400">C</span>
        <span className="text-xl font-bold">Cashly <em>ERP</em></span>
        {onNavigate && <button type="button" aria-label="إغلاق القائمة" onClick={onNavigate} className="icon-button mobile-sidebar-close mr-auto"><X className="h-4 w-4" /></button>}
      </div>
      <div className="space-y-1">
        {menuItems.map((item) => (
          <div key={item.name}>
            {item.children ? (
              <div>
                <button
                  onClick={() => toggleAccordion(item.name)}
                  className={cn("sidebar-link flex w-full items-center justify-between px-4 py-3")}
                >
                  <div className="flex items-center gap-3">
                    <span className="nav-icon"><item.icon className="w-4 h-4 text-sky-200" /></span> {item.name}
                  </div>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", openItems.includes(item.name) ? "rotate-180" : "")} />
                </button>
                {openItems.includes(item.name) && (
                  <div className="pl-4 pr-8 py-1 space-y-1">
                    {item.children.map(child => (
                      <a key={child.path} href={child.path} onClick={onNavigate} className={cn("sidebar-sub-link block px-4 py-2 text-sm", pathname === child.path ? "is-active font-medium" : "")}>
                        {child.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <a href={item.path} onClick={onNavigate} className={cn("sidebar-link flex items-center gap-3 px-4 py-3", pathname === item.path ? "is-active font-medium" : "")}>
                <span className="nav-icon"><item.icon className="w-4 h-4" /></span> {item.name}
              </a>
            )}
          </div>
        ))}
      </div>
      <button onClick={handleLogout} className="sidebar-link mt-auto flex items-center gap-3 px-4 py-3 text-slate-400">
        <LogOut className="w-5 h-5" /> تسجيل الخروج
      </button>
    </nav>
  );
}
