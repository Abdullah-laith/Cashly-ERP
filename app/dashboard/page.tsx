'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon3D } from '@/components/ui/Icon3D';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/components/organization-provider';
import { printInvoicePDF, type InvoiceData } from '@/lib/print-engine';
import {
  Activity, ArrowDownLeft, ArrowUpLeft, CalendarDays, FileText, PackagePlus,
  Printer, Receipt, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';

type Period = 'today' | 'month' | 'year' | 'all';
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
const periodLabel: Record<Period, string> = { today: 'مبيعات اليوم', month: 'هذا الشهر', year: 'هذا العام', all: 'المبيعات الكلية' };

function startForPeriod(period: Period) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (period === 'today') return date;
  if (period === 'month') return new Date(date.getFullYear(), date.getMonth(), 1);
  if (period === 'year') return new Date(date.getFullYear(), 0, 1);
  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [period, setPeriod] = useState<Period>('today');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState({ purchases: 0, expenses: 0, receivables: 0 });
  const [loading, setLoading] = useState(true);
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    const from = startForPeriod(period);
    const invoiceQuery = supabase.from('invoices').select('id,invoice_number,customer_name,total_amount,remaining_debt,payment_type,created_at').is('deleted_at', null).order('created_at', { ascending: false });
    const purchasesQuery = supabase.from('purchases').select('total_cost');
    const expensesQuery = supabase.from('expenses').select('amount');
    const [invoiceResult, purchasesResult, expensesResult, debtsResult] = await Promise.all([
      from ? invoiceQuery.gte('created_at', from.toISOString()) : invoiceQuery,
      from ? purchasesQuery.gte('created_at', from.toISOString()) : purchasesQuery,
      from ? expensesQuery.gte('created_at', from.toISOString()) : expensesQuery,
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
    const count = period === 'today' ? 15 : period === 'month' ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() : period === 'year' ? 12 : 12;
    const dates = Array.from({ length: count }, (_, index) => {
      const date = new Date(now);
      if (period === 'today') date.setHours(9 + index, 0, 0, 0);
      else if (period === 'month') { date.setHours(0, 0, 0, 0); date.setDate(index + 1); }
      else if (period === 'year') date.setMonth(index, 1);
      else { date.setHours(0, 0, 0, 0); date.setMonth(date.getMonth() - 11 + index, 1); }
      return date;
    });
    return dates.map((date, index) => {
      const matching = invoices.filter(invoice => {
        const created = new Date(invoice.created_at);
        return period === 'today' ? created.toDateString() === now.toDateString() && created.getHours() === date.getHours() : period === 'year' || period === 'all' ? created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth() : dateKey(created) === dateKey(date);
      });
      const amount = matching.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
      const labelStep = period === 'today' ? 3 : period === 'year' || period === 'all' ? 1 : Math.max(1, Math.ceil(count / 7));
      const shouldShowLabel = period === 'year' || period === 'all' || index === 0 || index === count - 1 || index % labelStep === 0;
      return { key: `${date.toISOString()}-${index}`, label: shouldShowLabel ? period === 'today' ? `${String(date.getHours()).padStart(2, '0')}:00` : period === 'year' || period === 'all' ? date.toLocaleDateString('ar-IQ', { month: 'short' }) : `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}` : '', amount, profit: amount, invoices: matching.length, fullDate: date.toLocaleDateString('ar-IQ', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) };
    });
  }, [invoices, period, now]);

  const sales = invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const profit = sales - stats.purchases - stats.expenses;
  const rawChartMax = Math.max(...points.map(point => point.amount), 0);
  const chartStep = rawChartMax > 0 ? 10 ** Math.floor(Math.log10(rawChartMax)) / 2 : 1000;
  const chartMax = rawChartMax > 0 ? Math.ceil(rawChartMax / chartStep) * chartStep : chartStep;
  const chartAverage = points.reduce((sum, point) => sum + point.amount, 0) / Math.max(points.length, 1);
  const peak = points.reduce((best, point) => point.amount > best.amount ? point : best, points[0] || { amount: 0, fullDate: '' });
  const chartWidth = 900, chartHeight = 300, padding = { top: 22, right: 28, bottom: 56, left: 76 };
  const plotWidth = chartWidth - padding.left - padding.right, plotHeight = chartHeight - padding.top - padding.bottom;
  const coordinates = points.map((point, index) => ({ ...point, x: padding.left + (points.length === 1 ? plotWidth / 2 : index / (points.length - 1) * plotWidth), y: padding.top + plotHeight - point.amount / chartMax * plotHeight }));
  const linePath = coordinates.length ? coordinates.map((point, index) => { if (!index) return `M ${point.x} ${point.y}`; const previous = coordinates[index - 1]; const midpoint = (previous.x + point.x) / 2; return `C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`; }).join(' ') : '';
  const areaPath = linePath ? `${linePath} L ${padding.left + plotWidth} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z` : '';
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => Math.round(chartMax * ratio / chartStep) * chartStep);
  const todayInvoices = now ? invoices.filter(invoice => new Date(invoice.created_at).toDateString() === now.toDateString()).slice(0, 6) : [];
  const paymentMix = [
    { label: 'نقدي', value: invoices.filter(i => i.payment_type === 'cash' || i.payment_type === 'نقدي').reduce((s, i) => s + Number(i.total_amount || 0), 0), color: '#10b981' },
    { label: 'آجل / دين', value: invoices.filter(i => i.payment_type === 'credit' || i.payment_type === 'آجل').reduce((s, i) => s + Number(i.total_amount || 0), 0), color: '#f59e0b' },
  ];
  const paymentTotal = paymentMix.reduce((sum, item) => sum + item.value, 0) || 1;
  const donut = paymentMix.reduce((acc, item) => { const start = acc.offset; const sweep = item.value / paymentTotal * 360; return { offset: start + sweep, paths: [...acc.paths, { ...item, start, sweep }] }; }, { offset: -90, paths: [] as Array<{ label: string; value: number; color: string; start: number; sweep: number }> });
  const polar = (angle: number, radius: number) => [100 + radius * Math.cos(angle * Math.PI / 180), 100 + radius * Math.sin(angle * Math.PI / 180)];
  const arc = (start: number, sweep: number) => { const [sx, sy] = polar(start, 66); const [ex, ey] = polar(start + sweep, 66); return `M ${sx} ${sy} A 66 66 0 ${sweep > 180 ? 1 : 0} 1 ${ex} ${ey}`; };

  const printDashboardInvoice = async (invoice: Invoice) => {
    const invoiceForPrint: InvoiceData = { invoiceNumber: invoice.invoice_number || invoice.id?.slice(0, 8) || '—', createdAt: invoice.created_at, customerName: invoice.customer_name || 'عميل نقدي', customerPhone: undefined, customerType: 'in_store', paymentType: invoice.payment_type === 'credit' || invoice.payment_type === 'آجل' ? 'credit' : 'cash', lines: [], subtotal: Number(invoice.total_amount || 0), discount: 0, discountMode: 'amount', shipping: 0, total: Number(invoice.total_amount || 0), currency: 'IQD' };
    await printInvoicePDF(invoiceForPrint, organization);
  };

  const kpiCards = [
    { title: period === 'today' ? 'مبيعات اليوم' : `مبيعات ${periodLabel[period]}`, value: sales, href: '/dashboard/sales', icon: TrendingUp, tone: 'emerald' as const, note: `${invoices.length.toLocaleString('ar-IQ')} فاتورة` },
    { title: 'المشتريات والمصاريف', value: stats.purchases + stats.expenses, href: '/dashboard/purchases', icon: Receipt, tone: 'violet' as const, note: `${money(stats.purchases)} مشتريات · ${money(stats.expenses)} تشغيل` },
    { title: 'صافي الربح الفعلي', value: profit, href: '/dashboard/reports', icon: profit >= 0 ? Activity : TrendingDown, tone: profit >= 0 ? 'blue' as const : 'rose' as const, note: profit >= 0 ? 'بعد خصم التكلفة والمصاريف' : 'خسارة تحتاج إلى مراجعة' },
    { title: 'السيولة والديون', value: Math.max(0, sales - stats.purchases - stats.expenses), href: '/dashboard/debts', icon: Wallet, tone: 'amber' as const, note: `${money(stats.receivables)} مستحقات آجلة` },
  ];
  const quickActions = [
    { name: 'فاتورة بيع سريعة', href: '/dashboard/invoicing', icon: FileText, tone: 'orange' as const },
    { name: 'سند قبض', href: '/dashboard/finance/vouchers/new/receipt', icon: Wallet, tone: 'emerald' as const },
    { name: 'مصروف يومي', href: '/dashboard/finance/vouchers/new/expense', icon: ArrowDownLeft, tone: 'rose' as const },
    { name: 'منتج جديد', href: '/dashboard/inventory', icon: PackagePlus, tone: 'blue' as const },
  ];

  return <div className="dashboard-content space-y-6 bg-[#F8FAFC] text-[#0F172A]">
    <section className="dashboard-heading flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 flex items-center gap-2 text-sm text-slate-500"><CalendarDays className="h-4 w-4 text-sky-300" /> {now ? now.toLocaleDateString('ar-IQ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'ملخص اليوم'}</p><h1 className="text-2xl font-semibold">ملخص النشاط التجاري</h1></div><div className="period-switch flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-1.5" aria-label="نطاق بيانات لوحة المعلومات">{(Object.entries(periodLabel) as [Period, string][]).map(([value, label]) => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)} className={`rounded-lg px-3 py-1.5 text-sm ${period === value ? 'is-selected' : ''}`}>{label}</button>)}</div></section>
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="مؤشرات الأداء">{kpiCards.map(({ title, value, href, icon: Icon, tone, note }) => <Link key={title} href={href} className="group block cursor-pointer rounded-2xl" aria-label={`${title}: ${money(value)}`}><Card className="kpi-card h-full border border-slate-200/80/80 bg-white shadow-lg rounded-2xl transition-all duration-200 group-hover:-translate-y-1 group-hover:border-slate-300 group-hover:shadow-md group-active:scale-[0.98]"><CardContent className="flex items-start justify-between gap-3 p-4"><div className="min-w-0"><p className="text-sm text-slate-500">{title}</p><p className={`mt-2 truncate text-xl font-semibold tabular-nums text-slate-900 ${value < 0 ? 'text-rose-500' : ''}`}>{money(value)}</p><p className="mt-1 truncate text-xs text-slate-500">{note}</p></div><div className="flex items-start gap-2"><Icon3D icon={Icon} tone={tone} size="md" /><ArrowUpLeft className="mt-1 h-4 w-4 text-slate-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" /></div></CardContent></Card></Link>)}</section>
    <section className="quick-actions-bar rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="الإجراءات اليومية السريعة" dir="rtl"><span className="quick-actions-label text-slate-800 font-semibold">إنجاز سريع</span><div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">{quickActions.map(({ name, href, icon: Icon, tone }) => <Link key={href} href={href} className="quick-action-inline group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-right transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:scale-[0.98]"><Icon3D icon={Icon} tone={tone} size="sm" /><span className="flex-1 text-slate-800 font-semibold">{name}</span><ArrowUpLeft className="h-3.5 w-3.5 text-slate-500 transition-opacity duration-200 group-hover:text-slate-700" /></Link>)}</div></section>
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-3"><Card className="sales-chart-card lg:col-span-2 overflow-hidden rounded-2xl border border-slate-200/80/80 bg-white shadow-lg"><CardContent className="p-4 sm:p-5"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-sm text-slate-500">اتجاه المبيعات</p><div className="mt-1 flex items-baseline gap-2"><h2 className="text-2xl font-semibold">{money(sales)}</h2><span className="text-xs text-slate-500">{periodLabel[period]}</span></div></div><span className="chart-live-badge"><span /> مباشر</span></div><figure className="sales-chart-figure" aria-label={`المبيعات خلال ${periodLabel[period]}`}><div className="sales-chart-plot w-full overflow-hidden"><svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="مخطط المبيعات اليومي" preserveAspectRatio="none"><defs><linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#F97316" stopOpacity=".24" /><stop offset="100%" stopColor="#F97316" stopOpacity="0" /></linearGradient></defs>{yTicks.map((tick, index) => { const y = padding.top + plotHeight - index / 4 * plotHeight; return <g key={`${tick}-${index}`}><line x1={padding.left} x2={padding.left + plotWidth} y1={y} y2={y} className="chart-gridline" /><text x={padding.left - 9} y={y + 4} textAnchor="end" className="chart-axis-label">{compactMoney(tick)}</text></g>; })}<path d={areaPath} fill="url(#sales-area)" /><path d={linePath} fill="none" className="chart-sales-line" />{coordinates.map((point, index) => <g key={point.key} onMouseEnter={() => setActivePoint(index)} onMouseLeave={() => setActivePoint(null)} onFocus={() => setActivePoint(index)} onBlur={() => setActivePoint(null)} tabIndex={0} role="button" aria-label={`${point.fullDate}: ${money(point.amount)}, ${point.invoices} فواتير`} className="chart-point-hit"><circle cx={point.x} cy={point.y} r={activePoint === index ? 6 : point.amount ? 4 : 2.5} className="chart-sales-point" />{activePoint === index && <g className="chart-tooltip"><rect x={Math.max(padding.left, Math.min(point.x - 92, chartWidth - 198))} y={Math.max(2, point.y - 82)} width="178" height="66" rx="9" /><text x={Math.max(padding.left + 89, Math.min(point.x, chartWidth - 109))} y={point.y - 62} textAnchor="middle">{point.fullDate}</text><text x={Math.max(padding.left + 89, Math.min(point.x, chartWidth - 109))} y={point.y - 45} textAnchor="middle">{money(point.amount)}</text><text x={Math.max(padding.left + 89, Math.min(point.x, chartWidth - 109))} y={point.y - 29} textAnchor="middle" className="chart-tooltip-date">{point.invoices} فواتير · ربح {compactMoney(point.profit)}</text></g>}</g>)}{coordinates.map((point, index) => point.label ? <text key={`label-${point.key}`} x={point.x} y={chartHeight - 18} textAnchor={index === 0 ? 'start' : index === coordinates.length - 1 ? 'end' : 'middle'} className="chart-axis-label chart-date-label">{point.label}</text> : null)}</svg></div><figcaption className="chart-summary"><span>المتوسط <strong>{money(chartAverage)}</strong></span><span className="chart-summary-divider" aria-hidden="true">|</span><span>أعلى نقطة <strong>{peak?.fullDate || '—'}</strong></span></figcaption></figure></CardContent></Card>
      <Card className="donut-card rounded-2xl border border-slate-200/80/80 bg-white shadow-lg"><CardContent className="p-4 sm:p-5"><p className="text-sm text-slate-500">توزيع طرق الدفع</p><h2 className="mt-1 text-xl font-semibold">{money(paymentTotal === 1 && !sales ? 0 : paymentTotal)}</h2><div className="donut-wrap"><svg viewBox="0 0 200 200" className="mx-auto h-44 w-44" aria-label="توزيع المبيعات حسب طريقة الدفع"><circle cx="100" cy="100" r="66" className="donut-track" strokeWidth="14" fill="none" stroke="#E2E8F0" />{donut.paths.map(item => <path key={item.label} d={arc(item.start, item.sweep)} stroke={item.color} strokeWidth="14" fill="none" strokeLinecap="round" className="donut-segment" />)}<text x="100" y="97" textAnchor="middle" className="donut-center-value text-slate-900">{invoices.length}</text><text x="100" y="116" textAnchor="middle" className="donut-center-label">فاتورة</text></svg></div><div className="payment-legend mt-4 space-y-2.5 text-sm">{paymentMix.map(item => <div key={item.label}><span className="legend-dot" style={{ background: item.color }} /><span>{item.label}</span><strong>{Math.round(item.value / paymentTotal * 100)}%</strong></div>)}</div></CardContent></Card></section>
    <Card className="activity-card rounded-2xl border border-slate-200/80/80 bg-white shadow-lg"><CardContent className="p-4 sm:p-5"><div className="activity-header mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="activity-kicker">ملخص العمليات</p><h2 className="mt-1 text-lg font-semibold">حركة اليوم وآخر الفواتير</h2></div><div className="flex items-center gap-2"><span className="activity-count">{todayInvoices.length} عمليات</span><Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/sales')}>عرض الكل <ArrowUpLeft className="mr-1 h-4 w-4" /></Button></div></div>{todayInvoices.length ? <div className="activity-table"><div className="activity-columns" aria-hidden="true"><span>الفاتورة</span><span>العميل</span><span>الوقت</span><span>طريقة الدفع</span><span>المبلغ</span><span /></div>{todayInvoices.map(invoice => <div key={invoice.id || invoice.created_at} className="activity-row"><span className="activity-invoice"><span className="activity-invoice-icon"><Receipt className="h-4 w-4" /></span>{invoice.invoice_number || 'فاتورة بيع'}</span><span className="activity-customer">{invoice.customer_name || 'عميل نقدي'}</span><span className="activity-time">{new Date(invoice.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}</span><span className={`activity-payment ${invoice.payment_type === 'credit' || invoice.payment_type === 'آجل' ? 'is-credit' : ''}`}>{invoice.payment_type === 'credit' || invoice.payment_type === 'آجل' ? 'آجل' : 'نقدي'}</span><strong className="activity-amount">{money(Number(invoice.total_amount || 0))}</strong><button type="button" onClick={() => void printDashboardInvoice(invoice)} aria-label="طباعة الفاتورة"><Printer className="h-4 w-4" /></button></div>)}</div> : <div className="activity-empty"><Receipt className="h-5 w-5" /><p>لا توجد عمليات مسجلة اليوم بعد.</p></div>}</CardContent></Card>
  </div>;
}
