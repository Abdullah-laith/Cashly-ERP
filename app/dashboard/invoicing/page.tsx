'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { CalendarDays, ChevronDown, ClipboardList, Minus, Plus, Printer, Search, Trash2, UserPlus, WalletCards, X } from 'lucide-react';

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
type Customer = { id: string; name: string; phone?: string; address?: string; balance?: number };
type CartLine = Product & { qty: number; price: number };

const money = (value: number, currency: 'IQD' | 'USD') => `${value.toLocaleString()} ${currency === 'IQD' ? 'د.ع' : '$'}`;
const today = () => new Date().toISOString().slice(0, 10);

export default function InvoicingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [treasuries, setTreasuries] = useState<any[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('الكل');
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [warehouseId, setWarehouseId] = useState('');
  const [treasuryId, setTreasuryId] = useState('');
  const [currency, setCurrency] = useState<'IQD' | 'USD'>('IQD');
  const [priceMode, setPriceMode] = useState<'retail' | 'wholesale'>('retail');
  const [discount, setDiscount] = useState(0);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');
  const [shipping, setShipping] = useState(0);
  const [payment, setPayment] = useState<'cash' | 'partial' | 'credit'>('cash');
  const [received, setReceived] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [suspended, setSuspended] = useState<any[]>([]);

  const invoiceNumber = useMemo(() => `INV-${new Date().getTime().toString().slice(-8)}`, []);

  useEffect(() => {
    const load = async () => {
      const [p, c, w, t] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('customers').select('*').order('name'),
        supabase.from('warehouses').select('*').order('name'),
        supabase.from('treasuries').select('*').order('name'),
      ]);
      setProducts(p.data || []);
      setCustomers(c.data || []);
      setWarehouses(w.data || []);
      setTreasuries(t.data || []);
      if (w.data?.[0]) setWarehouseId(w.data[0].id);
      if (t.data?.[0]) setTreasuryId(t.data[0].id);
    };
    load();
    try { setSuspended(JSON.parse(localStorage.getItem('cashly-suspended-invoices') || '[]')); } catch {}
  }, []);

  const categories = useMemo(() => ['الكل', ...Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]], [products]);
  const visibleCustomers = customers.filter(c => !customerQuery || `${c.name} ${c.phone || ''}`.toLowerCase().includes(customerQuery.toLowerCase())).slice(0, 6);
  const visibleProducts = products.filter(p => {
    const matchesQuery = !query || `${p.name} ${p.sku || ''} ${p.code || ''}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === 'الكل' || p.category === category);
  });
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const discountValue = discountMode === 'percent' ? subtotal * Math.min(discount, 100) / 100 : discount;
  const total = Math.max(0, subtotal - discountValue + shipping);
  const due = Math.max(0, total - received);
  const change = Math.max(0, received - total);

  const addProduct = (product: Product) => {
    const line = cart.find(item => item.id === product.id);
    const available = Number(product.quantity || 0);
    if (available <= 0) return toast.error('هذا المنتج نافد من المخزون');
    if (line && line.qty >= available) return toast.error('لا يمكن تجاوز الكمية المتوفرة');
    const price = Number(priceMode === 'wholesale' ? product.wholesale_price || product.sell_price || 0 : product.sell_price || 0);
    setCart(line ? cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item) : [...cart, { ...product, qty: 1, price }]);
  };
  const updateQty = (id: string, delta: number) => setCart(cart.map(line => line.id === id ? { ...line, qty: Math.max(1, line.qty + delta) } : line));
  const updatePrice = (id: string, value: number) => setCart(cart.map(line => line.id === id ? { ...line, price: Math.max(0, value) } : line));

  const saveCustomer = async () => {
    if (!customer.name.trim()) return toast.error('اكتب اسم الزبون أولاً');
    const { data, error } = await supabase.from('customers').insert([{ ...customer }]).select().single();
    if (error) return toast.error(`تعذر حفظ الزبون: ${error.message}`);
    setCustomers([...(customers || []), data]);
    setSelectedCustomer(data);
    setCustomerQuery(data.name);
    toast.success('تم حفظ الزبون');
  };

  const saveInvoice = async (print = false) => {
    if (!cart.length) return toast.error('أضف مادة واحدة على الأقل');
    if (payment === 'credit' && !selectedCustomer && !customer.name.trim()) return toast.error('اختر زبوناً للفاتورة الآجلة');
    setSaving(true);
    try {
      const payload: any = {
        invoice_number: invoiceNumber, customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || customer.name || 'عميل نقدي', customer_phone: selectedCustomer?.phone || customer.phone,
        total_amount: total, payment_type: payment, remaining_debt: payment === 'cash' ? 0 : due,
        created_at: `${invoiceDate}T${new Date().toTimeString().slice(0, 8)}`,
        notes,
      };
      const { data: invoice, error } = await supabase.from('invoices').insert([payload]).select().single();
      if (error) throw error;
      const items = cart.map(line => ({ invoice_id: invoice.id, product_id: line.id, quantity: line.qty, price: line.price }));
      const itemResult = await supabase.from('invoice_items').insert(items);
      if (itemResult.error) throw itemResult.error;
      for (const line of cart) {
        const result = await supabase.from('products').update({ quantity: Number(line.quantity || 0) - line.qty }).eq('id', line.id);
        if (result.error) throw result.error;
      }
      if (print) window.print();
      toast.success('تم حفظ البيع وتحديث المخزون');
      setCart([]); setReceived(0); setDiscount(0); setShipping(0); setNotes('');
    } catch (error: any) {
      toast.error(`فشل حفظ الفاتورة: ${error.message}`);
    } finally { setSaving(false); }
  };

  const suspendInvoice = () => {
    if (!cart.length) return toast.error('السلة فارغة');
    const next = [...suspended, { invoiceNumber, cart, customer, payment, savedAt: new Date().toISOString() }];
    localStorage.setItem('cashly-suspended-invoices', JSON.stringify(next));
    setSuspended(next); setCart([]); toast.success('تم تعليق الفاتورة');
  };

  return (
    <div className="min-h-full p-4 lg:p-6 text-slate-100 print:bg-white print:text-black">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div><p className="text-sm text-slate-400">المبيعات / نقطة البيع</p><h1 className="text-2xl font-bold">نقطة البيع (POS)</h1></div>
        <div className="flex items-center gap-2 text-sm"><span className="text-slate-400">الفاتورة</span><b>{invoiceNumber}</b><CalendarDays className="w-4" /><input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-2" /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5 items-start">
        <section className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="text-xs text-slate-400">المخزن<select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm"><option value="">المخزن الافتراضي</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
              <label className="text-xs text-slate-400">القاصة / الخزينة<select value={treasuryId} onChange={e => setTreasuryId(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm"><option value="">الخزينة الافتراضية</option>{treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
              <div className="text-xs text-slate-400">العملة<div className="mt-1 flex bg-slate-950 border border-slate-700 rounded-lg p-1"><button onClick={() => setCurrency('IQD')} className={`flex-1 py-1 rounded ${currency === 'IQD' ? 'bg-[#FF685B] text-white' : ''}`}>IQD د.ع</button><button onClick={() => setCurrency('USD')} className={`flex-1 py-1 rounded ${currency === 'USD' ? 'bg-[#FF685B] text-white' : ''}`}>USD $</button></div></div>
              <div className="text-xs text-slate-400">نوع السعر<div className="mt-1 flex bg-slate-950 border border-slate-700 rounded-lg p-1"><button onClick={() => setPriceMode('retail')} className={`flex-1 py-1 rounded ${priceMode === 'retail' ? 'bg-[#FF685B] text-white' : ''}`}>مفرد</button><button onClick={() => setPriceMode('wholesale')} className={`flex-1 py-1 rounded ${priceMode === 'wholesale' ? 'bg-[#FF685B] text-white' : ''}`}>جملة</button></div></div>
            </div>
            <div className="relative"><Search className="absolute right-3 top-3 w-4 text-slate-500" /><Input autoFocus value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && visibleProducts[0]) { addProduct(visibleProducts[0]); setQuery(''); } }} placeholder="ابحث بالاسم أو SKU أو امسح الباركود ثم Enter" className="pr-10 bg-slate-950 border-slate-700" /></div>
            <div className="flex gap-2 overflow-x-auto pb-1">{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${category === c ? 'bg-[#FF685B] border-[#FF685B]' : 'border-slate-700 text-slate-400'}`}>{c}</button>)}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {visibleProducts.map(product => { const out = Number(product.quantity || 0) <= 0; return <button key={product.id} disabled={out} onClick={() => addProduct(product)} className={`text-right bg-slate-900/80 border rounded-xl p-4 transition ${out ? 'border-red-900/60 opacity-60 cursor-not-allowed' : 'border-slate-800 hover:border-[#FF685B]'}`}><div className="font-bold truncate">{product.name}</div><div className="text-[#FF685B] font-bold mt-2">{money(Number(priceMode === 'wholesale' ? product.wholesale_price || product.sell_price || 0 : product.sell_price || 0), currency)}</div><div className={`text-xs mt-2 ${out ? 'text-red-400' : 'text-slate-400'}`}>{out ? 'المتوفر: 0 - نافد' : `المتوفر: ${product.quantity}`}</div></button>; })}
          </div>
        </section>

        <aside className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4 xl:sticky xl:top-4">
          <div className="flex items-center justify-between"><h2 className="font-bold text-lg">الفاتورة</h2><span className="text-xs text-slate-500">{cart.length} مواد</span></div>
          <div className="relative"><Search className="absolute right-3 top-3 w-4 text-slate-500" /><Input value={customerQuery} onChange={e => { setCustomerQuery(e.target.value); setSelectedCustomer(null); }} placeholder="ابحث عن زبون أو عميل نقدي مباشر" className="pr-10 bg-slate-950 border-slate-700" />{customerQuery && !selectedCustomer && <div className="absolute z-20 top-12 w-full bg-slate-950 border border-slate-700 rounded-lg overflow-hidden">{visibleCustomers.map(c => <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomer({ name: c.name, phone: c.phone || '', address: c.address || '' }); setCustomerQuery(c.name); }} className="block w-full text-right px-3 py-2 hover:bg-slate-800 text-sm">{c.name} <span className="text-slate-500">{c.phone || ''}</span></button>)}<button onClick={() => setCustomerQuery('')} className="w-full text-right px-3 py-2 text-slate-400 hover:bg-slate-800">عميل نقدي مباشر</button></div>}</div>
          {selectedCustomer && <div className="flex justify-between text-xs bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-2"><span>رصيد الزبون: {Number(selectedCustomer.balance || 0).toLocaleString()} د.ع</span><button onClick={() => { setSelectedCustomer(null); setCustomerQuery(''); }}><X className="w-4" /></button></div>}
          <div className="grid grid-cols-2 gap-2"><Input placeholder="اسم الزبون" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} className="bg-slate-950 border-slate-700" /><Input placeholder="رقم الهاتف" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} className="bg-slate-950 border-slate-700" /><Input placeholder="المحافظة / المنطقة" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} className="col-span-2 bg-slate-950 border-slate-700" /></div>
          {!selectedCustomer && customer.name && <button onClick={saveCustomer} className="text-xs text-cyan-400 flex items-center gap-1"><UserPlus className="w-4" /> حفظ كزبون جديد</button>}
          <div className="min-h-24 max-h-56 overflow-y-auto space-y-2 border-y border-slate-800 py-3">{cart.length === 0 && <div className="text-center text-sm text-slate-500 py-8">السلة فارغة</div>}{cart.map(line => <div key={line.id} className="bg-slate-950 rounded-lg p-2 space-y-2"><div className="flex justify-between gap-2 text-sm"><span className="truncate">{line.name}</span><button onClick={() => setCart(cart.filter(x => x.id !== line.id))}><Trash2 className="w-4 text-red-400" /></button></div><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1"><button onClick={() => updateQty(line.id, -1)} className="p-1 bg-slate-800 rounded"><Minus className="w-3" /></button><span className="w-6 text-center text-xs">{line.qty}</span><button onClick={() => updateQty(line.id, 1)} className="p-1 bg-slate-800 rounded"><Plus className="w-3" /></button></div><Input type="number" value={line.price} onChange={e => updatePrice(line.id, Number(e.target.value))} className="h-7 w-24 bg-slate-900 border-slate-700 text-xs" /><span className="text-xs font-bold">{money(line.price * line.qty, currency)}</span></div></div>)}</div>
          <div className="space-y-2 text-sm"><div className="flex justify-between"><span>المجموع الفرعي</span><b>{money(subtotal, currency)}</b></div><div className="flex items-center gap-2"><span>الخصم</span><button onClick={() => setDiscountMode(discountMode === 'amount' ? 'percent' : 'amount')} className="text-xs px-2 py-1 rounded bg-slate-800">{discountMode === 'amount' ? 'د.ع' : '%'}</button><Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="h-8 flex-1 bg-slate-950 border-slate-700" /></div><div className="flex items-center justify-between gap-2"><span>التوصيل</span><Input type="number" value={shipping} onChange={e => setShipping(Number(e.target.value))} className="h-8 w-28 bg-slate-950 border-slate-700" /></div><div className="flex justify-between text-lg font-bold border-t border-slate-700 pt-2"><span>الإجمالي</span><span className="text-emerald-400">{money(total, currency)}</span></div></div>
          <div className="grid grid-cols-3 gap-1 text-xs">{([['cash', 'نقدي كامل'], ['partial', 'دفع جزئي'], ['credit', 'آجل / دين']] as const).map(([key, label]) => <button key={key} onClick={() => setPayment(key)} className={`py-2 rounded border ${payment === key ? 'border-[#FF685B] bg-[#FF685B]/20 text-white' : 'border-slate-700 text-slate-400'}`}>{label}</button>)}</div>
          {payment !== 'cash' && <div className="flex items-center gap-2 text-sm"><span>المبلغ المدفوع</span><Input type="number" value={received} onChange={e => setReceived(Number(e.target.value))} className="h-8 bg-slate-950 border-slate-700" /></div>}
          {payment !== 'cash' && <div className="text-xs text-amber-400">{due > 0 ? `المتبقي دين: ${money(due, currency)}` : `الباقي للزبون: ${money(change, currency)}`}</div>}
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات الفاتورة" className="w-full min-h-16 bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm resize-none" />
          <div className="grid grid-cols-2 gap-2 print:hidden"><button disabled={saving} onClick={() => saveInvoice(false)} className="col-span-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-3 font-bold disabled:opacity-50">{saving ? 'جار الحفظ...' : 'إتمام البيع وحفظ'}</button><button disabled={saving} onClick={() => saveInvoice(true)} className="rounded-lg border border-slate-700 py-2 flex items-center justify-center gap-1"><Printer className="w-4" /> حفظ وطباعة</button><button onClick={suspendInvoice} className="rounded-lg border border-slate-700 py-2 flex items-center justify-center gap-1"><ClipboardList className="w-4" /> تعليق الفاتورة</button></div>
          {suspended.length > 0 && <div className="print:hidden"><p className="text-xs text-slate-500 mb-1">فواتير معلقة</p>{suspended.map((item, index) => <button key={item.invoiceNumber} onClick={() => { setCart(item.cart); setCustomer(item.customer); setPayment(item.payment); setSuspended(suspended.filter((_, i) => i !== index)); }} className="text-xs text-cyan-400 ml-2">{item.invoiceNumber}</button>)}</div>}
        </aside>
      </div>
    </div>
  );
}
