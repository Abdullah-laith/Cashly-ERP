import { cn } from "@/lib/utils";
import { LayoutDashboard, Wallet, Boxes, Receipt, Settings, PieChart, History, Calculator } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Sidebar({ settings }: { settings: { use_inventory: boolean; use_invoicing: boolean } }) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="flex-1 px-4 space-y-2 mt-4">
      <a href="/dashboard" className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all", isActive('/dashboard') ? "bg-[#FF6B5B]/10 text-[#FF6B5B] font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800")}>
        <LayoutDashboard className="w-5 h-5" /> الرئيسية
      </a>
      <a href="/dashboard/accounts" className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all", isActive('/dashboard/accounts') ? "bg-[#FF6B5B]/10 text-[#FF6B5B] font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800")}>
        <Wallet className="w-5 h-5" /> الحسابات
      </a>

      {settings.use_inventory && (
        <a href="/dashboard/inventory" className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all", isActive('/dashboard/inventory') ? "bg-[#FF6B5B]/10 text-[#FF6B5B] font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800")}>
          <Boxes className="w-5 h-5" /> المخازن
        </a>
      )}

      <a href="/dashboard/purchases" className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all", isActive('/dashboard/purchases') ? "bg-[#FF6B5B]/10 text-[#FF6B5B] font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800")}>
        <Receipt className="w-5 h-5" /> المشتريات
      </a>

      {settings.use_invoicing && (
        <a href="/dashboard/invoicing" className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all", isActive('/dashboard/invoicing') ? "bg-[#FF6B5B]/10 text-[#FF6B5B] font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800")}>
          <Receipt className="w-5 h-5" /> الفواتير والمبيعات
        </a>
      )}

      <a href="/dashboard/sales" className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all", isActive('/dashboard/sales') ? "bg-[#FF6B5B]/10 text-[#FF6B5B] font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800")}>
        <History className="w-5 h-5" /> سجل المبيعات
      </a>

      <a href="/dashboard/closing" className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all", isActive('/dashboard/closing') ? "bg-[#FF6B5B]/10 text-[#FF6B5B] font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800")}>
        <Calculator className="w-5 h-5" /> تقفيل الصندوق
      </a>

      <a href="/dashboard/reports" className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all", isActive('/dashboard/reports') ? "bg-[#FF6B5B]/10 text-[#FF6B5B] font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800")}>
        <PieChart className="w-5 h-5" /> التقارير
      </a>

      <div className="border-t border-slate-700/60 my-4" />

      <a href="/dashboard/settings" className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all", isActive('/dashboard/settings') ? "bg-[#FF6B5B]/10 text-[#FF6B5B] font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800")}>
        <Settings className="w-5 h-5" /> الإعدادات
      </a>
    </nav>
  );
}
