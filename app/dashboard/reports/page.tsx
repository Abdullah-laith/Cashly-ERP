'use client';
import { useState, useEffect } from 'react';
import { getSalesSummary } from '@/lib/reports';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    getSalesSummary(`${today}T00:00:00Z`, `${today}T23:59:59Z`).then(setData);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-bold">مركز التقارير الشامل</h1>
        <Button onClick={() => window.print()}>طباعة التقرير</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader><CardTitle>ملخص مبيعات اليوم</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{data.reduce((a, b) => a + Number(b.total_amount), 0).toLocaleString()} د.ع</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
