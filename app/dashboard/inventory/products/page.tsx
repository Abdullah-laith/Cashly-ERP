'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from('products').select('*');
    setProducts(data || []);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    const name = prompt('اسم المنتج:');
    if (!name) return;
    await supabase.from('products').insert([{ name, sell_price: 0, cost_price: 0, quantity: 0 }]);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('هل أنت متأكد؟')) return;
    await supabase.from('products').delete().eq('id', id);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">المنتجات</h1>
        <Button onClick={add} className="bg-[#FF685B] text-white"><Plus className="w-4 h-4 ml-2" /> إضافة</Button>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>الكمية</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.sell_price}</TableCell>
                <TableCell>{p.quantity}</TableCell>
                <TableCell><Button variant="ghost" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
