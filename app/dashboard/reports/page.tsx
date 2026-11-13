'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, BarChart3 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const generatePDF = () => {
    const doc = new jsPDF();

    // استخدام خط افتراضي يدعم اللاتينية لتجنب أخطاء الخطوط العربية المعقدة
    doc.setFontSize(18);
    doc.text("Sales Report - Sanad ERP", 14, 20);

    const tableColumn = ["Date", "Invoice ID", "Amount"];
    const tableRows = [
      ["2026-11-01", "INV-001", "25,000 IQD"],
      ["2026-11-02", "INV-002", "42,000 IQD"],
      ["2026-11-03", "INV-003", "120,000 IQD"],
    ];

    // @ts-ignore
    autoTable(doc, {
      startY: 30,
      head: [tableColumn],
      body: tableRows,
    });

    doc.save("report.pdf");
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center border-b border-slate-700/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">التقارير التحليلية</h1>
          <p className="text-slate-400 text-sm mt-1">تصدير تقارير الأداء.</p>
        </div>
        <Button onClick={generatePDF} className="bg-[#FF6B5B] hover:bg-[#FF6B5B]/90 text-white font-bold">
          <FileDown className="ml-2 w-4 h-4" /> تحميل التقرير (PDF)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#1E293B] border border-slate-700/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#10B981]" />
              ملخص الأداء
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-slate-300">
              <span>إجمالي المبيعات:</span>
              <span className="font-bold text-white">187,000 د.ع</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>عدد الفواتير:</span>
              <span className="font-bold text-white">3 فواتير</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
