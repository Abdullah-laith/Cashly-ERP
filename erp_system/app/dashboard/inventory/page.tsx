'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Trash2, Box, Minus, AlertTriangle, Check } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sell_price: number;
  cost_price: number;
  quantity: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', cost_price: 0, sell_price: 0, quantity: 0 });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*');
    if (data) setProducts(data);
  };

  const handleUpdate = async (id: string, field: keyof Product, value: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    await supabase.from('products').update({ [field]: value }).eq('id', id);
    showNotification('تم تحديث البيانات');
  };

  const addProduct = async () => {
    await supabase.from('products').insert([newProduct]);
    setIsAdding(false);
    setNewProduct({ name: '', cost_price: 0, sell_price: 0, quantity: 0 });
    fetchProducts();
    showToast('تم إضافة المنتج بنجاح');
  };

  const deleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
    setConfirmDelete(null);
    showToast('تم حذف المنتج');
  };

  const showNotification = (msg: string) => {
      // Inline notification logic
      setToast(msg);
      setTimeout(() => setToast(null), 2000);
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalCost = products.reduce((acc, p) => acc + (p.cost_price * p.quantity), 0);
  const totalValue = products.reduce((acc, p) => acc + (p.sell_price * p.quantity), 0);
  const lowStock = products.filter(p => p.quantity < 5).length;

  return (
    <div className="p-8 bg-[#0F172A] min-h-screen text-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-900/60 border-slate-800"><CardContent className="p-4"><p className="text-xs text-slate-400">إجمالي المواد</p><p className="text-2xl font-bold">{products.length}</p></CardContent></Card>
        <Card className="bg-slate-900/60 border-slate-800"><CardContent className="p-4"><p className="text-xs text-slate-400">رأس مال المخزن</p><p className="text-lg font-bold text-blue-400">{totalCost.toLocaleString()} د.ع</p></CardContent></Card>
        <Card className="bg-slate-900/60 border-slate-800"><CardContent className="p-4"><p className="text-xs text-slate-400">قيمة المبيعات المتوقعة</p><p className="text-lg font-bold text-emerald-400">{totalValue.toLocaleString()} د.ع</p></CardContent></Card>
        <Card className="bg-slate-900/60 border-slate-800"><CardContent className="p-4"><p className="text-xs text-slate-400">مواد قاربت على النفاد</p><p className="text-2xl font-bold text-rose-500">{lowStock}</p></CardContent></Card>
      </div>

      <div className="flex items-center justify-between mb-6">
        <Input placeholder="بحث عن منتج..." className="w-64 bg-slate-900 border-slate-800" onChange={e => setSearchTerm(e.target.value)} />
        <Button className="bg-[#10B981]" onClick={() => setIsAdding(!isAdding)}><Plus className="w-4 h-4 mr-2"/> إضافة منتج جديد</Button>
      </div>

      {isAdding && (
        <Card className="mb-6 bg-slate-900 border-slate-800 p-4 flex gap-4">
          <Input placeholder="اسم المنتج" onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
          <Input type="number" placeholder="التكلفة" onChange={e => setNewProduct({...newProduct, cost_price: Number(e.target.value)})} />
          <Input type="number" placeholder="البيع" onChange={e => setNewProduct({...newProduct, sell_price: Number(e.target.value)})} />
          <Input type="number" placeholder="الكمية" onChange={e => setNewProduct({...newProduct, quantity: Number(e.target.value)})} />
          <Button onClick={addProduct}>حفظ</Button>
        </Card>
      )}

      <div className="border border-slate-800 bg-slate-900/60 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-950/80 text-slate-400">
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="px-6 py-4 text-right">اسم المنتج</TableHead>
              <TableHead className="px-6 py-4 text-right">التكلفة</TableHead>
              <TableHead className="px-6 py-4 text-right">سعر البيع</TableHead>
              <TableHead className="px-6 py-4 text-right">الربح</TableHead>
              <TableHead className="px-6 py-4 text-right">الكمية</TableHead>
              <TableHead className="px-6 py-4 text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.id} className="border-slate-800">
                <TableCell className="px-6 py-4 font-bold flex items-center gap-2"><Box className="w-4 h-4 text-blue-500" />{p.name}</TableCell>
                <TableCell className="px-6 py-4 font-mono">{p.cost_price.toLocaleString()} د.ع</TableCell>
                <TableCell className="px-6 py-4 font-mono text-emerald-400">{p.sell_price.toLocaleString()} د.ع</TableCell>
                <TableCell className="px-6 py-4"><span className="bg-slate-800 px-2 py-1 rounded text-xs">{(p.sell_price - p.cost_price).toLocaleString()} د.ع</span></TableCell>
                <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => handleUpdate(p.id, 'quantity', p.quantity - 1)}><Minus className="w-3 h-3"/></Button>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${p.quantity === 0 ? 'bg-red-900 text-red-300' : p.quantity < 5 ? 'bg-orange-900 text-orange-300' : 'bg-emerald-900 text-emerald-300'}`}>{p.quantity === 0 ? 'نافد' : p.quantity}</span>
                        <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => handleUpdate(p.id, 'quantity', p.quantity + 1)}><Plus className="w-3 h-3"/></Button>
                    </div>
                </TableCell>
                <TableCell className="px-6 py-4"><Button variant="ghost" className="text-red-500" onClick={() => setConfirmDelete(p.id)}><Trash2 className="w-4 h-4"/></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <Card className="bg-slate-900 border-slate-700 p-6 w-96 shadow-2xl">
            <h3 className="font-bold text-lg mb-2">تأكيد الحذف</h3>
            <p className="text-slate-400 mb-6">هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>إلغاء</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => deleteProduct(confirmDelete)}>حذف نهائي</Button>
            </div>
          </Card>
        </div>
      )}

      {toast && (
          <div className="fixed bottom-8 left-8 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
              <Check className="w-4 h-4" /> {toast}
          </div>
      )}
    </div>
  );
}
