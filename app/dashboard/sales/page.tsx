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

interface Product {
  name: string;
  quantity: number;
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
}

export default function SalesHistoryPage() {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  useEffect(() => {
    setSelectedMonth(new Date());
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
        .from('invoices')
        .delete()
        .eq('id', id);

      if (response.error) {
        console.error('Supabase Error:', response.error);
        showToast(`خطأ ${response.error.code}: ${response.error.message}`);
      } else {
        showToast('تم حذف الفاتورة بنجاح');
        setInvoices(prev => prev.filter(inv => inv.id !== id));
        window.dispatchEvent(new Event('invoiceDeleted'));
        setConfirmDelete(null);
      }
    } catch (err: any) {
      console.error('Catch Error:', err);
      showToast('حدث خطأ غير متوقع، راجع Console المتصفح');
    }
  };

  const filteredInvoices = useMemo(() => {
    if (!selectedMonth) return invoices;
    return invoices.filter(inv => {
      const invDate = new Date(inv.created_at);
      const matchesSearch = inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (inv.customer_phone?.includes(searchTerm));
      const matchesMonth = invDate.getMonth() === selectedMonth.getMonth() &&
                           invDate.getFullYear() === selectedMonth.getFullYear();
      return matchesSearch && matchesMonth;
    });
  }, [invoices, searchTerm, selectedMonth]);

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
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sales_report.csv");
    document.body.appendChild(link);
    link.click();
  };


  return (
    <div className="p-8 space-y-6 bg-[#0F172A] min-h-screen text-slate-100">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">سجل المبيعات</h1>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={() => changeMonth(-1)}><ChevronLeft className="w-4 h-4"/></Button>
           <span className="font-bold">{selectedMonth ? `${selectedMonth.getFullYear()}/${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}` : '...'}</span>
           <Button variant="outline" onClick={() => changeMonth(1)}><ChevronRight className="w-4 h-4"/></Button>
           <Button variant="outline" onClick={() => setSelectedMonth(null as any)}>عرض الكل</Button>
           <Button variant="outline" onClick={exportToCSV}><Download className="w-4 h-4" /></Button>
        </div>
        <div className="relative w-64">

          <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder="بحث عن عميل أو هاتف..."
            className="pl-4 pr-10 bg-[#1E293B] border-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-10 text-slate-400">جاري التحميل...</p>
          ) : (
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-right px-4 py-3.5 text-slate-400">التاريخ</TableHead>
                  <TableHead className="text-right px-4 py-3.5 text-slate-400">العميل</TableHead>
                  <TableHead className="text-right px-4 py-3.5 text-slate-400">المنتجات</TableHead>
                  <TableHead className="text-right px-4 py-3.5 text-slate-400">رقم الهاتف</TableHead>
                  <TableHead className="text-right px-4 py-3.5 text-slate-400">الإجمالي</TableHead>
                  <TableHead className="text-right px-4 py-3.5 text-slate-400">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="text-right px-4 py-3.5 text-sm">{new Date(inv.created_at).toISOString().split('T')[0].replace(/-/g, '/')}</TableCell>
                    <TableCell className="text-right px-4 py-3.5 font-medium">{inv.customer_name}</TableCell>
                    <TableCell className="text-right px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(inv.items) && inv.items.length > 0 ? inv.items.map((item, idx) => (
                           <Badge key={idx} variant="secondary" className="text-xs">{item.name} ×{item.quantity}</Badge>
                        )) : <span className="text-xs text-slate-500 italic">مبيعات عامة</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-4 py-3.5 text-slate-400">{inv.customer_phone || '-'}</TableCell>
                    <TableCell className="text-right px-4 py-3.5 font-bold text-[#10B981]">{Number(inv.total_amount).toLocaleString()} د.ع</TableCell>
                    <TableCell className="text-right px-4 py-3.5 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => window.print()} className="text-blue-400">
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(inv.id)} className="text-red-400 hover:text-red-300">
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <Card className="bg-slate-900 border-slate-700 p-6 w-96 shadow-2xl">
            <h3 className="font-bold text-lg mb-2">تأكيد الحذف</h3>
            <p className="text-slate-400 mb-6">هل أنت متأكد من حذف هذه الفاتورة؟</p>
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
