'use client';
import { useState, useEffect } from 'react';
import { getGeneralLedger } from '@/lib/accounting';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';

export default function AccountingPage() {
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    loadLedger();
  }, []);

  const loadLedger = async () => {
    const data = await getGeneralLedger();
    setEntries(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">القيود اليومية</h1>
        <Button className="bg-[#FF685B] text-white">
          <Plus className="ml-2 w-4 h-4" /> قيد جديد
        </Button>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>البيان</TableHead>
              <TableHead>الطرف المدين</TableHead>
              <TableHead>الطرف الدائن</TableHead>
              <TableHead>المبلغ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{new Date(e.created_at).toLocaleDateString('ar-IQ')}</TableCell>
                <TableCell>{e.description}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>{e.total_amount?.toLocaleString()} د.ع</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
