'use client';
import { useState, useEffect } from 'react';
import { getCurrencies, updateExchangeRate } from '@/lib/settings';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CurrencySettingsPage() {
  const [currencies, setCurrencies] = useState<any[]>([]);

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    const data = await getCurrencies();
    setCurrencies(data);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">إعدادات العملات</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>العملة</TableHead>
            <TableHead>سعر الصرف الحالي</TableHead>
            <TableHead>تحديث</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currencies.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.rate || 1}</TableCell>
              <TableCell><Button size="sm">تحديث</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
