'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ShoppingBag } from 'lucide-react';

export default function PurchasesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [newPurchase, setNewPurchase] = useState({ supplier: '', product_id: '', qty: 0, cost: 0 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: p } = await supabase.from('products').select('id, name');
    if (p) setProducts(p);
    const { data: pur } = await supabase.from('purchases').select('*');
    if (pur) setPurchases(pur);
  };

  const registerPurchase = async () => {
    if (!newPurchase.supplier || !newPurchase.product_id || newPurchase.qty <= 0) return alert('يرجى إكمال بيانات الشراء');

    // 1. تسجيل الفاتورة
    const { data: pData, error: pErr } = await supabase.from('purchases').insert([{
      supplier_name: newPurchase.supplier,
      total_cost: newPurchase.qty * newPurchase.cost
    }]).select().single();

    if (pErr) return alert('خطأ في تسجيل المشتريات');

    // 2. تحديث المخزون
    const product = products.find(p => p.id === newPurchase.product_id);
    await supabase.from('products').update({
      quantity: (product?.quantity || 0) + newPurchase.qty,
      cost_price: newPurchase.cost
    }).eq('id', newPurchase.product_id);

    setNewPurchase({ supplier: '', product_id: '', qty: 0, cost: 0 });
    fetchData();
    alert('تم إضافة البضاعة للمخزن بنجاح!');
  };

  return (
    <div className="p-8 space-y-8 bg-[#0F172A] min-h-screen text-slate-100">
      <h1 className="text-3xl font-bold">سجل المشتريات والمخزون</h1>

      <Card className="bg-[#1E293B] border-slate-700 p-6">
        <h2 className="text-lg font-bold mb-4">تسجيل فاتورة شراء جديدة</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Input placeholder="اسم المورد" value={newPurchase.supplier} onChange={e => setNewPurchase({...newPurchase, supplier: e.target.value})} />
          <select className="bg-[#0B1120] border-slate-700 rounded-md px-2" onChange={e => setNewPurchase({...newPurchase, product_id: e.target.value})}>
            <option value="">اختر المنتج</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Input type="number" placeholder="الكمية" value={newPurchase.qty} onChange={e => setNewPurchase({...newPurchase, qty: Number(e.target.value)})} />
          <Input type="number" placeholder="سعر التكلفة" value={newPurchase.cost} onChange={e => setNewPurchase({...newPurchase, cost: Number(e.target.value)})} />
          <Button onClick={registerPurchase} className="bg-[#10B981]"><Plus className="w-4 h-4 mr-2"/> إضافة للمخزن</Button>
        </div>
      </Card>

      <Table className="bg-[#1E293B] border border-slate-700 rounded-xl">
        <TableHeader><TableRow className="border-slate-700"><TableHead>المورد</TableHead><TableHead>التكلفة الإجمالية</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
        <TableBody>
          {purchases.map(p => (
            <TableRow key={p.id} className="border-slate-700">
              <TableCell>{p.supplier_name}</TableCell>
              <TableCell className="font-bold">{p.total_cost.toLocaleString()} د.ع</TableCell>
              <TableCell>{new Date(p.created_at).toLocaleDateString('ar-IQ')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
