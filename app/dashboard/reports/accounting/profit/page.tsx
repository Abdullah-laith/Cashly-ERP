'use client';
import { useState, useEffect } from 'react';
import { getProfitReport } from '@/lib/reports_comprehensive';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function ProfitReportPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    getProfitReport(`${today}T00:00:00Z`, `${today}T23:59:59Z`).then(setData);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">تقرير الأرباح والخسائر</h1>
        <Button onClick={() => window.print()}>طباعة</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الفاتورة</TableHead>
            <TableHead>صافي المبيعات</TableHead>
            <TableHead>التكلفة</TableHead>
            <TableHead>الربح</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d, i) => (
            <TableRow key={i}>
              <TableCell>{d.invoice_number}</TableCell>
              <TableCell>{d.sales.toLocaleString()} د.ع</TableCell>
              <TableCell>{d.cost.toLocaleString()} د.ع</TableCell>
              <TableCell className="text-emerald-500 font-bold">{(d.sales - d.cost).toLocaleString()} د.ع</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
