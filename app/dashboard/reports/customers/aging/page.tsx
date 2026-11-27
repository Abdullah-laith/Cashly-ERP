'use client';
import { useState, useEffect } from 'react';
import { getAgingReport } from '@/lib/reports_advanced';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { printReportPDF } from '@/lib/print-engine';
import { useOrganization } from '@/components/organization-provider';

export default function AgingReportPage() {
  const [data, setData] = useState<any[]>([]);
  const { organization } = useOrganization();
  const printReport = () => void printReportPDF({ title: 'تقرير أعمار الديون', period: 'الحالي', organization, columns: [{ label: 'العميل', key: 'name' }, { label: 'الرصيد', key: 'balance', align: 'left' }, { label: 'الفئة العمرية', key: 'ageGroup', align: 'center' }], rows: data.map(d => ({ name: d.name, balance: `${Number(d.balance || 0).toLocaleString('en-US')} د.ع`, ageGroup: d.ageGroup })), totalLabel: 'إجمالي الأرصدة', totalValue: `${data.reduce((sum, d) => sum + Number(d.balance || 0), 0).toLocaleString('en-US')} د.ع` });

  useEffect(() => {
    getAgingReport().then(setData);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">تقرير أعمار الديون (Aging Report)</h1>
        <Button onClick={printReport}>طباعة</Button>
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
