'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Receipt, CheckCircle, FileText, RotateCcw, Minus, Plus, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logTransaction } from '@/lib/ledger';
import { useToast } from '@/components/ui/toast-provider';

interface Product {
  id: string;
  name: string;
  sell_price: number;
  quantity: number;
}

export default function InvoicingPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').gt('quantity', 0);
    if (data) setProducts(data);
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing && existing.qty >= product.quantity) return showToast('الكمية غير متوفرة');
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? {...item, qty: item.qty + 1} : item));
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const updateQty = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].qty += delta;
    if (newCart[index].qty <= 0) newCart.splice(index, 1);
    else if (newCart[index].qty > newCart[index].product.quantity) return;
    setCart(newCart);
  };

  const completeSale = async () => {
    if (paymentType === 'credit' && (!customerName || !customerPhone)) return showToast('يرجى إدخال اسم ورقم الزبون للبيع الآجل');

    const totalBeforeDiscount = cart.reduce((sum, item) => sum + item.product.sell_price * item.qty, 0);
    const finalTotal = totalBeforeDiscount - discount;
    const debt = paymentType === 'credit' ? finalTotal - (paidAmount || 0) : 0;

    try {
      const { data: invoice, error } = await supabase.from('invoices').insert([{
        total_amount: finalTotal, customer_name: customerName, customer_phone: customerPhone,
        payment_type: paymentType, remaining_debt: debt
      }]).select().single();

      if (error) throw error;

      for (const item of cart) {
        await supabase.from('products').update({ quantity: item.product.quantity - item.qty }).eq('id', item.product.id);
      }

      setLastInvoice({ ...invoice, items: cart });
      await logTransaction('SALE', invoice.id, finalTotal, `فاتورة بيع للزبون: ${customerName || 'عميل نقدي'}`);
      setSaleSuccess(true);
      showToast('تمت عملية البيع بنجاح!');
      setCart([]); setCustomerName(''); setCustomerPhone(''); setPaidAmount(0); setDiscount(0);
      fetchProducts();
    } catch (err: any) { showToast('خطأ: ' + err.message); }
  };

  const total = cart.reduce((sum, item) => sum + item.product.sell_price * item.qty, 0);

  return (
    <div className="p-8 space-y-6 bg-[#0F172A] min-h-screen text-white">
      <h1 className="text-3xl font-bold">نقطة البيع (POS)</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Input placeholder="بحث عن منتج..." className="bg-[#1E293B] border-slate-700" onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {products.filter(p => p.name.includes(searchTerm)).map(p => (
              <div key={p.id} className="bg-[#1E293B] p-4 rounded-xl border border-slate-700">
                <h3 className="font-bold">{p.name}</h3>
                <p className="text-xs text-slate-400">المتوفر: {p.quantity}</p>
                <p className="text-[#FF6B5B] font-bold">{p.sell_price.toLocaleString()} د.ع</p>
                <Button onClick={() => addToCart(p)} className="w-full mt-2">إضافة</Button>
              </div>
            ))}
          </div>
        </div>

        <Card className="bg-[#1E293B] border-slate-700 h-fit">
          <CardHeader><CardTitle>الفاتورة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2"><input type="radio" name="pay" value="cash" checked={paymentType === 'cash'} onChange={() => setPaymentType('cash')} /> نقدي</label>
              <label className="flex items-center gap-2"><input type="radio" name="pay" value="credit" checked={paymentType === 'credit'} onChange={() => setPaymentType('credit')} /> آجل</label>
            </div>
            <Input placeholder="اسم الزبون" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <Input placeholder="رقم الهاتف" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            <Input type="number" placeholder="خصم الفاتورة" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            {paymentType === 'credit' && <Input type="number" placeholder="المبلغ المدفوع مقدماً" onChange={(e) => setPaidAmount(Number(e.target.value))} />}

            {cart.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span>{item.product.name}</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => updateQty(i, -1)}><Minus className="w-3 h-3"/></Button>
                  <span>{item.qty}</span>
                  <Button size="sm" onClick={() => updateQty(i, 1)}><Plus className="w-3 h-3"/></Button>
                  <Button size="sm" variant="destructive" onClick={() => setCart(cart.filter((_, idx) => idx !== i))}><Trash2 className="w-3 h-3"/></Button>
                </div>
              </div>
            ))}
            <div className="text-xl font-bold pt-4 border-t">الإجمالي: {(total - discount).toLocaleString()} د.ع</div>
            <Button onClick={completeSale} className="w-full bg-[#10B981]">إتمام البيع</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
