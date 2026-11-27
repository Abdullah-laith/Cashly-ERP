'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Search, ChevronLeft, ChevronRight, Download, Eye, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast-provider';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/components/organization-provider';
import { printInvoicePDF, type InvoiceData } from '@/lib/print-invoice';

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
}

export default function SalesHistoryPage() {
  const { showToast } = useToast();
  const { organization } = useOrganization();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  useEffect(() => {
    setSelectedMonth(new Date());
    const q0 = new URLSearchParams(window.location.search).get('q');
    if (q0) setSearchTerm(q0);
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
    } else if (data) {
      setInvoices(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

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
    const matchesMonth = !selectedMonth || (invDate.getMonth() === selectedMonth.getMonth() && invDate.getFullYear() === selectedMonth.getFullYear());
    return matchesSearch && matchesMonth;
  }), [invoices, searchTerm, selectedMonth]);

  const changeMonth = (offset: number) => {
    if (!selectedMonth) return;
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedMonth(newDate);
  };

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

  const printSingleInvoice = (invoice: Invoice) => {
    const subtotal = Number(invoice.subtotal_amount ?? invoice.total_amount ?? 0);
    const discount = Number(invoice.discount_amount ?? 0);
    const invoiceForPrint: InvoiceData = {
      invoiceNumber: invoice.invoice_number || invoice.id.slice(0, 8),
      createdAt: invoice.created_at,
      customerName: invoice.customer_name || 'عميل نقدي',
      customerPhone: invoice.customer_phone || undefined,
      customerType: invoice.customer_type || 'in_store',
      paymentType: invoice.payment_type === 'آجل' ? 'credit' : 'cash',
      lines: (invoice.items || []).map(item => ({ name: item.name, qty: Number(item.quantity || 0), price: Number(item.price || 0) })),
      subtotal,
      discount: invoice.discount_mode === 'percent' && subtotal > 0 ? (discount / subtotal) * 100 : discount,
      discountMode: invoice.discount_mode || 'amount',
      shipping: Number(invoice.shipping_amount || 0),
      total: Number(invoice.total_amount || 0),
      currency: 'IQD',
    };
    void printInvoicePDF(invoiceForPrint, organization);
  };

  const exportToPDF = () => {
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
    const total = filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
    const rows = filteredInvoices.map(invoice => `<tr><td>${escapeHtml(new Date(invoice.created_at).toLocaleDateString('ar-IQ'))}</td><td>${escapeHtml(invoice.customer_name || '-')}</td><td>${Number(invoice.total_amount || 0).toLocaleString('ar-IQ')} د.ع</td></tr>`).join('');
    const report = `<html dir="rtl"><head><meta charset="utf-8"><title>تقرير المبيعات</title><style>@page{margin:8mm}body{font-family:Arial,sans-serif;color:#000;background:#fff;direction:rtl}h1{text-align:center;margin:0 0 8px}p{text-align:center;margin:4px 0}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #000;padding:8px;text-align:right}th{background:#eee}.total{margin-top:16px;font-weight:bold}</style></head><body><h1>${escapeHtml(organization.business_name)}</h1><p>تقرير المبيعات</p><p>تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-IQ')}</p><table><thead><tr><th>التاريخ</th><th>العميل</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table><p class="total">المجموع الكلي: ${total.toLocaleString('ar-IQ')} د.ع</p><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`;
    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) return showToast('تعذر فتح نافذة الطباعة، اسمح بالنوافذ المنبثقة أولاً');
    popup.document.write(report);
    popup.document.close();
  };


  return (
    <div className="p-8 space-y-6 bg-transparent min-h-screen text-slate-900">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">سجل المبيعات</h1>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={() => changeMonth(-1)}><ChevronLeft className="w-4 h-4"/></Button>
           <span className="font-bold">{selectedMonth ? `${selectedMonth.getFullYear()}/${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}` : '...'}</span>
           <Button variant="outline" onClick={() => changeMonth(1)}><ChevronRight className="w-4 h-4"/></Button>
           <Button variant="outline" onClick={() => setSelectedMonth(null as any)}>عرض الكل</Button>
           <Button variant="outline" onClick={exportToCSV} title="تحميل CSV"><Download className="w-4 h-4" /></Button>
           <Button variant="outline" onClick={exportToPDF}><FileText className="w-4 h-4" /> تحميل الكل PDF</Button>
        </div>
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

      <Card className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xl">
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-10 text-slate-500">جاري التحميل...</p>
          ) : (
            <Table className="table-fixed w-full">
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
                    <TableCell className="text-right px-4 py-3.5 text-sm">{new Date(inv.created_at).toISOString().split('T')[0].replace(/-/g, '/')}</TableCell>
                    <TableCell className="text-right px-4 py-3.5 font-medium">{inv.customer_name}</TableCell>
                    <TableCell className="text-right px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(inv.items) && inv.items.length > 0 ? inv.items.map((item, idx) => (
                           <Badge key={idx} variant="secondary" className="text-xs">{item.name} ×{item.quantity}</Badge>
                        )) : <span className="text-xs text-slate-500 italic">مبيعات عامة</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-4 py-3.5 text-slate-500">{inv.customer_phone || '-'}</TableCell>
                    <TableCell className="text-right px-4 py-3.5 font-bold text-[#10B981]">{Number(inv.total_amount).toLocaleString()} د.ع</TableCell>
                    <TableCell className="text-right px-4 py-3.5 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => printSingleInvoice(inv)} className="text-blue-400" title="طباعة الفاتورة">
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(inv.id)} className="text-red-400 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
