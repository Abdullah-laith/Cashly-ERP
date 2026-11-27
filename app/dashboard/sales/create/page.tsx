'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Minus, Trash2, Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { soundEngine } from '@/lib/sound-engine';

export default function POSPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [discount, setDiscount] = useState(0);
  const [received, setReceived] = useState(0);
  const [paymentType, setPaymentType] = useState('cash');
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');

  useEffect(() => {
    supabase.from('products').select('*').then(({ data }) => setProducts(data || []));
  }, []);

  const availableQuantity = (product: any) => Number(product.quantity ?? 0);
  const addToCart = (product: any) => {
    const available = availableQuantity(product);
    if (available <= 0) return toast.error('هذا المنتج نافد من المخزون');
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= available) {
          toast.error(`الكمية المطلوبة غير متوفرة، المتبقي في المخزن: ${available}`);
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const subtotal = cart.reduce((a, b) => a + Number(b.sell_price || 0) * b.qty, 0);
  const discountValue = discountMode === 'percent'
    ? subtotal * Math.min(100, Math.max(0, discount)) / 100
    : Math.max(0, discount);
  const total = Math.max(0, subtotal - discountValue);

  const saveInvoice = async () => {
    try {
      const { data: latestProducts, error: stockReadError } = await supabase
        .from('products')
        .select('id, quantity')
        .in('id', cart.map(item => item.id));
      if (stockReadError) throw stockReadError;
      const latestById = new Map((latestProducts || []).map(product => [product.id, Number(product.quantity ?? 0)]));
      const unavailable = cart.find(item => item.qty > (latestById.get(item.id) || 0));
      if (unavailable) {
        const remaining = latestById.get(unavailable.id) || 0;
        throw new Error(`الكمية المطلوبة غير متوفرة، المتبقي في المخزن: ${remaining}`);
      }

      const { error: invoiceError } = await supabase.rpc('create_sales_invoice_with_stock', {
        invoice_payload: {
          total_amount: total,
          customer_id: null,
        },
        invoice_items_payload: cart.map(item => ({ product_id: item.id, quantity: item.qty })),
      });
      if (invoiceError) throw invoiceError;

      soundEngine.playSuccess();
      toast.success('تم إتمام البيع بنجاح');
      setCart([]);
    } catch (e: any) {
      soundEngine.playError();
      const message = e?.code === 'PGRST202'
        ? 'دالة حفظ الفاتورة غير مفعّلة في قاعدة البيانات. طبّق migration create_invoice_with_stock ثم أعد المحاولة.'
        : `خطأ: ${e?.message || 'تعذر حفظ الفاتورة'}`;
      toast.error(message);
    }
  };

  return (
    <div className="p-6 grid grid-cols-12 gap-6 h-full text-slate-800">
      {/* Product List */}
      <div className="col-span-8 space-y-4">
        <Input placeholder="بحث بالاسم أو الباركود..." className="bg-white border-slate-200/80" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <div className="grid grid-cols-4 gap-4">
          {products.filter(p => p.name.includes(searchTerm)).map(p => {
            const available = availableQuantity(p);
            const out = available <= 0;
            return (
              <Card key={p.id} className={`bg-white border-slate-200/80 ${out ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-[#FF685B]'}`} onClick={() => addToCart(p)}>
                <CardContent className="p-4">
                  <p className="font-bold">{p.name}</p>
                  <p className="text-sm">{p.sell_price} د.ع</p>
                  <p className={`text-xs ${out ? 'text-red-400' : 'text-slate-500'}`}>{out ? 'نفدت الكمية' : `المتوفر: ${available}`}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Cart & Summary */}
      <div className="col-span-4 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold">الفاتورة</h2>
        <div className="space-y-2 h-64 overflow-y-auto">
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
              <span>{item.name} x {item.qty}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => setCart(prev => prev.map(x => x.id === item.id ? {...x, qty: x.qty - 1} : x).filter(x => x.qty > 0))}><Minus className="w-4"/></Button>
                <Button variant="ghost" size="icon" onClick={() => addToCart(item)}><Plus className="w-4"/></Button>
                <span>{item.sell_price * item.qty}</span>
                <Button variant="ghost" size="icon" onClick={() => setCart(prev => prev.filter(x => x.id !== item.id))}><Trash2 className="w-4 text-red-500"/></Button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200/80 pt-4 space-y-2">
          <div className="flex justify-between"><span>المجموع:</span> <span>{subtotal}</span></div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setDiscountMode(mode => mode === 'amount' ? 'percent' : 'amount')}>{discountMode === 'amount' ? 'د.ع' : '%'}</Button>
            <Input type="number" min="0" max={discountMode === 'percent' ? 100 : undefined} placeholder="خصم" value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} className="bg-slate-50 border-slate-200/80" />
          </div>
          <div className="font-bold text-xl flex justify-between"><span>الإجمالي:</span> <span>{total}</span></div>
        </div>
        <Button className="w-full bg-[#FF685B] text-white" onClick={saveInvoice}>إتمام البيع</Button>
      </div>
    </div>
  );
}
