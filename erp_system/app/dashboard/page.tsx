'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DollarSign, AlertTriangle, Package, Receipt, CreditCard, TrendingDown, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ totalSales: 0, lowStock: 0, todaySales: 0, totalDebts: 0, totalExpenses: 0, netProfit: 0 });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [weeklySales, setWeeklySales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: invoices } = await supabase.from('invoices').select('total_amount, created_at, remaining_debt, customer_name');
      const { data: products } = await supabase.from('products').select('name, quantity').lt('quantity', 10);
      const { data: expenses } = await supabase.from('expenses').select('title, amount, created_at');

      const today = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const salesData = last7Days.map(date => ({
        name: new Date(date).toLocaleDateString('ar-IQ', { weekday: 'short' }),
        val: invoices?.filter(i => i.created_at.startsWith(date)).reduce((s, i) => s + Number(i.total_amount), 0) || 0
      }));

      setWeeklySales(salesData);

      const totalSales = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
      const totalDebts = invoices?.reduce((sum, inv) => sum + Number(inv.remaining_debt || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      setStats({
        totalSales,
        lowStock: products?.length || 0,
        todaySales: invoices?.filter(i => i.created_at.startsWith(today.toISOString().split('T')[0])).reduce((s, i) => s + Number(i.total_amount), 0) || 0,
        totalDebts,
        totalExpenses,
        netProfit: totalSales - totalExpenses
      });
      setLowStockProducts(products || []);

      const recent = [
        ...invoices?.slice(-3).map(i => ({ type: 'بيع', name: i.customer_name, amount: i.total_amount, date: i.created_at })) || [],
        ...expenses?.slice(-2).map(e => ({ type: 'مصروف', name: e.title, amount: e.amount, date: e.created_at })) || []
      ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRecentTransactions(recent);
      setLoading(false);
    };
    fetchData();
  }, []);

  const kpiCards = [
    { title: "إجمالي المبيعات", value: stats.totalSales, icon: DollarSign, color: "text-[#10B981]", bg: "bg-emerald-500/10", link: '/dashboard/sales' },
    { title: "مبيعات اليوم", value: stats.todaySales, icon: Receipt, color: "text-[#3B82F6]", bg: "bg-blue-500/10", link: '/dashboard/invoicing' },
    { title: "صافي الربح", value: stats.netProfit, icon: TrendingUp, color: "text-[#22D3EE]", bg: "bg-cyan-500/10", link: '/dashboard/reports' },
    { title: "إجمالي المصاريف", value: stats.totalExpenses, icon: TrendingDown, color: "text-[#FF685B]", bg: "bg-rose-500/10", link: '/dashboard/accounts' },
    { title: "ديون لنا", value: stats.totalDebts, icon: CreditCard, color: "text-[#F59E0B]", bg: "bg-amber-500/10", link: '/dashboard/accounts' },
    { title: "نقص المخزن", value: stats.lowStock, icon: AlertTriangle, color: "text-[#EAB308]", bg: "bg-yellow-500/10", link: '/dashboard/inventory' },
  ];

  return (
    <div className="space-y-6 p-8 bg-[#0F172A] min-h-screen text-slate-100">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-white">لوحة قيادة الأعمال</h1>
        <div className="flex gap-3">
          <Button onClick={() => router.push('/dashboard/invoicing')} className="bg-[#14213D] border border-slate-700 hover:bg-[#1E293B]">+ فاتورة بيع سريعة</Button>
          <Button onClick={() => router.push('/dashboard/accounts')} className="bg-[#14213D] border border-slate-700 hover:bg-[#1E293B]">+ مصروف جديد</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiCards.map((kpi, i) => (
          <Card key={i} className="bg-slate-900/60 border-slate-800 cursor-pointer hover:border-blue-500/50 transition-all" onClick={() => router.push(kpi.link)}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`p-3 rounded-full ${kpi.bg}`}><kpi.icon className={`w-6 h-6 ${kpi.color}`} /></div>
              <div>
                <p className="text-xs text-slate-400">{kpi.title}</p>
                <p className="text-xl font-bold text-white">{kpi.value.toLocaleString()} د.ع</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 bg-slate-900/60 border-slate-800 shadow-xl h-80 p-6">
          <CardTitle className="text-slate-200 mb-6 text-sm">أداء المبيعات اليومي (آخر 7 أيام)</CardTitle>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={weeklySales}>
              <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}} />
              <YAxis
                tickFormatter={(val) => `${(val / 1000).toLocaleString()} ألف`}
                stroke="#94a3b8"
                width={60}
              />
              <Tooltip
                cursor={{fill: '#1E293B'}}
                formatter={(value: number) => [`${value.toLocaleString()} د.ع`, 'المبيعات']}
                contentStyle={{backgroundColor: '#0F172A', border: '1px solid #334155'}}
              />
              <Bar dataKey="val" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 shadow-xl h-80 overflow-y-auto cursor-pointer" onClick={() => router.push('/dashboard/inventory')}>
          <CardHeader><CardTitle className="text-sm">تنبيهات المخزن</CardTitle></CardHeader>
          <CardContent>
            {lowStockProducts.map(p => <div key={p.name} className="flex justify-between py-2 border-b border-slate-800 text-sm"><span>{p.name}</span><span className="text-orange-500 font-bold">{p.quantity} قطع</span></div>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
