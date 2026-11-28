'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Box, Check, Minus, Pencil, Plus, Search, Trash2, Warehouse as WarehouseIcon, X } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

type Product = { id: string; name: string; sell_price: number | null; cost_price: number | null; quantity: number | null; code?: string | null };
type Warehouse = { id: string; name: string; location: string | null; notes: string | null; is_default: boolean };
type Stock = { product_id: string; warehouse_id: string; quantity: number; avg_cost: number };
type ProductRow = Product & { stocks: Stock[]; selectedQuantity: number; totalQuantity: number };

type WarehouseForm = { name: string; location: string; notes: string; is_default: boolean };
const emptyWarehouse: WarehouseForm = { name: '', location: '', notes: '', is_default: false };

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<string | null>(null);
  const [warehouseForm, setWarehouseForm] = useState<WarehouseForm>(emptyWarehouse);
  const [newProduct, setNewProduct] = useState({ name: '', cost_price: 0, sell_price: 0, quantity: 0 });
  const [transfer, setTransfer] = useState({ productId: '', fromWarehouseId: '', toWarehouseId: '', quantity: 1 });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [legacyWarehouseSchema, setLegacyWarehouseSchema] = useState(false);

  const load = async () => {
    const [{ data: productData, error: productError }, { data: stockData, error: stockError }] = await Promise.all([
      supabase.from('products').select('id, name, sell_price, cost_price, quantity, code').order('name'),
      supabase.from('product_warehouse_stock').select('product_id, warehouse_id, quantity, avg_cost'),
    ]);
    let { data: warehouseData, error: warehouseError } = await supabase.from('warehouses').select('id, name, location, notes, is_default').order('name');
    let isLegacy = false;
    if (warehouseError?.code === '42703') {
      const fallback = await supabase.from('warehouses').select('id, name, location').order('name');
      warehouseData = fallback.data?.map((warehouse) => ({ ...warehouse, notes: null, is_default: false })) || null;
      warehouseError = fallback.error;
      isLegacy = !fallback.error;
    }
    const error = productError || warehouseError || stockError;
    if (error) throw error;
    setLegacyWarehouseSchema(isLegacy);
    setProducts((productData || []) as Product[]);
    setWarehouses((warehouseData || []) as Warehouse[]);
    setStocks((stockData || []).map((row) => ({ ...row, quantity: Number(row.quantity || 0), avg_cost: Number(row.avg_cost || 0) })) as Stock[]);
  };

  useEffect(() => { load().catch((error) => setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر تحميل المخزون' })); }, []);

  const selectedWarehouseId = selectedWarehouse === 'all' ? null : selectedWarehouse;
  const rows = useMemo<ProductRow[]>(() => products.map((product) => {
    const productStocks = stocks.filter((stock) => stock.product_id === product.id);
    const totalQuantity = productStocks.reduce((sum, stock) => sum + stock.quantity, 0);
    const selectedQuantity = selectedWarehouseId ? productStocks.find((stock) => stock.warehouse_id === selectedWarehouseId)?.quantity || 0 : totalQuantity;
    return { ...product, stocks: productStocks, totalQuantity, selectedQuantity };
  }).filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase())), [products, stocks, selectedWarehouseId, searchTerm]);

  const summary = useMemo(() => ({
    itemCount: rows.filter((row) => row.selectedQuantity > 0).length,
    cost: rows.reduce((sum, row) => sum + row.selectedQuantity * Number(row.cost_price || 0), 0),
    value: rows.reduce((sum, row) => sum + row.selectedQuantity * Number(row.sell_price || 0), 0),
    low: rows.filter((row) => row.selectedQuantity < 5).length,
  }), [rows]);

  const warehouseCounts = useMemo(() => new Map(warehouses.map((warehouse) => [warehouse.id, stocks.filter((stock) => stock.warehouse_id === warehouse.id).reduce((sum, stock) => sum + stock.quantity, 0)])), [warehouses, stocks]);
  const stockFor = (row: ProductRow, warehouseId: string) => row.stocks.find((stock) => stock.warehouse_id === warehouseId)?.quantity || 0;

  const openWarehouse = (warehouse?: Warehouse) => {
    setEditingWarehouse(warehouse?.id || null);
    setWarehouseForm(warehouse ? { name: warehouse.name, location: warehouse.location || '', notes: warehouse.notes || '', is_default: warehouse.is_default } : emptyWarehouse);
    setShowWarehouseForm(true); setMessage(null);
  };

  const saveWarehouse = async () => {
    if (!warehouseForm.name.trim()) return setMessage({ type: 'error', text: 'اكتب اسم المخزن أولاً' });
    setSaving(true); setMessage(null);
    try {
      if (warehouseForm.is_default && !legacyWarehouseSchema) await supabase.from('warehouses').update({ is_default: false }).neq('id', editingWarehouse || '00000000-0000-0000-0000-000000000000');
      const payload = legacyWarehouseSchema
        ? { name: warehouseForm.name.trim(), location: warehouseForm.location.trim() || null }
        : { ...warehouseForm, name: warehouseForm.name.trim(), location: warehouseForm.location.trim() || null, notes: warehouseForm.notes.trim() || null };
      const query = editingWarehouse ? supabase.from('warehouses').update(payload).eq('id', editingWarehouse) : supabase.from('warehouses').insert(payload);
      const { error } = await query;
      if (error) throw error;
      setShowWarehouseForm(false); await load(); setMessage({ type: 'success', text: editingWarehouse ? 'تم تعديل المخزن' : 'تمت إضافة المخزن' });
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر حفظ المخزن' }); } finally { setSaving(false); }
  };

  const deleteWarehouse = async (id: string) => {
    if ((warehouseCounts.get(id) || 0) > 0) return setMessage({ type: 'error', text: 'لا يمكن حذف مخزن يحتوي على منتجات' });
    const { error } = await supabase.from('warehouses').delete().eq('id', id);
    if (error) return setMessage({ type: 'error', text: error.message });
    setConfirmDelete(null); if (selectedWarehouse === id) setSelectedWarehouse('all'); await load(); setMessage({ type: 'success', text: 'تم حذف المخزن' });
  };

  const addProduct = async () => {
    if (!newProduct.name.trim()) return setMessage({ type: 'error', text: 'اكتب اسم المنتج أولاً' });
    const warehouseId = selectedWarehouseId || warehouses.find((warehouse) => warehouse.is_default)?.id || warehouses[0]?.id;
    if (!warehouseId) return setMessage({ type: 'error', text: 'أضف مخزناً أولاً' });
    setSaving(true);
    try {
      const { data, error } = await supabase.from('products').insert({ name: newProduct.name.trim(), cost_price: newProduct.cost_price, sell_price: newProduct.sell_price, quantity: newProduct.quantity }).select('id').single();
      if (error) throw error;
      const { error: stockError } = await supabase.from('product_warehouse_stock').insert({ product_id: data.id, warehouse_id: warehouseId, quantity: newProduct.quantity, avg_cost: newProduct.cost_price });
      if (stockError) throw stockError;
      setNewProduct({ name: '', cost_price: 0, sell_price: 0, quantity: 0 }); setShowProductForm(false); await load(); setMessage({ type: 'success', text: 'تمت إضافة المنتج إلى المخزن' });
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر إضافة المنتج' }); } finally { setSaving(false); }
  };

  const changeQuantity = async (row: ProductRow, delta: number) => {
    if (!selectedWarehouseId) return setMessage({ type: 'error', text: 'اختر مخزناً محدداً لتعديل الكمية' });
    const next = row.selectedQuantity + delta;
    if (next < 0) return;
    const { error } = await supabase.from('product_warehouse_stock').upsert({ product_id: row.id, warehouse_id: selectedWarehouseId, quantity: next, avg_cost: Number(row.cost_price || 0) }, { onConflict: 'product_id,warehouse_id' });
    if (error) return setMessage({ type: 'error', text: error.message });
    await supabase.rpc('sync_product_total', { product_id_param: row.id }); await load();
  };

  const doTransfer = async () => {
    if (!transfer.productId || !transfer.fromWarehouseId || !transfer.toWarehouseId || transfer.quantity <= 0) return setMessage({ type: 'error', text: 'أكمل بيانات التحويل' });
    setSaving(true);
    try {
      const { error } = await supabase.rpc('transfer_stock', { product_id_param: transfer.productId, from_warehouse_id_param: transfer.fromWarehouseId, to_warehouse_id_param: transfer.toWarehouseId, quantity_param: transfer.quantity });
      if (error) throw error;
      setShowTransfer(false); setTransfer({ productId: '', fromWarehouseId: '', toWarehouseId: '', quantity: 1 }); await load(); setMessage({ type: 'success', text: 'تم تحويل المخزون بنجاح' });
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر تحويل المخزون' }); } finally { setSaving(false); }
  };

  return <div dir="rtl" className="inventory-page min-h-screen min-w-0 max-w-full overflow-x-hidden bg-[#F3F5F9] p-6 text-slate-900">
    <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm text-slate-500">المخزون والمنتجات</p><h1 className="text-2xl font-bold">إدارة المخزون</h1></div><div className="flex max-w-full flex-wrap gap-2"><Button onClick={() => setShowTransfer(true)} variant="outline"><WarehouseIcon className="ml-2 h-4 w-4" />تحويل بين المخازن</Button><Button onClick={() => openWarehouse()} className="bg-orange-500 text-white hover:bg-orange-600"><Plus className="ml-2 h-4 w-4" />إضافة مخزن جديد</Button></div></div>
    {message && <div role="status" className={`mb-4 rounded-lg px-3 py-2 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{message.text}</div>}
    <div className="mb-5 flex min-w-0 max-w-full gap-2 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-2"><button onClick={() => setSelectedWarehouse('all')} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm ${selectedWarehouse === 'all' ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-orange-50'}`}>كل المخازن <span className="mr-1 text-xs opacity-75">{stocks.reduce((sum, stock) => sum + stock.quantity, 0).toLocaleString()}</span></button>{warehouses.map((warehouse) => <div key={warehouse.id} className="flex shrink-0 items-center gap-1"><button onClick={() => setSelectedWarehouse(warehouse.id)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm ${selectedWarehouse === warehouse.id ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-orange-50'}`}>{warehouse.name} <span className="mr-1 text-xs opacity-75">{(warehouseCounts.get(warehouse.id) || 0).toLocaleString()}</span></button><button aria-label={`تعديل ${warehouse.name}`} onClick={() => openWarehouse(warehouse)} className="rounded p-1 text-slate-400 hover:text-orange-500"><Pencil className="h-3.5 w-3.5" /></button><button aria-label={`حذف ${warehouse.name}`} onClick={() => setConfirmDelete(warehouse.id)} className="rounded p-1 text-slate-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>
    <div className="mb-5 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-4">{[['إجمالي المواد', summary.itemCount.toLocaleString(), 'text-slate-900'], ['رأس مال المخزن', `${summary.cost.toLocaleString()} د.ع`, 'text-blue-500'], ['قيمة المبيعات المتوقعة', `${summary.value.toLocaleString()} د.ع`, 'text-emerald-500'], ['مواد قاربت على النفاد', summary.low.toLocaleString(), 'text-rose-500']].map(([label, value, color]) => <Card key={label} className="border-slate-200/80 bg-white"><CardContent className="p-4"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-xl font-bold ${color}`}>{value}</p></CardContent></Card>)}</div>
    <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3"><div className="relative min-w-0 max-w-full"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><Input placeholder="بحث عن منتج..." className="w-72 max-w-full bg-white pr-10" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div><Button onClick={() => setShowProductForm(true)} className="bg-gradient-to-r from-orange-500 to-amber-500 text-white"><Plus className="ml-2 h-4 w-4" />إضافة منتج جديد</Button></div>
    {showProductForm && <Card className="mb-5 min-w-0 max-w-full border-slate-200/80 bg-white"><CardContent className="space-y-4 p-5"><div className="flex items-center justify-between gap-2"><h2 className="min-w-0 font-bold">إضافة منتج إلى المخزن</h2><Button variant="ghost" size="icon" onClick={() => setShowProductForm(false)}><X className="h-4 w-4" /></Button></div><div className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-5"><Input placeholder="اسم المنتج" value={newProduct.name} onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })} /><Input type="number" min="0" placeholder="التكلفة" value={newProduct.cost_price} onChange={(event) => setNewProduct({ ...newProduct, cost_price: Number(event.target.value) })} /><Input type="number" min="0" placeholder="سعر البيع" value={newProduct.sell_price} onChange={(event) => setNewProduct({ ...newProduct, sell_price: Number(event.target.value) })} /><Input type="number" min="0" placeholder="الكمية" value={newProduct.quantity} onChange={(event) => setNewProduct({ ...newProduct, quantity: Number(event.target.value) })} /><select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" value={selectedWarehouseId || ''} onChange={(event) => setSelectedWarehouse(event.target.value || 'all')}><option value="">اختر المخزن</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></div><Button disabled={saving} onClick={addProduct} className="bg-orange-500 text-white">{saving ? 'جارٍ الحفظ...' : 'حفظ المنتج'}</Button></CardContent></Card>}
    {rows.length === 0 ? <EmptyState title="مخزونك فارغ حالياً" description="أضف أول منتج لتبدأ بمتابعة الكميات والمبيعات." actionLabel="إضافة أول منتج" onAction={() => setShowProductForm(true)} /> : <div className="inventory-table-wrap max-w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white"><Table><TableHeader><TableRow><TableHead className="px-6 py-4 text-right">اسم المنتج</TableHead><TableHead className="px-6 py-4 text-right">التكلفة</TableHead><TableHead className="px-6 py-4 text-right">سعر البيع</TableHead><TableHead className="px-6 py-4 text-right">الربح</TableHead><TableHead className="px-6 py-4 text-right">الكمية</TableHead><TableHead className="px-6 py-4 text-right">إجراءات</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="px-6 py-4 font-bold"><div className="flex items-center gap-2"><Box className="h-4 w-4 text-blue-500" />{row.name}</div>{selectedWarehouse === 'all' && <div className="mt-1 flex flex-wrap gap-1">{row.stocks.filter((stock) => stock.quantity > 0).map((stock) => <span key={stock.warehouse_id} className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] text-orange-700">{warehouses.find((warehouse) => warehouse.id === stock.warehouse_id)?.name}: {stock.quantity}</span>)}</div>}</TableCell><TableCell className="px-6 py-4">{Number(row.cost_price || 0).toLocaleString()} د.ع</TableCell><TableCell className="px-6 py-4 text-emerald-500">{Number(row.sell_price || 0).toLocaleString()} د.ع</TableCell><TableCell className="px-6 py-4">{(Number(row.sell_price || 0) - Number(row.cost_price || 0)).toLocaleString()} د.ع</TableCell><TableCell className="px-6 py-4"><div className="flex items-center gap-2">{selectedWarehouseId && <Button size="sm" variant="outline" className="h-6 w-6 p-0" disabled={row.selectedQuantity <= 0} onClick={() => changeQuantity(row, -1)}><Minus className="h-3 w-3" /></Button>}<span className={`rounded px-2 py-1 text-xs font-bold ${row.selectedQuantity === 0 ? 'bg-red-50 text-red-700' : row.selectedQuantity < 5 ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>{row.selectedQuantity === 0 ? 'نافد' : row.selectedQuantity.toLocaleString()}</span>{selectedWarehouseId && <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => changeQuantity(row, 1)}><Plus className="h-3 w-3" /></Button>}</div></TableCell><TableCell className="px-6 py-4"><Button variant="ghost" className="text-red-500" onClick={() => supabase.from('products').delete().eq('id', row.id).then(() => load())}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div>}
    {showWarehouseForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"><Card className="w-full max-w-lg bg-white"><CardContent className="space-y-4 p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{editingWarehouse ? 'تعديل المخزن' : 'إضافة مخزن جديد'}</h2><Button variant="ghost" size="icon" onClick={() => setShowWarehouseForm(false)}><X className="h-4 w-4" /></Button></div><Input placeholder="اسم المخزن" value={warehouseForm.name} onChange={(event) => setWarehouseForm({ ...warehouseForm, name: event.target.value })} /><Input placeholder="الموقع / المنطقة" value={warehouseForm.location} onChange={(event) => setWarehouseForm({ ...warehouseForm, location: event.target.value })} /><textarea className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="ملاحظات" value={warehouseForm.notes} onChange={(event) => setWarehouseForm({ ...warehouseForm, notes: event.target.value })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={warehouseForm.is_default} onChange={(event) => setWarehouseForm({ ...warehouseForm, is_default: event.target.checked })} />تعيين كمخزن افتراضي</label><Button disabled={saving} onClick={saveWarehouse} className="w-full bg-orange-500 text-white">حفظ</Button></CardContent></Card></div>}
    {showTransfer && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"><Card className="w-full max-w-lg bg-white"><CardContent className="space-y-4 p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">تحويل بين المخازن</h2><Button variant="ghost" size="icon" onClick={() => setShowTransfer(false)}><X className="h-4 w-4" /></Button></div><select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={transfer.productId} onChange={(event) => setTransfer({ ...transfer, productId: event.target.value })}><option value="">اختر المنتج</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><div className="grid grid-cols-2 gap-3"><select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" value={transfer.fromWarehouseId} onChange={(event) => setTransfer({ ...transfer, fromWarehouseId: event.target.value })}><option value="">من مخزن</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({transfer.productId ? stockFor(rows.find((row) => row.id === transfer.productId)!, warehouse.id) : 0})</option>)}</select><select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" value={transfer.toWarehouseId} onChange={(event) => setTransfer({ ...transfer, toWarehouseId: event.target.value })}><option value="">إلى مخزن</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></div><Input type="number" min="0.01" step="0.01" value={transfer.quantity} onChange={(event) => setTransfer({ ...transfer, quantity: Number(event.target.value) })} /><Button disabled={saving} onClick={doTransfer} className="w-full bg-orange-500 text-white">تنفيذ التحويل</Button></CardContent></Card></div>}
    {confirmDelete && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"><Card className="w-full max-w-sm bg-white"><CardContent className="space-y-4 p-6"><h2 className="font-bold">تأكيد حذف المخزن</h2><p className="text-sm text-slate-500">سيتم رفض الحذف تلقائياً إذا كان المخزن يحتوي على كمية.</p><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmDelete(null)}>إلغاء</Button><Button className="bg-red-600 text-white" onClick={() => deleteWarehouse(confirmDelete)}>حذف</Button></div></CardContent></Card></div>}
  </div>;
}
