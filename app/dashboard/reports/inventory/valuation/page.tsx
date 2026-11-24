'use client';
import { useState, useEffect } from 'react';
import { getInventoryValuation } from '@/lib/inventory_reports';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function InventoryReportPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    getInventoryValuation().then(setData);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">ورقة جرد المخزون</h1>
        <Button onClick={() => window.print()}>طباعة</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المنتج</TableHead>
            <TableHead>الرمز</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>القيمة التقديرية</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d, i) => (
            <TableRow key={i}>
              <TableCell>{d.name}</TableCell>
              <TableCell>{d.code}</TableCell>
              <TableCell>{d.qty}</TableCell>
              <TableCell>{d.totalValue.toLocaleString()} د.ع</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
