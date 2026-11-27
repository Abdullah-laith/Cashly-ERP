'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface Debt {
  id: string;
  customer_name: string;
  customer_phone: string;
  remaining_debt: number;
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('id, customer_name, customer_phone, remaining_debt')
      .gt('remaining_debt', 0);
    if (data) setDebts(data);
  };

  const settleDebt = async (id: string) => {
    const { error } = await supabase
      .from('invoices')
      .update({ remaining_debt: 0 })
      .eq('id', id);

    if (!error) {
      alert('تم سداد الدين بنجاح');
      fetchDebts();
    }
  };

  return (
    <div className="p-8 space-y-6 bg-[#F3F5F9] min-h-screen text-slate-900">
      <h1 className="text-3xl font-bold">إدارة الديون والزبائن</h1>
      <Card className="bg-white border-slate-200/80">
        <CardHeader><CardTitle>قائمة الزبائن المدينين</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200/80">
                <TableHead>الزبون</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>المبلغ المتبقي</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.map(d => (
                <TableRow key={d.id} className="border-slate-200/80">
                  <TableCell>{d.customer_name}</TableCell>
                  <TableCell>{d.customer_phone}</TableCell>
                  <TableCell className="text-[#FF6B5B] font-bold">{d.remaining_debt.toLocaleString()} د.ع</TableCell>
                  <TableCell>
                    <Button size="sm" className="bg-gradient-to-r from-orange-500 to-amber-500 text-white" onClick={() => settleDebt(d.id)}>سداد كامل</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
