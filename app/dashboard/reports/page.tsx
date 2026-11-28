'use client';

import { useCallback, useEffect, useState } from 'react';
import { getReportsData, type ReportPeriodSelection, ReportsData } from '@/lib/reports';
import { printReportPDF, type ReportData } from '@/lib/print-engine';
import { useOrganization } from '@/components/organization-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, RefreshCw } from 'lucide-react';
import { PeriodNavigator, createPeriodSelection, type PeriodSelection } from '@/components/ui/PeriodNavigator';

const emptyData: ReportsData = { sales: 0, purchases: 0, expenses: 0, profit: 0, receivables: 0, invoiceCount: 0, topProducts: [] };
const money = (value: number) => `${value.toLocaleString('ar-IQ')} د.ع`;
const dateLabel = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' }) : 'اختر تاريخاً';

export default function ReportsPage() {
  const [periodSelection, setPeriodSelection] = useState<PeriodSelection>(() => createPeriodSelection());
  const [data, setData] = useState<ReportsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organization } = useOrganization();

  const loadReport = useCallback(async (nextSelection: ReportPeriodSelection) => {
    setLoading(true);
    setError(null);
    try { setData(await getReportsData(nextSelection)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحميل التقرير'); }
    finally { setLoading(false); }
  }, []);

  const reportSelection: ReportPeriodSelection | null = periodSelection.mode === 'custom'
    ? periodSelection.startDate && periodSelection.endDate ? { startDate: periodSelection.startDate, endDate: periodSelection.endDate } : null
    : periodSelection.mode === 'daily' ? 'today' : periodSelection.mode === 'monthly' ? 'month' : periodSelection.mode === 'yearly' ? 'year' : 'all';

  useEffect(() => {
    if (reportSelection) void loadReport(reportSelection);
  }, [reportSelection, loadReport]);

  const periodLabel = periodSelection.mode === 'custom' ? `${dateLabel(periodSelection.startDate)} — ${dateLabel(periodSelection.endDate)}` : periodSelection.mode === 'all' ? 'كل الفترات' : periodSelection.mode === 'daily' ? 'اليوم' : periodSelection.mode === 'monthly' ? 'هذا الشهر' : `عام ${periodSelection.year}`;
  const printReport = async () => {
    const report: ReportData = {
      title: 'مركز التقارير الشامل', period: periodLabel, organization,
      summary: [['إجمالي المبيعات', data.sales], ['إجمالي المشتريات', data.purchases], ['المصاريف', data.expenses], ['صافي الربح', data.profit], ['ديون العملاء', data.receivables], ['عدد الفواتير', data.invoiceCount]].map(([label, value]) => ({ label: String(label), value: label === 'عدد الفواتير' ? Number(value).toLocaleString('en-US') : `${Number(value).toLocaleString('en-US')} د.ع` })),
      columns: [{ label: 'المنتج', key: 'name' }, { label: 'الكمية', key: 'quantity', align: 'center' }, { label: 'قيمة المبيعات', key: 'sales', align: 'left' }],
      rows: data.topProducts.map(product => ({ name: product.name, quantity: Number(product.quantity).toLocaleString('en-US'), sales: `${Number(product.sales).toLocaleString('en-US')} د.ع` })),
    };
    await printReportPDF(report);
  };

  return (
    <div dir="rtl" className="reports-page space-y-6 p-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">مركز التقارير الشامل</h1><p className="mt-1 text-sm text-muted-foreground">احسب النتائج مباشرة من الفواتير والمشتريات والمصاريف الفعلية.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => { if (reportSelection) void loadReport(reportSelection); }} disabled={loading}><RefreshCw className="ml-2 h-4 w-4" /> تحديث</Button><Button onClick={() => void printReport()}><Printer className="ml-2 h-4 w-4" /> طباعة التقرير / PDF</Button></div>
      </div>
      <section className="no-print"><PeriodNavigator value={periodSelection} onChange={setPeriodSelection} /></section>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">{error}</p>}
      <div id="printable-report" className="space-y-6">
        <div className="print-report-heading hidden"><h1>مركز التقارير الشامل</h1><p>الفترة: {periodLabel}</p><p>تاريخ الطباعة: {new Date().toLocaleDateString('en-US')}</p></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {([['إجمالي المبيعات', data.sales], ['إجمالي المشتريات', data.purchases], ['المصاريف', data.expenses], ['صافي الربح', data.profit], ['ديون العملاء', data.receivables], ['عدد الفواتير', data.invoiceCount]] as const).map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{loading ? '...' : label === 'عدد الفواتير' ? Number(value).toLocaleString('ar-IQ') : money(Number(value))}</p></CardContent></Card>)}
        </div>
        <Card><CardHeader><CardTitle>الأكثر مبيعاً</CardTitle></CardHeader><CardContent>{data.topProducts.length ? <div className="overflow-x-auto"><table className="w-full text-right"><thead><tr><th className="border-b p-3">المنتج</th><th className="border-b p-3">الكمية</th><th className="border-b p-3">قيمة المبيعات</th></tr></thead><tbody>{data.topProducts.map(product => <tr key={product.name}><td className="border-b p-3">{product.name}</td><td className="border-b p-3">{product.quantity.toLocaleString('ar-IQ')}</td><td className="border-b p-3">{money(product.sales)}</td></tr>)}</tbody></table></div> : <p className="text-muted-foreground">لا توجد مبيعات في الفترة المحددة.</p>}</CardContent></Card>
      </div>
    </div>
  );
}
