'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function InstallmentsPage() {
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('installments').select('*, customers(name)').then(({ data }) => setPlans(data || []));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">إدارة التقسيط</h1>
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العميل</TableHead>
              <TableHead>إجمالي المبلغ</TableHead>
              <TableHead>عدد الأقساط</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.customers?.name}</TableCell>
                <TableCell>{p.total_amount.toLocaleString()} د.ع</TableCell>
                <TableCell>{p.installments_count}</TableCell>
                <TableCell>{p.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
