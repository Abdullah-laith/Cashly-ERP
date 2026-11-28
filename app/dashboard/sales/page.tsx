'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Search, ChevronLeft, ChevronRight, Download, Eye, FileText, Printer, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast-provider';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/components/organization-provider';
import { printInvoicePDF, printReportPDF, type InvoiceData, type ReportData } from '@/lib/print-engine';
import { PeriodNavigator, createPeriodSelection, periodRange, type PeriodSelection } from '@/components/ui/PeriodNavigator';
import { formatBaghdadDateTime } from '@/lib/date-format';
import { EmptyState, TableSkeleton } from '@/components/ui/EmptyState';
import { shareInvoiceViaWhatsApp } from '@/lib/whatsapp-invoice';

interface Product {
  name: string;
  quantity: number;
  price?: number;
}

interface Invoice {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  remaining_debt?: number | null;
  created_at: string;
  deleted_at: string | null;
  payment_type: 'نقدي' | 'آجل';
  items: Product[];
  invoice_number?: string | null;
  customer_type?: 'online' | 'in_store' | null;
  subtotal_amount?: number | null;
  discount_amount?: number | null;
  discount_mode?: 'amount' | 'percent' | null;
  shipping_amount?: number | null;
  status?: 'paid' | 'returned' | string | null;
  warehouse_id?: string | null;
}

export default function SalesHistoryPage() {
  const { showToast } = useToast();
  const { organization } = useOrganization();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReturn, setConfirmReturn] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [periodSelection, setPeriodSelection] = useState<PeriodSelection>(() => createPeriodSelection());

  useEffect(() => {
    const q0 = new URLSearchParams(window.location.search).get('q');
    if (q0) setSearchTerm(q0);
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    const range = periodRange(periodSelection);
    let query = supabase.from('invoices').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (range) query = query.gte('created_at', range.start.toISOString()).lte('created_at', range.end.toISOString());
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
    } else if (data) {
      setInvoices(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchInvoices();
  }, [periodSelection]);

  const returnInvoice = async (id: string) => {
    setReturning(true);
    const { error } = await supabase.rpc('return_invoice', { invoice_id_param: id });
    if (error) showToast(`فشل إرجاع الفاتورة: ${error.message}`);
    else {
      showToast('تم إرجاع الفاتورة إلى المخزن وتحديث الدين');
      setInvoices(prev => prev.map(invoice => invoice.id === id ? { ...invoice, status: 'returned', remaining_debt: 0 } : invoice));
      setConfirmReturn(null);
    }
    setReturning(false);
  };

  const deleteInvoice = async (id: string) => {
    try {
      const response = await supabase
        .rpc('delete_invoice_with_items', { invoice_id_param: id });

      if (response.error) {
        showToast(`فشل الحذف: ${response.error.message}`);
      } else if (!response.data) {
        showToast('لم يتم الحذف: لا توجد صلاحية أو الفاتورة محذوفة مسبقاً');
      } else {
        showToast('تم حذف الفاتورة');
        setInvoices(prev => prev.filter(inv => inv.id !== id));
        // تحديث إضافي من القاعدة للتأكد
        await fetchInvoices();
        setConfirmDelete(null);
      }
    } catch (err: any) {
      showToast('خطأ في الاتصال');
    }
  };

  const filteredInvoices = useMemo(() => invoices.filter(inv => {
    const invDate = new Date(inv.created_at);
    const matchesSearch = inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         Boolean(inv.customer_phone?.includes(searchTerm));
    return matchesSearch;
  }), [invoices, searchTerm]);

  const exportToCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      ["التاريخ,العميل,الإجمالي"].concat(filteredInvoices.map(inv =>
        `${inv.created_at},${inv.customer_name},${inv.total_amount}`
      )).join("\n");
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = 'sales_report.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const loadInvoiceLines = async (invoice: Invoice) => {
    const { data } = await supabase.from('invoice_items').select('product_id, quantity, price, products(name)').eq('invoice_id', invoice.id);
    return (data || []).map((item: any) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      return { name: product?.name || 'مبيعات عامة', qty: Number(item.quantity || 0), price: Number(item.price || 0) };
    });
  };

  const printSingleInvoice = async (invoice: Invoice) => {
    const subtotal = Number(invoice.subtotal_amount ?? invoice.total_amount ?? 0);
    const discount = Number(invoice.discount_amount ?? 0);
    const lines = await loadInvoiceLines(invoice);
    const invoiceForPrint: InvoiceData = {
      invoiceNumber: invoice.invoice_number || invoice.id.slice(0, 8), createdAt: invoice.created_at,
      customerName: invoice.customer_name || 'عميل نقدي', customerPhone: invoice.customer_phone || undefined,
      customerType: invoice.customer_type || 'in_store', paymentType: invoice.payment_type === 'آجل' ? 'credit' : 'cash',
      lines: lines.length ? lines : (invoice.items || []).map(item => ({ name: item.name, qty: Number(item.quantity || 0), price: Number(item.price || 0) })),
      subtotal, discount: invoice.discount_mode === 'percent' && subtotal > 0 ? (discount / subtotal) * 100 : discount,
      discountMode: invoice.discount_mode || 'amount', shipping: Number(invoice.shipping_amount || 0), total: Number(invoice.total_amount || 0), currency: 'IQD',
    };
    await printInvoicePDF(invoiceForPrint, organization);
  };

  const exportToPDF = async () => {
    const total = filteredInvoices.filter(invoice => invoice.status !== 'returned').reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
    const report: ReportData = {
      title: 'تقرير المبيعات', period: periodSelection.mode === 'all' ? 'كل الفترات' : periodSelection.mode === 'daily' ? periodSelection.date : periodSelection.mode === 'monthly' ? periodSelection.month : periodSelection.mode === 'yearly' ? String(periodSelection.year) : `${periodSelection.startDate} — ${periodSelection.endDate}`, organization,
      columns: [{ label: 'التاريخ', key: 'date' }, { label: 'العميل', key: 'customer' }, { label: 'الإجمالي', key: 'total', align: 'left' }],
      rows: filteredInvoices.filter(invoice => invoice.status !== 'returned').map(invoice => ({ date: new Date(invoice.created_at).toLocaleDateString('en-US'), customer: invoice.customer_name || '-', total: `${Number(invoice.total_amount || 0).toLocaleString('en-US')} د.ع` })),
      totalLabel: 'المجموع الكلي', totalValue: `${total.toLocaleString('en-US')} د.ع`,
    };
    await printReportPDF(report);
  };


  return (
    <div className="p-8 space-y-6 bg-transparent min-h-screen text-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">سجل المبيعات</h1>
        <div className="flex flex-wrap items-center gap-2"><Button variant="outline" onClick={exportToCSV} title="تحميل CSV"><Download className="w-4 h-4" /></Button><Button variant="outline" onClick={exportToPDF}><FileText className="w-4 h-4" /> تحميل PDF</Button></div>
        <div className="relative w-64">

          <Search className="absolute right-3 top-3 w-4 h-4 text-slate-500" />
          <Input
            placeholder="بحث عن عميل أو هاتف..."
            className="pl-4 pr-10 bg-white border-slate-200/80"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <PeriodNavigator value={periodSelection} onChange={setPeriodSelection} />

      <Card className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xl">
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState title="لا توجد مبيعات بعد" description="ستظهر الفواتير هنا بعد إتمام أول عملية بيع." actionLabel="إنشاء أول فاتورة" onAction={() => { window.location.href = '/dashboard/invoicing'; }} />
          ) : (
            <div className="overflow-x-auto"><Table className="min-w-[760px] table-fixed w-full">
              <TableHeader>
                <TableRow className="border-slate-200/80 hover:bg-transparent">
                  <TableHead className="text-right px-4 py-3.5 text-slate-500">التاريخ</TableHead>
                  <TableHead className="text-right px-4 py-3.5 text-slate-500">العميل</TableHead>
                  <TableHead className="text-right px-4 py-3.5 text-slate-500">المنتجات</TableHead>
                  <TableHead className="text-right px-4 py-3.5 text-slate-500">رقم الهاتف</TableHead>
                  <TableHead className="text-right px-4 py-3.5 text-slate-500">الإجمالي</TableHead>
                  <TableHead className="text-right px-4 py-3.5 text-slate-500">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="border-slate-200/80 hover:hover:bg-slate-50">
                    <TableCell className="text-right px-4 py-3.5 text-sm"><span className="block">{formatBaghdadDateTime(inv.created_at).date}</span><span className="mt-1 block text-xs text-slate-500">{formatBaghdadDateTime(inv.created_at).time}</span></TableCell>
                    <TableCell className="text-right px-4 py-3.5 font-medium">{inv.customer_name}</TableCell>
                    <TableCell className="text-right px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(inv.items) && inv.items.length > 0 ? inv.items.map((item, idx) => (
                           <Badge key={idx} variant="secondary" className="text-xs">{item.name} ×{item.quantity}</Badge>
                        )) : <span className="text-xs text-slate-500 italic">مبيعات عامة</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-4 py-3.5 text-slate-500">{inv.customer_phone || '-'}</TableCell>
                    <TableCell className={`text-right px-4 py-3.5 font-bold ${inv.status === 'returned' ? 'text-slate-400 line-through' : 'text-[#10B981]'}`}>{Number(inv.total_amount).toLocaleString()} د.ع {inv.status === 'returned' && <Badge className="mr-2 bg-red-50 text-red-700">مرتجع</Badge>}</TableCell>
                    <TableCell className="text-right px-4 py-3.5"><div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => printSingleInvoice(inv)} className="text-blue-400" title="طباعة الفاتورة"><Printer className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={async () => { const lines = await loadInvoiceLines(inv); shareInvoiceViaWhatsApp({ invoiceNumber: inv.invoice_number || inv.id.slice(0, 8), createdAt: inv.created_at, customerName: inv.customer_name || 'عميل نقدي', customerPhone: inv.customer_phone || undefined, customerType: inv.customer_type || 'in_store', paymentType: inv.payment_type === 'آجل' ? 'credit' : 'cash', lines: lines.length ? lines : (inv.items || []).map(item => ({ name: item.name, qty: Number(item.quantity || 0), price: Number(item.price || 0) })), subtotal: Number(inv.subtotal_amount ?? inv.total_amount ?? 0), discount: Number(inv.discount_amount || 0), discountMode: inv.discount_mode || 'amount', shipping: Number(inv.shipping_amount || 0), total: Number(inv.total_amount || 0), currency: 'IQD' }, organization); }} className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" title="إرسال واتساب">إرسال واتساب</Button>
                      {inv.status !== 'returned' && <Button variant="ghost" size="sm" onClick={() => setConfirmReturn(inv.id)} className="text-rose-600" title="إرجاع الفاتورة"><RotateCcw className="w-4 h-4" /></Button>}
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(inv.id)} className="text-red-400 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                    </div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>

      {confirmReturn && (
        <div className="fixed inset-0 bg-slate-500/20 flex items-center justify-center z-50 p-4">
          <Card className="bg-white border-slate-200/80 p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-lg mb-2">تأكيد إرجاع الفاتورة</h3>
            <p className="text-slate-500 mb-6">سيُعاد المخزون إلى المخزن الأصلي ويُخصم الدين المرتبط بهذه الفاتورة.</p>
            <div className="flex gap-3 justify-end"><Button variant="ghost" onClick={() => setConfirmReturn(null)}>إلغاء</Button><Button disabled={returning} className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => void returnInvoice(confirmReturn)}>{returning ? 'جارٍ الإرجاع...' : 'تأكيد الإرجاع'}</Button></div>
          </Card>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-500/20 flex items-center justify-center z-50">
          <Card className="bg-white border-slate-200/80 p-6 w-96 shadow-2xl">
            <h3 className="font-bold text-lg mb-2">تأكيد الحذف</h3>
            <p className="text-slate-500 mb-6">هل أنت متأكد من حذف هذه الفاتورة؟</p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>إلغاء</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => deleteInvoice(confirmDelete)}>حذف نهائي</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
