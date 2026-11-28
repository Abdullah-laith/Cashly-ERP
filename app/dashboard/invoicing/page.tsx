'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { CalendarDays, ClipboardList, Minus, Plus, Printer, Search, Trash2, UserPlus, X } from 'lucide-react';
import { soundEngine } from '@/lib/sound-engine';
import { useOrganization } from '@/components/organization-provider';
import { printInvoicePDF, type InvoiceData } from '@/lib/print-invoice';
import { CheckCircle2 } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  sku?: string;
  code?: string;
  category?: string;
  sell_price?: number;
  wholesale_price?: number;
  quantity?: number;
  min_quantity?: number;
};
type WarehouseStock = { product_id: string; warehouse_id: string; quantity: number };
type Customer = { id: string; name: string; phone?: string; address?: string; governorate?: string; customer_type?: 'online' | 'in_store' | null; customer_channel?: 'online' | 'store' | null; balance?: number };
type CartLine = Product & { qty: number; price: number };

const money = (value: number, currency: 'IQD' | 'USD') => `${value.toLocaleString()} ${currency === 'IQD' ? 'د.ع' : '$'}`;
const today = () => new Date().toISOString().slice(0, 10);
const newInvoiceNumber = () => `INV-${new Date().getTime().toString().slice(-8)}`;

export default function InvoicingPage() {
  const { organization } = useOrganization();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);
  const [treasuries, setTreasuries] = useState<any[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('الكل');
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [customerType, setCustomerType] = useState<'online' | 'in_store'>('in_store');
  const [postSaleInvoice, setPostSaleInvoice] = useState<InvoiceData | null>(null);
  const [showPostSaleModal, setShowPostSaleModal] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [treasuryId, setTreasuryId] = useState('');
  const [currency, setCurrency] = useState<'IQD' | 'USD'>('IQD');
  const [priceMode, setPriceMode] = useState<'retail' | 'wholesale'>('retail');
  const [discount, setDiscount] = useState(0);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');
  const [shipping, setShipping] = useState(0);
  const [payment, setPayment] = useState<'cash' | 'credit'>('cash');
  const [received, setReceived] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [suspended, setSuspended] = useState<any[]>([]);

  useEffect(() => {
    setInvoiceDate(today());
    setInvoiceNumber(newInvoiceNumber());

    const load = async () => {
      const [p, c, w, t, s] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('customers').select('*').order('name'),
        supabase.from('warehouses').select('*').order('name'),
        supabase.from('treasuries').select('*').order('name'),
        supabase.from('product_warehouse_stock').select('product_id, warehouse_id, quantity'),
      ]);
      setProducts(p.data || []);
      setCustomers(c.data || []);
      setWarehouses(w.data || []);
      setWarehouseStocks((s.data || []).map(stock => ({ ...stock, quantity: Number(stock.quantity || 0) })));
      setTreasuries(t.data || []);
      const defaultWarehouse = w.data?.find(warehouse => warehouse.is_default) || w.data?.[0];
      if (defaultWarehouse) setWarehouseId(defaultWarehouse.id);
      if (t.data?.[0]) setTreasuryId(t.data[0].id);
    };
    load();
    try { setSuspended(JSON.parse(localStorage.getItem('cashly-suspended-invoices') || '[]')); } catch {}
  }, []);

  useEffect(() => {
    setCart([]);
  }, [warehouseId]);

  const availableQuantity = (product: Product) => warehouseStocks.find(stock => stock.product_id === product.id && stock.warehouse_id === warehouseId)?.quantity || 0;
  const categories = useMemo(() => ['الكل', ...Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]], [products]);
  const visibleCustomers = customers.filter(c => !customerQuery || `${c.name} ${c.phone || ''}`.toLowerCase().includes(customerQuery.toLowerCase())).slice(0, 6);
  const visibleProducts = products.filter(p => {
    const matchesQuery = !query || `${p.name} ${p.sku || ''} ${p.code || ''}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === 'الكل' || p.category === category);
  });
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const normalizedDiscount = discountMode === 'percent'
    ? Math.min(100, Math.max(0, discount))
    : Math.min(subtotal, Math.max(0, discount));
  const discountValue = discountMode === 'percent' ? subtotal * normalizedDiscount / 100 : normalizedDiscount;
  const total = Math.max(0, subtotal - discountValue + shipping);
  const due = Math.max(0, total - received);
  const change = Math.max(0, received - total);

  const addProduct = (product: Product) => {
    const line = cart.find(item => item.id === product.id);
    const available = availableQuantity(product);
    if (available <= 0) return toast.error('هذا المنتج نافد من المخزون');
    if (line && line.qty >= available) return toast.error('لا يمكن تجاوز الكمية المتوفرة');
    const price = Number(priceMode === 'wholesale' ? product.wholesale_price || product.sell_price || 0 : product.sell_price || 0);
    setCart(line ? cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item) : [...cart, { ...product, qty: 1, price }]);
  };
  const updateQty = (id: string, nextQty: number) => {
    const line = cart.find(item => item.id === id);
    if (!line) return;
    const available = availableQuantity(line);
    const requested = Math.max(1, Math.floor(Number.isFinite(nextQty) ? nextQty : 1));
    if (requested > available) {
      toast.error(`الكمية المطلوبة غير متوفرة، المتبقي في المخزن: ${available}`);
      return;
    }
    setCart(cart.map(item => item.id === id ? { ...item, qty: requested } : item));
  };
  const changeQty = (id: string, delta: number) => {
    const line = cart.find(item => item.id === id);
    if (line) updateQty(id, line.qty + delta);
  };
  const updatePrice = (id: string, value: number) => setCart(cart.map(line => line.id === id ? { ...line, price: Math.max(0, value) } : line));

  const saveCustomer = async () => {
    if (!customer.name.trim()) return toast.error('اكتب اسم الزبون أولاً');
    const { data, error } = await supabase.from('customers').insert([{ ...customer, customer_type: customerType }]).select().single();
    if (error) return toast.error(`تعذر حفظ الزبون: ${error.message}`);
    setCustomers([...(customers || []), data]);
    setSelectedCustomer(data);
    setCustomerQuery(data.name);
    setCustomerType(data.customer_type === 'online' || data.customer_channel === 'online' ? 'online' : 'in_store');
    toast.success('تم حفظ الزبون');
  };

  const saveInvoice = async (print = false) => {
    if (!cart.length) { soundEngine.playError(); return toast.error('أضف مادة واحدة على الأقل'); }
    if (payment === 'credit' && !selectedCustomer && !customer.name.trim()) return toast.error('اختر زبوناً للفاتورة الآجلة');
    setSaving(true);
    try {
      const payload: any = {
        invoice_number: invoiceNumber, customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || customer.name || 'عميل نقدي', customer_phone: selectedCustomer?.phone || customer.phone,
        total_amount: total, payment_type: payment, remaining_debt: payment === 'cash' ? 0 : due,
        created_at: (() => {
          const selected = invoiceDate ? new Date(`${invoiceDate}T00:00:00`) : new Date();
          const current = new Date();
          if (invoiceDate === today()) selected.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
          return selected.toISOString();
        })(),
        notes,
      };
      payload.customer_type = customerType;
      payload.subtotal_amount = subtotal;
      payload.discount_amount = discountValue;
      payload.discount_mode = discountMode;
      payload.shipping_amount = shipping;
      if (!warehouseId) throw new Error('اختر المخزن قبل إتمام البيع');
      const { data: invoice, error } = await supabase.rpc('create_invoice_with_stock', {
        invoice_payload: payload,
        invoice_items_payload: cart.map(line => ({ product_id: line.id, quantity: line.qty, price: line.price })),
        warehouse_id_param: warehouseId,
      });
      if (error) throw error;
      if (!invoice) throw new Error('تعذر إنشاء الفاتورة');
      const invoiceForPrint: InvoiceData = {
        invoiceNumber,
        createdAt: payload.created_at,
        customerName: payload.customer_name,
        customerPhone: payload.customer_phone,
        customerAddress: customer.address,
        customerType,
        paymentType: payment,
        lines: cart.map(line => ({ name: line.name, qty: line.qty, price: line.price })),
        subtotal,
        discount: discountMode === 'percent' ? normalizedDiscount : discountValue,
        discountMode,
        shipping,
        total,
        currency,
      };
      soundEngine.playSuccess();
      toast.success('تم حفظ البيع وتحديث المخزون');
      setPostSaleInvoice(invoiceForPrint);
      if (print) {
        setShowPostSaleModal(false);
        void printInvoicePDF(invoiceForPrint, organization);
      } else {
        setShowPostSaleModal(true);
      }
      setCart([]); setReceived(0); setDiscount(0); setShipping(0); setNotes('');
    } catch (error: any) {
      soundEngine.playError();
      const message = error?.code === 'PGRST202'
        ? 'قاعدة البيانات لا تحتوي دالة حفظ الفاتورة بالمخزن المحدد. طبّق migration 20261128_invoice_warehouse_rpc ثم أعد المحاولة.'
        : `فشل حفظ الفاتورة: ${error?.message || 'خطأ غير معروف'}`;
      toast.error(message);
    } finally { setSaving(false); }
  };

  const suspendInvoice = () => {
    if (!cart.length) return toast.error('السلة فارغة');
    const next = [...suspended, { invoiceNumber, cart, customer, payment, savedAt: new Date().toISOString() }];
    localStorage.setItem('cashly-suspended-invoices', JSON.stringify(next));
    setSuspended(next); setCart([]); toast.success('تم تعليق الفاتورة');
  };

  return (
    <div className="min-h-full p-4 lg:p-6 text-slate-900 print:bg-white print:text-black">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <div><p className="text-sm text-slate-500">المبيعات / نقطة البيع</p><h1 className="text-2xl font-bold">نقطة البيع (POS)</h1></div>
        <div className="flex items-center gap-2 text-sm"><span className="text-slate-500">الفاتورة</span><b>{invoiceNumber}</b><CalendarDays className="w-4" /><input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="bg-white border border-slate-200/80 rounded-lg px-2 py-2" /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5 items-start" dir="rtl">
        <section className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="text-xs text-slate-500">المخزن<select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="mt-1 w-full bg-white border border-slate-200/80 rounded-lg px-3 py-2 text-sm"><option value="">اختر المخزن</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
              <label className="text-xs text-slate-500">القاصة / الخزينة<select value={treasuryId} onChange={e => setTreasuryId(e.target.value)} className="mt-1 w-full bg-white border border-slate-200/80 rounded-lg px-3 py-2 text-sm"><option value="">الخزينة الافتراضية</option>{treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
              <div className="text-xs text-slate-500">العملة<div className="mt-1 flex bg-white border border-slate-200/80 rounded-lg p-1"><button onClick={() => setCurrency('IQD')} className={`flex-1 py-1 rounded ${currency === 'IQD' ? 'bg-[#FF685B] text-white' : ''}`}>IQD د.ع</button><button onClick={() => setCurrency('USD')} className={`flex-1 py-1 rounded ${currency === 'USD' ? 'bg-[#FF685B] text-white' : ''}`}>USD $</button></div></div>
              <div className="text-xs text-slate-500">نوع السعر<div className="mt-1 flex bg-white border border-slate-200/80 rounded-lg p-1"><button onClick={() => setPriceMode('retail')} className={`flex-1 py-1 rounded ${priceMode === 'retail' ? 'bg-[#FF685B] text-white' : ''}`}>مفرد</button><button onClick={() => setPriceMode('wholesale')} className={`flex-1 py-1 rounded ${priceMode === 'wholesale' ? 'bg-[#FF685B] text-white' : ''}`}>جملة</button></div></div>
            </div>
            <div className="relative"><Search className="absolute right-3 top-3 w-4 text-slate-500" /><Input autoFocus value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && visibleProducts[0]) { addProduct(visibleProducts[0]); setQuery(''); } }} placeholder="ابحث بالاسم أو SKU أو امسح الباركود ثم Enter" className="pr-10 bg-white border-slate-200/80" /></div>
            <div className="flex gap-2 overflow-x-auto pb-1">{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${category === c ? 'bg-[#FF685B] border-[#FF685B]' : 'border-slate-200/80 text-slate-500'}`}>{c}</button>)}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {visibleProducts.map(product => { const out = availableQuantity(product) <= 0; return <button key={product.id} disabled={out} onClick={() => addProduct(product)} className={`text-right bg-white border rounded-xl p-4 transition ${out ? 'border-red-200 opacity-60 cursor-not-allowed' : 'border-slate-200/80 hover:border-[#FF685B]'}`}><div className="font-bold truncate">{product.name}</div><div className="text-[#FF685B] font-bold mt-2">{money(Number(priceMode === 'wholesale' ? product.wholesale_price || product.sell_price || 0 : product.sell_price || 0), currency)}</div><div className={`text-xs mt-2 ${out ? 'text-red-400' : 'text-slate-500'}`}>{out ? 'المتوفر: 0 - نافد' : `المتوفر: ${availableQuantity(product)}`}</div></button>; })}
          </div>
        </section>

        <aside className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-4 xl:sticky xl:top-4">
          <div className="flex items-center justify-between"><h2 className="font-bold text-lg">الفاتورة</h2><span className="text-xs text-slate-500">{cart.length} مواد</span></div>
          <div className="relative"><Search className="absolute right-3 top-3 w-4 text-slate-500" /><Input value={customerQuery} onChange={e => { setCustomerQuery(e.target.value); setSelectedCustomer(null); }} placeholder="ابحث عن زبون أو عميل نقدي مباشر" className="pr-10 bg-white border-slate-200/80" />{customerQuery && !selectedCustomer && <div className="absolute z-20 top-12 w-full bg-white border border-slate-200/80 rounded-lg overflow-hidden">{visibleCustomers.map(c => <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomer({ name: c.name, phone: c.phone || '', address: c.address || '' }); setCustomerType(c.customer_type === 'online' || c.customer_channel === 'online' ? 'online' : 'in_store'); setCustomerQuery(c.name); }} className="block w-full text-right px-3 py-2 hover:bg-slate-50 text-sm">{c.name} <span className="text-slate-500">{c.phone || ''}</span></button>)}<button onClick={() => setCustomerQuery('')} className="w-full text-right px-3 py-2 text-slate-500 hover:bg-slate-50">عميل نقدي مباشر</button></div>}</div>
          {selectedCustomer && <div className="flex justify-between text-xs bg-emerald-50 border border-emerald-200 rounded-lg p-2"><span>رصيد الزبون: {Number(selectedCustomer.balance || 0).toLocaleString()} د.ع</span><button onClick={() => { setSelectedCustomer(null); setCustomerQuery(''); }}><X className="w-4" /></button></div>}
          <div className="grid grid-cols-2 gap-2"><Input placeholder="اسم الزبون" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} className="bg-white border-slate-200/80" /><Input placeholder="رقم الهاتف" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} className="bg-white border-slate-200/80" /><Input placeholder="المحافظة / المنطقة" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} className="col-span-2 bg-white border-slate-200/80" /></div>
          <div className="text-xs text-slate-500">نوع الزبون<div className="mt-1 flex rounded-lg border border-slate-200/80 bg-white p-1"><button type="button" onClick={() => setCustomerType('in_store')} className={`flex-1 rounded py-1.5 ${customerType === 'in_store' ? 'bg-orange-500 text-white' : ''}`}>زيارة للمحل</button><button type="button" onClick={() => setCustomerType('online')} className={`flex-1 rounded py-1.5 ${customerType === 'online' ? 'bg-orange-500 text-white' : ''}`}>أونلاين</button></div></div>
          {!selectedCustomer && customer.name && <button onClick={saveCustomer} className="text-xs text-cyan-400 flex items-center gap-1"><UserPlus className="w-4" /> حفظ كزبون جديد</button>}
          <div className="min-h-24 max-h-56 overflow-y-auto space-y-2 border-y border-slate-200/80 py-3">{cart.length === 0 && <div className="text-center text-sm text-slate-500 py-8">السلة فارغة</div>}{cart.map(line => <div key={line.id} className="bg-white rounded-lg p-2 space-y-2"><div className="flex justify-between gap-2 text-sm"><span className="truncate">{line.name}</span><button onClick={() => setCart(cart.filter(x => x.id !== line.id))}><Trash2 className="w-4 text-red-400" /></button></div><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1"><button onClick={() => changeQty(line.id, -1)} className="p-1 bg-slate-50 rounded"><Minus className="w-3" /></button><Input type="number" min="1" max={availableQuantity(line)} value={line.qty} onChange={e => updateQty(line.id, Number(e.target.value))} className="h-7 w-14 bg-white border-slate-200/80 text-center text-xs" /><button onClick={() => changeQty(line.id, 1)} className="p-1 bg-slate-50 rounded"><Plus className="w-3" /></button></div><Input type="number" value={line.price} onChange={e => updatePrice(line.id, Number(e.target.value))} className="h-7 w-24 bg-white border-slate-200/80 text-xs" /><span className="text-xs font-bold">{money(line.price * line.qty, currency)}</span></div></div>)}</div>
          <div className="space-y-2 text-sm"><div className="flex justify-between"><span>المجموع الفرعي</span><b>{money(subtotal, currency)}</b></div><div className="flex items-center gap-2"><span>الخصم</span><div className="flex rounded border border-slate-200/80 p-0.5"><button type="button" onClick={() => setDiscountMode('amount')} className={`px-2 py-1 text-xs rounded ${discountMode === 'amount' ? 'bg-orange-500 text-white' : ''}`}>د.ع</button><button type="button" onClick={() => setDiscountMode('percent')} className={`px-2 py-1 text-xs rounded ${discountMode === 'percent' ? 'bg-orange-500 text-white' : ''}`}>%</button></div><Input type="number" min="0" max={discountMode === 'percent' ? 100 : subtotal} value={discount} onChange={e => setDiscount(Math.min(discountMode === 'percent' ? 100 : subtotal, Math.max(0, Number(e.target.value))))} className="h-8 flex-1 bg-white border-slate-200/80" /></div>{discountMode === 'percent' && <p className="text-xs text-orange-600">قيمة الخصم: {money(discountValue, currency)}</p>}<div className="flex items-center justify-between gap-2"><span>التوصيل</span><Input type="number" value={shipping} onChange={e => setShipping(Number(e.target.value))} className="h-8 w-28 bg-white border-slate-200/80" /></div><div className="flex justify-between text-lg font-bold border-t border-slate-200/80 pt-2"><span>الإجمالي</span><span className="text-emerald-400">{money(total, currency)}</span></div></div>
          <div className="grid grid-cols-2 gap-2 text-xs">{([['cash', 'نقدي'], ['credit', 'آجل / دين']] as const).map(([key, label]) => <button key={key} onClick={() => setPayment(key)} className={`py-2 rounded border ${payment === key ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-200/80 text-slate-500'}`}>{label}</button>)}</div>
          {payment !== 'cash' && <div className="flex items-center gap-2 text-sm"><span>المبلغ المدفوع</span><Input type="number" value={received} onChange={e => setReceived(Number(e.target.value))} className="h-8 bg-white border-slate-200/80" /></div>}
          {payment !== 'cash' && <div className="text-xs text-amber-400">{due > 0 ? `المتبقي دين: ${money(due, currency)}` : `الباقي للزبون: ${money(change, currency)}`}</div>}
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات الفاتورة" className="w-full min-h-16 bg-white border border-slate-200/80 rounded-lg p-2 text-sm resize-none" />
          <div className="grid grid-cols-2 gap-2 print:hidden"><button disabled={saving} onClick={() => saveInvoice(false)} className="col-span-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-3 font-bold disabled:opacity-50">{saving ? 'جار الحفظ...' : 'إتمام البيع وحفظ'}</button><button disabled={saving} onClick={() => saveInvoice(true)} className="rounded-lg border border-slate-200/80 py-2 flex items-center justify-center gap-1"><Printer className="w-4" /> حفظ وطباعة</button><button onClick={suspendInvoice} className="rounded-lg border border-slate-200/80 py-2 flex items-center justify-center gap-1"><ClipboardList className="w-4" /> تعليق الفاتورة</button></div>
          {showPostSaleModal && postSaleInvoice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 print:hidden"><div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl" dir="rtl"><CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-500" /><h2 className="text-xl font-bold">تم إتمام البيع وحفظ الفاتورة بنجاح</h2><p className="mt-2 text-sm text-slate-500">رقم الفاتورة: <strong>{postSaleInvoice.invoiceNumber}</strong></p><p className="text-lg font-bold text-orange-600">{money(postSaleInvoice.total, postSaleInvoice.currency)}</p><p className="mt-4 font-semibold">هل تريد طباعة الفاتورة؟</p><div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" onClick={() => { setShowPostSaleModal(false); if (postSaleInvoice) void printInvoicePDF(postSaleInvoice, organization); }} className="rounded-lg bg-orange-500 px-4 py-3 font-bold text-white">نعم، طباعة الفاتورة (PDF)</button><button type="button" onClick={() => { setShowPostSaleModal(false); setPostSaleInvoice(null); }} className="rounded-lg border border-slate-200 px-4 py-3 font-bold text-slate-700">لا، بيع جديد</button></div></div></div>}
          {suspended.length > 0 && <div className="print:hidden"><p className="text-xs text-slate-500 mb-1">فواتير معلقة</p>{suspended.map((item, index) => <button key={item.invoiceNumber} onClick={() => { setCart(item.cart); setCustomer(item.customer); setPayment(item.payment); setSuspended(suspended.filter((_, i) => i !== index)); }} className="text-xs text-cyan-400 ml-2">{item.invoiceNumber}</button>)}</div>}
        </aside>
      </div>
    </div>
  );
}
