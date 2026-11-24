'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DollarSign, Receipt, TrendingUp, TrendingDown, CreditCard, AlertTriangle, Plus, FileText, Briefcase, FilePlus, UserPlus, PackagePlus, BarChart3, BookOpen } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [invQ, setInvQ] = useState('');
  const [custQ, setCustQ] = useState('');
  const [dateRange, setDateRange] = useState('هذا الشهر');
  const [stats, setStats] = useState({ sales: 0, purchases: 0, profit: 0, receivables: 0, payables: 0, expenses: 0 });

  const fetchStats = async () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (dateRange === 'آخر 7 أيام') d.setDate(d.getDate() - 6);
    else if (dateRange === 'هذا الشهر') d.setDate(1);
    else if (dateRange === 'هذه السنة') { d.setMonth(0); d.setDate(1); }
    const from = d.toISOString();
    const sum = (rows: any[] | null, k: string) => (rows || []).reduce((a, r) => a + Number(r[k] || 0), 0);

    const [inv, pur, exp, debt] = await Promise.all([
      supabase.from('invoices').select('total_amount').is('deleted_at', null).gte('created_at', from),
      supabase.from('purchases').select('total_cost').gte('created_at', from),
      supabase.from('expenses').select('amount').gte('created_at', from),
      supabase.from('invoices').select('remaining_debt').is('deleted_at', null).gt('remaining_debt', 0),
    ]);
    const sales = sum(inv.data, 'total_amount');
    const purchases = sum(pur.data, 'total_cost');
    const expenses = sum(exp.data, 'amount');
    setStats({ sales, purchases, expenses, receivables: sum(debt.data, 'remaining_debt'), payables: 0, profit: sales - purchases - expenses });
  };

  useEffect(() => {
    fetchStats();
    const onFocus = () => fetchStats();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const kpiCards = [
    { title: "صافي المبيعات", value: stats.sales, icon: DollarSign, color: "text-emerald-500" },
    { title: "إجمالي المشتريات", value: stats.purchases, icon: Receipt, color: "text-blue-500" },
    { title: "صافي الربح", value: stats.profit, icon: TrendingUp, color: "text-cyan-500" },
    { title: "مستحقات العملاء", value: stats.receivables, icon: CreditCard, color: "text-amber-500" },
    { title: "المصروفات", value: stats.expenses, icon: TrendingDown, color: "text-rose-500" },
  ];

  const quickActions = [
    { name: 'فاتورة بيع', href: '/dashboard/invoicing', icon: FileText },
    { name: 'فاتورة شراء', href: '/dashboard/purchases', icon: Receipt },
    { name: 'سند قبض', href: '/dashboard/debts', icon: DollarSign },
    { name: 'سند صرف', href: '/dashboard/accounts', icon: TrendingDown },
    { name: 'عميل جديد', href: '/dashboard/customers/new', icon: UserPlus },
    { name: 'منتج جديد', href: '/dashboard/inventory', icon: PackagePlus },
    { name: 'قيد يومية', href: '/dashboard/accounting', icon: BookOpen },
    { name: 'التقارير', href: '/dashboard/reports', icon: BarChart3 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header & Date Filters */}
      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <h2 className="text-xl font-bold">طاب يومك، عبد الله</h2>
        <div className="flex gap-2">
          {['اليوم', 'آخر 7 أيام', 'هذا الشهر', 'هذه السنة'].map(r => (
            <Button key={r} variant={dateRange === r ? 'default' : 'outline'} onClick={() => setDateRange(r)}>{r}</Button>
          ))}
        </div>
      </div>

      {/* Quick Search */}
      <div className="grid grid-cols-2 gap-4">
        <Input value={invQ} onChange={(e) => setInvQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && router.push(`/dashboard/sales?q=${encodeURIComponent(invQ)}`)} placeholder="البحث عن فاتورة (عميل/هاتف) ثم Enter..." className="bg-slate-900 border-slate-700" />
        <Input value={custQ} onChange={(e) => setCustQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && router.push(`/dashboard/customers?q=${encodeURIComponent(custQ)}`)} placeholder="البحث عن عميل (اسم/هاتف) ثم Enter..." className="bg-slate-900 border-slate-700" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {quickActions.map((a, i) => (
          <button key={i} onClick={() => router.push(a.href)} className="flex flex-col items-center justify-center p-4 bg-slate-800 rounded-lg hover:bg-[#FF685B] transition-colors group">
            <a.icon className="w-6 h-6 mb-2 group-hover:text-white" />
            <span className="text-xs font-bold text-slate-300 group-hover:text-white">{a.name}</span>
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, i) => (
          <Card key={i} className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <kpi.icon className={`w-8 h-8 mb-2 ${kpi.color}`} />
              <p className="text-xs text-slate-400">{kpi.title}</p>
              <p className="text-lg xl:text-xl font-bold tabular-nums truncate">{kpi.value.toLocaleString()} د.ع</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
