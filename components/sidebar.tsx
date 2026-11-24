import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingCart, Users, Boxes, Receipt,
  Wallet, Percent, BookOpen, UserShield, Printer, BarChart3, Settings,
  LogOut, ChevronDown
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

const menuItems = [
  { name: 'لوحة التحكم', path: '/dashboard', icon: LayoutDashboard },
  {
    name: 'المبيعات', icon: Receipt, children: [
      { name: 'إدارة الفواتير', path: '/sales/invoices' },
      { name: 'إنشاء فاتورة', path: '/sales/create' },
      { name: 'عروض الأسعار', path: '/sales/quotations' },
      { name: 'الفواتير المرتجعة', path: '/sales/returns' },
      { name: 'مدفوعات العملاء', path: '/sales/payments' }
    ]
  },
  { name: 'العملاء', path: '/customers', icon: Users },
  {
    name: 'المخزون', icon: Boxes, children: [
      { name: 'المنتجات', path: '/inventory/products' },
      { name: 'المستودعات', path: '/inventory/warehouses' },
      { name: 'الأذون المخزنية', path: '/inventory/orders' }
    ]
  },
  {
    name: 'المشتريات', icon: ShoppingCart, children: [
      { name: 'فواتير الشراء', path: '/purchases/invoices' },
      { name: 'الموردون', path: '/suppliers' }
    ]
  },
  { name: 'المالية', icon: Wallet, path: '/finance' },
  { name: 'إدارة التقسيط', icon: Percent, path: '/installments' },
  { name: 'الحسابات العامة', icon: BookOpen, path: '/accounts' },
  { name: 'المستخدمون', icon: UserShield, path: '/users' },
  { name: 'قوالب الطباعة', icon: Printer, path: '/templates' },
  { name: 'التقارير', icon: BarChart3, path: '/reports' },
  { name: 'الإعدادات', icon: Settings, path: '/settings' },
];

export default function Sidebar({ settings }: { settings?: any } = {}) {
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
    <nav className="w-64 bg-[#070B14] text-white flex flex-col h-screen overflow-y-auto p-4 border-l border-slate-800">
      <div className="text-xl font-bold mb-8 px-4 text-[#FF685B]">Cashly ERP</div>
      <div className="space-y-1">
        {menuItems.map((item) => (
          <div key={item.name}>
            {item.children ? (
              <div>
                <button
                  onClick={() => toggleAccordion(item.name)}
                  className={cn("flex w-full items-center justify-between px-4 py-3 rounded-lg hover:bg-slate-800")}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-slate-400" /> {item.name}
                  </div>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", openItems.includes(item.name) ? "rotate-180" : "")} />
                </button>
                {openItems.includes(item.name) && (
                  <div className="pl-4 pr-8 py-1 space-y-1">
                    {item.children.map(child => (
                      <a key={child.path} href={child.path} className="block px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-md">
                        {child.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <a href={item.path} className={cn("flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800", pathname === item.path ? "bg-[#FF6B5B]/10 text-[#FF6B5B]" : "text-slate-400")}>
                <item.icon className="w-5 h-5" /> {item.name}
              </a>
            )}
          </div>
        ))}
      </div>
      <button onClick={handleLogout} className="mt-auto flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/10">
        <LogOut className="w-5 h-5" /> تسجيل الخروج
      </button>
    </nav>
  );
}
