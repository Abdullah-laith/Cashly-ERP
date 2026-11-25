'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Activity, ArrowDownLeft, ArrowUpLeft, CalendarDays, FileText, PackagePlus,
  Printer, Receipt, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';

type Period = 'today' | '7' | '30' | 'year';
type Invoice = {
  id?: string;
  invoice_number?: string;
  customer_name?: string;
  total_amount: number | string;
  remaining_debt?: number | string;
  payment_type?: string;
  created_at: string;
};
type Point = { key: string; label: string; amount: number; profit: number; invoices: number; fullDate: string };

const IQD = new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 0 });
const money = (value: number) => `${IQD.format(Math.round(value))} د.ع`;
const compactMoney = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `${IQD.format(Math.round(value / 1_000_000_000))} مليار`;
  if (absolute >= 1_000_000) return `${IQD.format(Math.round(value / 1_000_000))} مليون`;
  if (absolute >= 1_000) return `${IQD.format(Math.round(value / 1_000))} ألف`;
  return IQD.format(Math.round(value));
};
const dateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const periodLabel: Record<Period, string> = { today: 'اليوم', '7': 'آخر 7 أيام', '30': 'آخر 30 يوماً', year: 'هذا العام' };

function startForPeriod(period: Period) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (period === 'today') return date;
  if (period === 'year') return new Date(date.getFullYear(), 0, 1);
  date.setDate(date.getDate() - Number(period) + 1);
  return date;
}

export default function DashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('30');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState({ purchases: 0, expenses: 0, receivables: 0 });
  const [loading, setLoading] = useState(true);
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    const from = startForPeriod(period);
    const [invoiceResult, purchasesResult, expensesResult, debtsResult] = await Promise.all([
      supabase.from('invoices').select('id,invoice_number,customer_name,total_amount,remaining_debt,payment_type,created_at').is('deleted_at', null).gte('created_at', from.toISOString()).order('created_at', { ascending: false }),
      supabase.from('purchases').select('total_cost').gte('created_at', from.toISOString()),
      supabase.from('expenses').select('amount').gte('created_at', from.toISOString()),
      supabase.from('invoices').select('remaining_debt').is('deleted_at', null).gt('remaining_debt', 0),
    ]);
    setInvoices(invoiceResult.data || []);
    const sum = (rows: Record<string, unknown>[] | null, field: string) => (rows || []).reduce((total, row) => total + Number(row[field] || 0), 0);
    setStats({ purchases: sum(purchasesResult.data, 'total_cost'), expenses: sum(expensesResult.data, 'amount'), receivables: sum(debtsResult.data, 'remaining_debt') });
    setLoading(false);
  }, [period]);

  useEffect(() => {
    setNow(new Date());
    void fetchDashboard();
    window.addEventListener('focus', fetchDashboard);
    return () => window.removeEventListener('focus', fetchDashboard);
  }, [fetchDashboard]);

  const points = useMemo<Point[]>(() => {
    if (!now) return [];
    const count = period === 'today' ? 15 : period === 'year' ? 12 : Number(period);
    const dates = Array.from({ length: count }, (_, index) => {
      const date = new Date(now);
      if (period === 'today') date.setHours(9 + index, 0, 0, 0);
      else if (period === 'year') date.setMonth(index, 1);
      else { date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - count + index + 1); }
      return date;
    });
    return dates.map((date, index) => {
      const matching = invoices.filter(invoice => {
        const created = new Date(invoice.created_at);
        return period === 'today' ? created.toDateString() === now.toDateString() && created.getHours() === date.getHours() : period === 'year' ? created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth() : dateKey(created) === dateKey(date);
      });
      const amount = matching.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
      return { key: `${date.toISOString()}-${index}`, label: period === 'today' ? `${String(date.getHours()).padStart(2, '0')}:00` : period === 'year' ? date.toLocaleDateString('ar-IQ', { month: 'short' }) : (index === 0 || index === count - 1 || period === '7' ? `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}` : ''), amount, profit: amount, invoices: matching.length, fullDate: date.toLocaleDateString('ar-IQ', { day: 'numeric', month: 'long', year: 'numeric' }) };
    });
  }, [invoices, period, now]);

  const sales = invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const profit = sales - stats.purchases - stats.expenses;
  const chartMax = Math.max(...points.map(point => point.amount), 1);
  const chartAverage = points.reduce((sum, point) => sum + point.amount, 0) / Math.max(points.length, 1);
  const peak = points.reduce((best, point) => point.amount > best.amount ? point : best, points[0] || { amount: 0, fullDate: '' });
  const chartWidth = 760, chartHeight = 240, padding = { top: 22, right: 20, bottom: 40, left: 58 };
  const plotWidth = chartWidth - padding.left - padding.right, plotHeight = chartHeight - padding.top - padding.bottom;
  const coordinates = points.map((point, index) => ({ ...point, x: padding.left + (points.length === 1 ? plotWidth / 2 : index / (points.length - 1) * plotWidth), y: padding.top + plotHeight - point.amount / chartMax * plotHeight }));
  const linePath = coordinates.length ? coordinates.map((point, index) => { if (!index) return `M ${point.x} ${point.y}`; const previous = coordinates[index - 1]; const midpoint = (previous.x + point.x) / 2; return `C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`; }).join(' ') : '';
  const areaPath = linePath ? `${linePath} L ${padding.left + plotWidth} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z` : '';
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => Math.round(chartMax * ratio / 1000) * 1000);
  const todayInvoices = now ? invoices.filter(invoice => new Date(invoice.created_at).toDateString() === now.toDateString()).slice(0, 6) : [];
  const paymentMix = [
    { label: 'نقدي', value: invoices.filter(i => i.payment_type === 'cash' || i.payment_type === 'نقدي').reduce((s, i) => s + Number(i.total_amount || 0), 0), color: '#10b981' },
    { label: 'آجل / دين', value: invoices.filter(i => i.payment_type === 'credit' || i.payment_type === 'آجل').reduce((s, i) => s + Number(i.total_amount || 0), 0), color: '#f59e0b' },
    { label: 'تقسيط / جزئي', value: invoices.filter(i => i.payment_type === 'partial' || i.payment_type === 'تقسيط').reduce((s, i) => s + Number(i.total_amount || 0), 0), color: '#38bdf8' },
  ];
  const paymentTotal = paymentMix.reduce((sum, item) => sum + item.value, 0) || 1;
  const donut = paymentMix.reduce((acc, item) => { const start = acc.offset; const sweep = item.value / paymentTotal * 360; return { offset: start + sweep, paths: [...acc.paths, { ...item, start, sweep }] }; }, { offset: -90, paths: [] as Array<{ label: string; value: number; color: string; start: number; sweep: number }> });
  const polar = (angle: number, radius: number) => [100 + radius * Math.cos(angle * Math.PI / 180), 100 + radius * Math.sin(angle * Math.PI / 180)];
  const arc = (start: number, sweep: number) => { const [sx, sy] = polar(start, 66); const [ex, ey] = polar(start + sweep, 66); return `M ${sx} ${sy} A 66 66 0 ${sweep > 180 ? 1 : 0} 1 ${ex} ${ey}`; };

  const kpiCards = [
    { title: `مبيعات ${periodLabel[period]}`, value: sales, icon: TrendingUp, tone: 'emerald', note: `${invoices.length.toLocaleString('ar-IQ')} فاتورة` },
    { title: 'المشتريات والمصاريف', value: stats.purchases + stats.expenses, icon: Receipt, tone: 'sky', note: `${money(stats.purchases)} مشتريات · ${money(stats.expenses)} تشغيل` },
    { title: 'صافي الربح الفعلي', value: profit, icon: profit >= 0 ? Activity : TrendingDown, tone: profit >= 0 ? 'cyan' : 'rose', note: profit >= 0 ? 'بعد خصم التكلفة والمصاريف' : 'خسارة تحتاج إلى مراجعة' },
    { title: 'السيولة والديون', value: Math.max(0, sales - stats.purchases - stats.expenses), icon: Wallet, tone: 'amber', note: `${money(stats.receivables)} مستحقات آجلة` },
  ];
  const quickActions = [
    { name: 'فاتورة بيع سريعة', href: '/dashboard/invoicing', icon: FileText, tone: 'emerald' },
    { name: 'سند قبض', href: '/dashboard/finance/vouchers/new/receipt', icon: Wallet, tone: 'sky' },
    { name: 'مصروف يومي', href: '/dashboard/finance/vouchers/new/expense', icon: ArrowDownLeft, tone: 'rose' },
    { name: 'منتج جديد', href: '/dashboard/inventory', icon: PackagePlus, tone: 'cyan' },
  ];

  return <div className="dashboard-content space-y-6 bg-[#06080F] text-slate-100">
    <section className="dashboard-heading flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 flex items-center gap-2 text-sm text-slate-400"><CalendarDays className="h-4 w-4 text-sky-300" /> {now ? now.toLocaleDateString('ar-IQ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'ملخص اليوم'}</p><h1 className="text-2xl font-semibold">ملخص النشاط التجاري</h1></div><div className="period-switch flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-1.5" aria-label="نطاق بيانات لوحة المعلومات">{(Object.entries(periodLabel) as [Period, string][]).map(([value, label]) => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)} className={`rounded-lg px-3 py-1.5 text-sm ${period === value ? 'is-selected' : ''}`}>{label}</button>)}</div></section>
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="مؤشرات الأداء">{kpiCards.map(({ title, value, icon: Icon, tone, note }) => <Card key={title} className="kpi-card border border-slate-800/80 bg-slate-900/80 shadow-lg rounded-2xl"><CardContent className="flex items-start justify-between gap-3 p-4"><div className="min-w-0"><p className="text-sm text-slate-400">{title}</p><p className={`mt-2 truncate text-xl font-semibold tabular-nums ${value < 0 ? 'text-rose-300' : ''}`}>{money(value)}</p><p className="mt-1 truncate text-xs text-slate-500">{note}</p></div><span className={`metric-icon tone-${tone}`}><Icon className="h-4 w-4" /></span></CardContent></Card>)}</section>
    <section className="quick-actions-bar flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-lg" aria-label="الإجراءات اليومية السريعة"><span className="quick-actions-label">إنجاز سريع</span><div className="flex flex-wrap items-center gap-3">{quickActions.map(({ name, href, icon: Icon, tone }) => <button key={href} type="button" onClick={() => router.push(href)} className="quick-action-inline flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/70 px-4 py-2.5 text-sm font-medium hover:bg-slate-800"><span className={`quick-action-icon tone-${tone}`}><Icon className="h-4 w-4" /></span>{name}<ArrowUpLeft className="h-3.5 w-3.5" /></button>)}</div></section>
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-3"><Card className="sales-chart-card lg:col-span-2 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-lg"><CardContent className="p-4 sm:p-5"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-sm text-slate-400">اتجاه المبيعات</p><div className="mt-1 flex items-baseline gap-2"><h2 className="text-2xl font-semibold">{money(sales)}</h2><span className="text-xs text-slate-500">{periodLabel[period]}</span></div></div><span className="chart-live-badge"><span /> مباشر</span></div><figure className="sales-chart-figure" aria-label={`المبيعات خلال ${periodLabel[period]}`}><div className="sales-chart-plot w-full overflow-hidden"><svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="مخطط المبيعات اليومي" preserveAspectRatio="none"><defs><linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity=".25" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs>{yTicks.map((tick, index) => { const y = padding.top + plotHeight - index / 4 * plotHeight; return <g key={`${tick}-${index}`}><line x1={padding.left} x2={padding.left + plotWidth} y1={y} y2={y} className="chart-gridline" /><text x={padding.left - 9} y={y + 4} textAnchor="end" className="chart-axis-label">{compactMoney(tick)}</text></g>; })}<path d={areaPath} fill="url(#sales-area)" /><path d={linePath} fill="none" className="chart-sales-line" />{coordinates.map((point, index) => <g key={point.key} onMouseEnter={() => setActivePoint(index)} onMouseLeave={() => setActivePoint(null)} onFocus={() => setActivePoint(index)} onBlur={() => setActivePoint(null)} tabIndex={0} role="button" aria-label={`${point.fullDate}: ${money(point.amount)}, ${point.invoices} فواتير`} className="chart-point-hit"><circle cx={point.x} cy={point.y} r={activePoint === index ? 6 : point.amount ? 4 : 2.5} className="chart-sales-point" />{activePoint === index && <g className="chart-tooltip"><rect x={Math.max(padding.left, Math.min(point.x - 92, chartWidth - 198))} y={Math.max(2, point.y - 82)} width="178" height="66" rx="9" /><text x={Math.max(padding.left + 89, Math.min(point.x, chartWidth - 109))} y={point.y - 62} textAnchor="middle">{point.fullDate}</text><text x={Math.max(padding.left + 89, Math.min(point.x, chartWidth - 109))} y={point.y - 45} textAnchor="middle">{money(point.amount)}</text><text x={Math.max(padding.left + 89, Math.min(point.x, chartWidth - 109))} y={point.y - 29} textAnchor="middle" className="chart-tooltip-date">{point.invoices} فواتير · ربح {compactMoney(point.profit)}</text></g>}</g>)}{coordinates.map(point => point.label ? <text key={`label-${point.key}`} x={point.x} y={chartHeight - 8} textAnchor="middle" className="chart-axis-label">{point.label}</text> : null)}</svg></div><figcaption className="chart-summary"><span>المتوسط <strong>{money(chartAverage)}</strong></span><span className="chart-summary-divider" aria-hidden="true">|</span><span>أعلى نقطة <strong>{peak?.fullDate || '—'}</strong></span></figcaption></figure></CardContent></Card>
      <Card className="donut-card rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-lg"><CardContent className="p-4 sm:p-5"><p className="text-sm text-slate-400">توزيع طرق الدفع</p><h2 className="mt-1 text-xl font-semibold">{money(paymentTotal === 1 && !sales ? 0 : paymentTotal)}</h2><div className="donut-wrap"><svg viewBox="0 0 200 200" className="mx-auto h-44 w-44" aria-label="توزيع المبيعات حسب طريقة الدفع"><circle cx="100" cy="100" r="66" className="donut-track" strokeWidth="14" />{donut.paths.map(item => <path key={item.label} d={arc(item.start, item.sweep)} stroke={item.color} strokeWidth="14" className="donut-segment" />)}<text x="100" y="97" textAnchor="middle" className="donut-center-value">{invoices.length}</text><text x="100" y="116" textAnchor="middle" className="donut-center-label">فاتورة</text></svg></div><div className="payment-legend mt-4 space-y-2.5">{paymentMix.map(item => <div key={item.label}><span className="legend-dot" style={{ background: item.color }} /><span>{item.label}</span><strong>{Math.round(item.value / paymentTotal * 100)}%</strong></div>)}</div></CardContent></Card></section>
    <Card className="activity-card rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-lg"><CardContent className="p-4 sm:p-5"><div className="activity-header mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="activity-kicker">ملخص العمليات</p><h2 className="mt-1 text-lg font-semibold">حركة اليوم وآخر الفواتير</h2></div><div className="flex items-center gap-2"><span className="activity-count">{todayInvoices.length} عمليات</span><Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/sales')}>عرض الكل <ArrowUpLeft className="mr-1 h-4 w-4" /></Button></div></div>{todayInvoices.length ? <div className="activity-table"><div className="activity-columns" aria-hidden="true"><span>الفاتورة</span><span>العميل</span><span>الوقت</span><span>طريقة الدفع</span><span>المبلغ</span><span /></div>{todayInvoices.map(invoice => <div key={invoice.id || invoice.created_at} className="activity-row"><span className="activity-invoice"><span className="activity-invoice-icon"><Receipt className="h-4 w-4" /></span>{invoice.invoice_number || 'فاتورة بيع'}</span><span className="activity-customer">{invoice.customer_name || 'عميل نقدي'}</span><span className="activity-time">{new Date(invoice.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}</span><span className={`activity-payment ${invoice.payment_type === 'credit' || invoice.payment_type === 'آجل' ? 'is-credit' : ''}`}>{invoice.payment_type === 'credit' || invoice.payment_type === 'آجل' ? 'آجل' : invoice.payment_type === 'partial' ? 'تقسيط' : 'نقدي'}</span><strong className="activity-amount">{money(Number(invoice.total_amount || 0))}</strong><button type="button" onClick={() => window.print()} aria-label="طباعة الفاتورة"><Printer className="h-4 w-4" /></button></div>)}</div> : <div className="activity-empty"><Receipt className="h-5 w-5" /><p>لا توجد عمليات مسجلة اليوم بعد.</p></div>}</CardContent></Card>
  </div>;
}
