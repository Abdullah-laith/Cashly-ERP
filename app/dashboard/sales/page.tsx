'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast-provider';

interface Invoice {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  created_at: string;
  deleted_at: string | null;
}

export default function SalesHistoryPage() {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
    const { error } = await supabase
      .from('invoices')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      showToast('تم حذف الفاتورة بنجاح');
      fetchInvoices();
      setConfirmDelete(null);
    } else {
      showToast('خطأ في الحذف: ' + error.message);
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.customer_phone?.includes(searchTerm))
  );

  return (
    <div className="p-8 space-y-6 bg-[#0F172A] min-h-screen text-slate-100">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">سجل المبيعات</h1>
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

      <Card className="bg-[#1E293B] border-slate-700 shadow-xl">
        <CardHeader><CardTitle className="text-slate-200">الفواتير المسجلة</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-10 text-slate-400">جاري التحميل...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-400">التاريخ</TableHead>
                  <TableHead className="text-slate-400">العميل</TableHead>
                  <TableHead className="text-slate-400">رقم الهاتف</TableHead>
                  <TableHead className="text-right text-slate-400">الإجمالي</TableHead>
                  <TableHead className="text-center text-slate-400">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="border-slate-700/50 hover:bg-slate-800/50">
                    <TableCell className="text-sm">{new Date(inv.created_at).toLocaleDateString('ar-IQ')}</TableCell>
                    <TableCell className="font-medium">{inv.customer_name}</TableCell>
                    <TableCell className="text-slate-400">{inv.customer_phone || '-'}</TableCell>
                    <TableCell className="text-right font-bold text-[#10B981]">{Number(inv.total_amount).toLocaleString()} د.ع</TableCell>
                    <TableCell className="text-center">
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
