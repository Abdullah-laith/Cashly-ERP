'use client';
import { useState, useEffect } from 'react';
import { getVouchers } from '@/lib/finance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';

export default function ExpensesPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    const data = await getVouchers('expense');
    setVouchers(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إدارة المصروفات / سندات الصرف</h1>
        <Button className="bg-[#FF685B] text-white">
          <Plus className="ml-2 w-4 h-4" /> سند صرف جديد
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>رقم السند</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead>الجهة</TableHead>
            <TableHead>المبلغ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vouchers.map((v) => (
            <TableRow key={v.id}>
              <TableCell>{v.id}</TableCell>
              <TableCell>{new Date(v.created_at).toLocaleDateString('ar-IQ')}</TableCell>
              <TableCell>{v.account_name}</TableCell>
              <TableCell>{v.amount.toLocaleString()} د.ع</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
