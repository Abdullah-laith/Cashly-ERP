'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Receipt, TrendingUp, TrendingDown, CreditCard, AlertTriangle, Plus, FileText, Briefcase, FilePlus, UserPlus, PackagePlus, BarChart3, BookOpen } from 'lucide-react';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('اليوم');
  const [stats, setStats] = useState({ sales: 0, purchases: 0, profit: 0, receivables: 0, payables: 0, expenses: 0 });

  const kpiCards = [
    { title: "صافي المبيعات", value: 12500000, icon: DollarSign, color: "text-emerald-500" },
    { title: "إجمالي المشتريات", value: 8400000, icon: Receipt, color: "text-blue-500" },
    { title: "صافي الربح", value: 4100000, icon: TrendingUp, color: "text-cyan-500" },
    { title: "مستحقات العملاء", value: 2300000, icon: CreditCard, color: "text-amber-500" },
    { title: "مستحقات الموردين", value: 1800000, icon: TrendingDown, color: "text-rose-500" },
    { title: "رصيد الخزائن", value: 5600000, icon: Briefcase, color: "text-purple-500" },
  ];

  const quickActions = [
    { name: 'فاتورة بيع', icon: FileText },
    { name: 'فاتورة شراء', icon: Receipt },
    { name: 'سند قبض', icon: DollarSign },
    { name: 'سند صرف', icon: TrendingDown },
    { name: 'عميل جديد', icon: UserPlus },
    { name: 'منتج جديد', icon: PackagePlus },
    { name: 'قيد يومية', icon: BookOpen },
    { name: 'التقارير', icon: BarChart3 },
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
        <Input placeholder="البحث عن فاتورة (رقم/عميل)..." className="bg-slate-900 border-slate-700" />
        <Input placeholder="البحث عن عميل (اسم/هاتف)..." className="bg-slate-900 border-slate-700" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {quickActions.map((a, i) => (
          <button key={i} className="flex flex-col items-center justify-center p-4 bg-slate-800 rounded-lg hover:bg-[#FF685B] transition-colors group">
            <a.icon className="w-6 h-6 mb-2 group-hover:text-white" />
            <span className="text-xs font-bold text-slate-300 group-hover:text-white">{a.name}</span>
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
