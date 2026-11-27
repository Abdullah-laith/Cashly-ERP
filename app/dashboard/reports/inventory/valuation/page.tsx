'use client';
import { useState, useEffect } from 'react';
import { getInventoryValuation } from '@/lib/inventory_reports';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { printReportPDF } from '@/lib/print-engine';
import { useOrganization } from '@/components/organization-provider';

export default function InventoryReportPage() {
  const [data, setData] = useState<any[]>([]);
  const { organization } = useOrganization();
  const printReport = () => void printReportPDF({ title: 'ورقة جرد المخزون', period: 'الحالي', organization, columns: [{ label: 'المنتج', key: 'name' }, { label: 'الرمز', key: 'code' }, { label: 'الكمية', key: 'qty', align: 'center' }, { label: 'القيمة التقديرية', key: 'totalValue', align: 'left' }], rows: data.map(d => ({ name: d.name, code: d.code || '—', qty: Number(d.qty || 0).toLocaleString('en-US'), totalValue: `${Number(d.totalValue || 0).toLocaleString('en-US')} د.ع` })), totalLabel: 'إجمالي القيمة', totalValue: `${data.reduce((sum, d) => sum + Number(d.totalValue || 0), 0).toLocaleString('en-US')} د.ع` });

  useEffect(() => {
    getInventoryValuation().then(setData);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">ورقة جرد المخزون</h1>
        <Button onClick={printReport}>طباعة</Button>
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
