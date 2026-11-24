'use client';
import { useState, useEffect } from 'react';
import { getAgingReport } from '@/lib/reports_advanced';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function AgingReportPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    getAgingReport().then(setData);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">تقرير أعمار الديون (Aging Report)</h1>
        <Button onClick={() => window.print()}>طباعة</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>العميل</TableHead>
            <TableHead>الرصيد</TableHead>
            <TableHead>الفئة العمرية</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d, i) => (
            <TableRow key={i}>
              <TableCell>{d.name}</TableCell>
              <TableCell>{d.balance.toLocaleString()}</TableCell>
              <TableCell>{d.ageGroup}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
