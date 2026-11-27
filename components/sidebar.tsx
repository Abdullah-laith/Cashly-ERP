import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingCart, Users, Boxes, Receipt,
  Wallet, UserShield, BarChart3, Settings,
  LogOut, ChevronDown, X, Crown
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { useOrganization } from '@/components/organization-provider';
import { Icon3D } from '@/components/ui/Icon3D';

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
  const { organization, trialDaysRemaining } = useOrganization();
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleAccordion = (name: string) => {
    setOpenItems(prev => prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <nav className="sidebar-glass flex h-screen w-64 flex-col overflow-y-auto p-4">
      <div className="brand-lockup mb-5 gap-2.5 px-4">
        {organization.logo_url ? <img src={organization.logo_url} alt="شعار المشروع" className="h-9 w-9 rounded-xl object-cover" /> : <span className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 font-bold text-orange-700 shadow-sm">C</span>}
        <span className="min-w-0 text-xl font-bold text-slate-900"><span className="block truncate">{organization.business_name || 'Cashly'}</span><em className="block text-xs">ERP</em></span>
        {onNavigate && <button type="button" aria-label="إغلاق القائمة" onClick={onNavigate} className="icon-button mobile-sidebar-close mr-auto"><X className="h-4 w-4" /></button>}
      </div>
      <div className="sidebar-nav-list flex flex-col gap-1.5">
        {menuItems.map((item) => (
          <div key={item.name}>
            {item.children ? (
              <div>
                <button
                  onClick={() => toggleAccordion(item.name)}
                  className={cn("sidebar-link flex w-full items-center justify-between gap-3 px-3.5 py-3")}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Icon3D icon={item.icon} tone="orange" size="sm" /> <span className="truncate">{item.name}</span>
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
              <a href={item.path} onClick={onNavigate} className={cn("sidebar-link flex items-center gap-3 px-3.5 py-3", pathname === item.path ? "is-active font-medium" : "")}>
                <Icon3D icon={item.icon} tone="orange" size="sm" /> <span className="truncate">{item.name}</span>
              </a>
            )}
          </div>
        ))}
      </div>
      <div className="mt-auto space-y-3 pt-5">
        {trialDaysRemaining !== null && <a href="/dashboard/settings" className="block rounded-2xl bg-slate-900 p-3.5 text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5" aria-label={`الباقة التجريبية، متبقي ${trialDaysRemaining} أيام`}>
          <div className="flex items-start gap-2.5"><Crown className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">الباقة التجريبية</p><p className="mt-1 text-xs text-slate-300">متبقي {trialDaysRemaining} أيام</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700"><span className="block h-full rounded-full bg-orange-400 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, trialDaysRemaining / 10 * 100))}%` }} /></div></div></div>
        </a>}
        <button onClick={handleLogout} className="sidebar-link sidebar-logout flex w-full items-center gap-3 px-3.5 py-3 text-slate-500">
          <LogOut className="w-5 h-5" /> تسجيل الخروج
        </button>
      </div>
    </nav>
  );
}
