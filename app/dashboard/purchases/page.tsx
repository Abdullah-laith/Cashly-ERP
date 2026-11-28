'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

type Product = { id: string; name: string; quantity: number | null; cost_price: number | null };
type Supplier = { id: string; name: string };
type Warehouse = { id: string; name: string; is_default: boolean };
type Purchase = { id: string; supplier_name: string | null; product_name: string | null; quantity: number | null; unit_cost: number | null; total_cost: number; created_at: string };

type PurchaseForm = { supplierName: string; productId: string; productName: string; warehouseId: string; quantity: string; unitCost: string; extraCosts: string };
const emptyForm: PurchaseForm = { supplierName: '', productId: '', productName: '', warehouseId: '', quantity: '', unitCost: '', extraCosts: '' };

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [form, setForm] = useState<PurchaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    const [{ data: productData, error: productError }, { data: supplierData, error: supplierError }, { data: warehouseData, error: warehouseError }, { data: purchaseData, error: purchaseError }] = await Promise.all([
      supabase.from('products').select('id, name, quantity, cost_price').order('name'),
      supabase.from('suppliers').select('id, name').order('name'),
      supabase.from('warehouses').select('id, name, is_default').order('name'),
      supabase.from('purchases').select('id, supplier_name, product_name, quantity, unit_cost, total_cost, created_at').order('created_at', { ascending: false }),
    ]);
    const error = productError || supplierError || warehouseError || purchaseError;
    if (error) throw error;
    setProducts((productData || []) as Product[]);
    setSuppliers((supplierData || []) as Supplier[]);
    setWarehouses((warehouseData || []) as Warehouse[]);
    setForm((current) => current.warehouseId || !warehouseData?.length ? current : { ...current, warehouseId: (warehouseData.find((warehouse) => warehouse.is_default) || warehouseData[0]).id });
    setPurchases((purchaseData || []) as Purchase[]);
  };

  useEffect(() => { loadData().catch((error) => setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر تحميل سجل المشتريات' })); }, []);

  const total = useMemo(() => {
    const quantity = Number(form.quantity) || 0;
    return quantity * (Number(form.unitCost) || 0) + (Number(form.extraCosts) || 0);
  }, [form.quantity, form.unitCost, form.extraCosts]);

  const savePurchase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(form.quantity);
    const unitCost = Number(form.unitCost);
    const extraCosts = Number(form.extraCosts) || 0;
    const product = products.find((item) => item.id === form.productId);
    const productName = product?.name || form.productName.trim();
    if (!form.supplierName.trim() || !productName || !form.warehouseId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      setMessage({ type: 'error', text: 'أكمل المورد والمخزن والمنتج والكمية وسعر الشراء بقيم صحيحة' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const totalCost = quantity * unitCost + extraCosts;
      const { error: purchaseError } = await supabase.rpc('create_purchase_with_stock', {
        supplier_name_param: form.supplierName.trim(),
        product_id_param: product?.id || null,
        product_name_param: productName,
        warehouse_id_param: form.warehouseId,
        quantity_param: quantity,
        unit_cost_param: unitCost,
        total_cost_param: totalCost,
      });
      if (purchaseError) throw purchaseError;
      setForm(emptyForm);
      await loadData();
      setMessage({ type: 'success', text: product ? 'تم حفظ الشراء وتحديث كمية المخزون' : 'تم حفظ المنتج اليدوي في سجل المشتريات' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'تعذر حفظ الشراء' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen space-y-8 p-6">
      <div><h1 className="text-3xl font-bold">سجل المشتريات</h1><p className="mt-2 text-sm text-muted-foreground">أضف شراءً لمنتج موجود ليُحدّث المخزون، أو سجّل غرضاً جديداً يدوياً.</p></div>
      <Card><CardContent className="p-6">
        <form onSubmit={savePurchase} className="space-y-5">
          <h2 className="text-lg font-bold">إضافة شراء سريع</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div><label className="mb-1 block text-sm">اسم المورد</label><Input list="supplier-names" placeholder="اختر أو اكتب مورداً" value={form.supplierName} onChange={(event) => setForm({ ...form, supplierName: event.target.value })} required /><datalist id="supplier-names">{suppliers.map((supplier) => <option key={supplier.id} value={supplier.name} />)}</datalist></div>
            <div><label className="mb-1 block text-sm">المنتج الموجود</label><select className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 text-sm" value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value, productName: '' })}><option value="">شراء منتج جديد يدوياً</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm">المخزن المستلم</label><select className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 text-sm" value={form.warehouseId} onChange={(event) => setForm({ ...form, warehouseId: event.target.value })} required><option value="">اختر المخزن</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm">اسم المنتج اليدوي</label><Input placeholder="يُستخدم عند عدم اختيار منتج" value={form.productName} disabled={Boolean(form.productId)} onChange={(event) => setForm({ ...form, productName: event.target.value })} /></div>
            <div><label className="mb-1 block text-sm">الكمية</label><Input type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required /></div>
            <div><label className="mb-1 block text-sm">سعر الشراء للوحدة</label><Input type="number" min="0" step="0.01" value={form.unitCost} onChange={(event) => setForm({ ...form, unitCost: event.target.value })} required /></div>
            <div><label className="mb-1 block text-sm">مصاريف إضافية</label><Input type="number" min="0" step="0.01" value={form.extraCosts} onChange={(event) => setForm({ ...form, extraCosts: event.target.value })} /></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4"><p className="text-lg font-bold">الإجمالي: {total.toLocaleString()} د.ع</p><Button type="submit" disabled={saving} className="bg-orange-500 text-white hover:bg-orange-600"><Plus className="ml-2 h-4 w-4" />{saving ? 'جارٍ الحفظ...' : 'حفظ الشراء'}</Button></div>
        </form>
      </CardContent></Card>
      {message && <p role="status" className={message.type === 'error' ? 'text-sm text-red-500' : 'text-sm text-emerald-500'}>{message.text}</p>}
      {purchases.length === 0 ? <EmptyState title="لا توجد مشتريات بعد" description="سجّل أول عملية شراء لتحديث المخزون ومتابعة التكلفة." actionLabel="إضافة أول شراء" onAction={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })} /> : <div className="overflow-x-auto rounded-xl border border-border"><Table><TableHeader><TableRow><TableHead className="px-4 py-3 text-right whitespace-nowrap">المورد</TableHead><TableHead className="px-4 py-3 text-right whitespace-nowrap">المنتج</TableHead><TableHead className="px-4 py-3 text-right whitespace-nowrap">الكمية</TableHead><TableHead className="px-4 py-3 text-right whitespace-nowrap">سعر الوحدة</TableHead><TableHead className="px-4 py-3 text-right whitespace-nowrap">الإجمالي</TableHead><TableHead className="px-4 py-3 text-right whitespace-nowrap">التاريخ</TableHead></TableRow></TableHeader><TableBody>{purchases.map((purchase) => <TableRow key={purchase.id}><TableCell className="px-4 py-3 text-right whitespace-nowrap">{purchase.supplier_name || '—'}</TableCell><TableCell className="px-4 py-3 text-right whitespace-nowrap">{purchase.product_name || '—'}</TableCell><TableCell className="px-4 py-3 text-right whitespace-nowrap">{(purchase.quantity ?? 0).toLocaleString()}</TableCell><TableCell className="px-4 py-3 text-right whitespace-nowrap">{(purchase.unit_cost ?? 0).toLocaleString()} د.ع</TableCell><TableCell className="px-4 py-3 text-right whitespace-nowrap font-bold">{Number(purchase.total_cost || 0).toLocaleString()} د.ع</TableCell><TableCell className="px-4 py-3 text-right whitespace-nowrap">{new Date(purchase.created_at).toLocaleDateString('ar-IQ')}</TableCell></TableRow>)}</TableBody></Table></div>}
    </div>
  );
}
