'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

type Product = { id: string; name: string; serial_number: string | null; sell_price: number | null; quantity: number | null; cost_price: number | null };
type Warehouse = { id: string; name: string; is_default: boolean };
type Stock = { product_id: string; warehouse_id: string; quantity: number };
type ProductForm = { name: string; serial_number: string; sell_price: string; cost_price: string; quantity: string; warehouseId: string };
const emptyForm: ProductForm = { name: '', serial_number: '', sell_price: '0', cost_price: '0', quantity: '0', warehouseId: '' };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('all');
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    const [{ data, error }, { data: warehouseData, error: warehouseError }, { data: stockData, error: stockError }] = await Promise.all([
      supabase.from('products').select('id, name, serial_number, sell_price, cost_price, quantity').order('created_at', { ascending: false }),
      supabase.from('warehouses').select('id, name, is_default').order('name'),
      supabase.from('product_warehouse_stock').select('product_id, warehouse_id, quantity'),
    ]);
    if (error || warehouseError || stockError) throw error || warehouseError || stockError;
    setProducts((data || []) as Product[]);
    setWarehouses((warehouseData || []) as Warehouse[]);
    setStocks((stockData || []).map(stock => ({ ...stock, quantity: Number(stock.quantity || 0) })) as Stock[]);
    setForm(current => current.warehouseId || !warehouseData?.length ? current : { ...current, warehouseId: (warehouseData.find(warehouse => warehouse.is_default) || warehouseData[0]).id });
  };

  useEffect(() => { load().catch((error) => setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر تحميل المنتجات' })); }, []);

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm, warehouseId: selectedWarehouseId === 'all' ? (warehouses.find(warehouse => warehouse.is_default) || warehouses[0])?.id || '' : selectedWarehouseId }); setMessage(null); setShowForm(true); };
  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({ name: product.name, serial_number: product.serial_number || '', sell_price: String(product.sell_price ?? 0), cost_price: String(product.cost_price ?? 0), quantity: String(product.quantity ?? 0), warehouseId: selectedWarehouseId === 'all' ? (warehouses.find(warehouse => warehouse.is_default) || warehouses[0])?.id || '' : selectedWarehouseId });
    setMessage(null);
    setShowForm(true);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) { setMessage({ type: 'error', text: 'اكتب اسم المنتج أولاً' }); return; }
    if (!form.warehouseId) { setMessage({ type: 'error', text: 'اختر المخزن أولاً' }); return; }
    const payload = { name: form.name.trim(), serial_number: form.serial_number.trim() || null, sell_price: Number(form.sell_price) || 0, cost_price: Number(form.cost_price) || 0 };
    const quantity = Number(form.quantity) || 0;
    setSaving(true); setMessage(null);
    try {
      let productId = editingId;
      if (editingId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert({ ...payload, quantity }).select('id').single();
        if (error) throw error;
        productId = data.id;
      }
      const { error: stockError } = await supabase.from('product_warehouse_stock').upsert({ product_id: productId, warehouse_id: form.warehouseId, quantity, avg_cost: payload.cost_price }, { onConflict: 'product_id,warehouse_id' });
      if (stockError) throw stockError;
      const { error: syncError } = await supabase.rpc('sync_product_total', { product_id_param: productId });
      if (syncError) throw syncError;
      setForm(emptyForm); setEditingId(null); setShowForm(false); await load(); setMessage({ type: 'success', text: editingId ? 'تم تعديل المنتج بنجاح' : 'تمت إضافة المنتج بنجاح' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر حفظ المنتج' });
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف المنتج؟')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { setMessage({ type: 'error', text: error.message }); return; }
    setProducts((current) => current.filter((product) => product.id !== id));
    setMessage({ type: 'success', text: 'تم حذف المنتج' });
  };

  return (
    <div dir="rtl" className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-bold">المنتجات</h1><Button type="button" onClick={openCreate} className="bg-[#FF685B] text-white"><Plus className="ml-2 h-4 w-4" /> إضافة منتج</Button></div>
      <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-2"><Button type="button" variant={selectedWarehouseId === 'all' ? 'default' : 'outline'} onClick={() => setSelectedWarehouseId('all')} className={selectedWarehouseId === 'all' ? 'bg-orange-500 text-white' : ''}>كل المخازن</Button>{warehouses.map(warehouse => <Button type="button" key={warehouse.id} variant={selectedWarehouseId === warehouse.id ? 'default' : 'outline'} onClick={() => setSelectedWarehouseId(warehouse.id)} className={selectedWarehouseId === warehouse.id ? 'bg-orange-500 text-white' : ''}>{warehouse.name} ({stocks.filter(stock => stock.warehouse_id === warehouse.id).reduce((sum, stock) => sum + stock.quantity, 0).toLocaleString()})</Button>)}</div>
      {message && <p role="status" className={message.type === 'error' ? 'text-sm text-red-500' : 'text-sm text-emerald-500'}>{message.text}</p>}
      {showForm && <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">{editingId ? 'تعديل المنتج' : 'إضافة منتج'}</h2><Button type="button" variant="ghost" size="icon" aria-label="إغلاق" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"><Input placeholder="اسم المنتج" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><Input placeholder="الرقم التسلسلي / SKU" value={form.serial_number} onChange={(event) => setForm({ ...form, serial_number: event.target.value })} /><Input type="number" min="0" step="0.01" placeholder="سعر البيع" value={form.sell_price} onChange={(event) => setForm({ ...form, sell_price: event.target.value })} /><Input type="number" min="0" step="0.01" placeholder="سعر الشراء" value={form.cost_price} onChange={(event) => setForm({ ...form, cost_price: event.target.value })} /><Input type="number" min="0" step="0.01" placeholder="الكمية" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /><select className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm" value={form.warehouseId} onChange={(event) => setForm({ ...form, warehouseId: event.target.value })} required><option value="">اختر المخزن</option>{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></div><Button type="submit" disabled={saving} className="bg-[#FF685B] text-white">{saving ? 'جارٍ الحفظ...' : 'حفظ المنتج'}</Button></form>}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"><Table><TableHeader><TableRow><TableHead className="px-4 py-3 text-right whitespace-nowrap">الاسم</TableHead><TableHead className="px-4 py-3 text-right whitespace-nowrap">الرقم التسلسلي / SKU</TableHead><TableHead className="px-4 py-3 text-right whitespace-nowrap">سعر البيع</TableHead><TableHead className="px-4 py-3 text-right whitespace-nowrap">الكمية</TableHead><TableHead className="px-4 py-3 text-right whitespace-nowrap">إجراءات</TableHead></TableRow></TableHeader><TableBody>{products.filter(product => selectedWarehouseId === 'all' || stocks.some(stock => stock.product_id === product.id && stock.warehouse_id === selectedWarehouseId)).map((product) => <TableRow key={product.id}><TableCell className="px-4 py-3 text-right whitespace-nowrap">{product.name}{selectedWarehouseId === 'all' && <div className="mt-1 flex flex-wrap gap-1">{stocks.filter(stock => stock.product_id === product.id && stock.quantity > 0).map(stock => <span key={stock.warehouse_id} className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] text-orange-700">{warehouses.find(warehouse => warehouse.id === stock.warehouse_id)?.name}: {stock.quantity}</span>)}</div>}</TableCell><TableCell className="px-4 py-3 text-right whitespace-nowrap">{product.serial_number || '—'}</TableCell><TableCell className="px-4 py-3 text-right whitespace-nowrap">{(product.sell_price ?? 0).toLocaleString()} د.ع</TableCell><TableCell className="px-4 py-3 text-right whitespace-nowrap">{Number(selectedWarehouseId === 'all' ? product.quantity : stocks.find(stock => stock.product_id === product.id && stock.warehouse_id === selectedWarehouseId)?.quantity || 0).toLocaleString()}</TableCell><TableCell className="px-4 py-3 text-right whitespace-nowrap"><Button variant="ghost" size="icon" aria-label="تعديل" onClick={() => openEdit(product)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label="حذف" onClick={() => remove(product.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell></TableRow>)}</TableBody></Table></div>
    </div>
  );
}
