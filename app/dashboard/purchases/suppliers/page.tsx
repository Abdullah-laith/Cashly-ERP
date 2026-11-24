'use client';
import { useState, useEffect } from 'react';
import { getSuppliers } from '@/lib/suppliers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const data = await getSuppliers();
    setSuppliers(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إدارة الموردين</h1>
        <Button onClick={() => router.push('/dashboard/purchases/suppliers/new')} className="bg-[#FF685B] text-white">
          <Plus className="ml-2 w-4 h-4" /> إضافة مورد جديد
        </Button>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>رقم الهاتف</TableHead>
              <TableHead>الرصيد</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.phone}</TableCell>
                <TableCell className={s.balance < 0 ? 'text-red-500' : 'text-emerald-500'}>
                  {s.balance?.toLocaleString()} د.ع
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/purchases/suppliers/${s.id}`)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
