'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function CashClosingPage() {
  const [report, setReport] = useState({ salesCash: 0, debtsCollected: 0, expenses: 0, netCash: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    // 1. مبيعات الكاش اليوم
    const { data: sales } = await supabase.from('invoices')
      .select('total_amount, remaining_debt')
      .eq('payment_type', 'cash')
      .gte('created_at', today);

    // 2. المصاريف اليوم
    const { data: expenses } = await supabase.from('expenses')
      .select('amount')
      .gte('created_at', today);

    const salesCash = sales?.reduce((s, i) => s + Number(i.total_amount), 0) || 0;
    const expTotal = expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;

    setReport({
      salesCash,
      debtsCollected: 0, // يحتاج جدول دفعات الديون لاحقاً
      expenses: expTotal,
      netCash: salesCash - expTotal
    });
    setLoading(false);
  };

  return (
    <div className="p-8 space-y-6 bg-[#0F172A] min-h-screen text-slate-100">
      <h1 className="text-3xl font-bold">تقفيل الصندوق اليومي</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#1E293B] border-slate-700">
          <CardHeader><CardTitle>ملخص الحركة النقدية لهذا اليوم</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b border-slate-700"><span>مبيعات نقدي:</span> <span className="font-bold text-[#10B981]">{report.salesCash.toLocaleString()} د.ع</span></div>
            <div className="flex justify-between py-2 border-b border-slate-700"><span>المصاريف:</span> <span className="font-bold text-[#EF4444]">{report.expenses.toLocaleString()} د.ع</span></div>
            <div className="flex justify-between py-2 text-xl font-bold"><span>صافي الصندوق:</span> <span className="text-white">{report.netCash.toLocaleString()} د.ع</span></div>
            <Button className="w-full bg-blue-600 mt-4"><Printer className="w-4 h-4 mr-2"/> طباعة التقرير</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
