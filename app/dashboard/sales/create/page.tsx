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

  useEffect(() => {
    supabase.from('products').select('*').then(({ data }) => setProducts(data || []));
  }, []);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const subtotal = cart.reduce((a, b) => a + b.sell_price * b.qty, 0);
  const total = subtotal - discount;

  const saveInvoice = async () => {
    try {
      // 1. Create Invoice
      const { data: inv, error: invErr } = await supabase.from('sales_invoices').insert([{
        total_amount: total,
        customer_name: customer.name,
        payment_type: paymentType,
        remaining_debt: paymentType === 'credit' ? total - received : 0
      }]).select().single();
      if (invErr) throw invErr;

      // 2. Reduce Inventory
      for (const item of cart) {
        const { data: stock } = await supabase
          .from('product_warehouse_stock')
          .select('quantity')
          .eq('product_id', item.id)
          .maybeSingle();
        await supabase
          .from('product_warehouse_stock')
          .update({ quantity: Math.max(0, Number(stock?.quantity || 0) - item.qty) })
          .eq('product_id', item.id);
      }

      soundEngine.playSuccess();
      toast.success('تم إتمام البيع بنجاح');
      setCart([]);
    } catch (e: any) {
      soundEngine.playError();
      toast.error('خطأ: ' + e.message);
    }
  };

  return (
    <div className="p-6 grid grid-cols-12 gap-6 h-full text-slate-200">
      {/* Product List */}
      <div className="col-span-8 space-y-4">
        <Input placeholder="بحث بالاسم أو الباركود..." className="bg-slate-900 border-slate-700" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <div className="grid grid-cols-4 gap-4">
          {products.filter(p => p.name.includes(searchTerm)).map(p => (
            <Card key={p.id} className="bg-slate-900 border-slate-800 cursor-pointer hover:border-[#FF685B]" onClick={() => addToCart(p)}>
              <CardContent className="p-4">
                <p className="font-bold">{p.name}</p>
                <p className="text-sm">{p.sell_price} د.ع</p>
                <p className="text-xs">المتوفر: {p.quantity}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart & Summary */}
      <div className="col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold">الفاتورة</h2>
        <div className="space-y-2 h-64 overflow-y-auto">
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between items-center bg-slate-800 p-2 rounded">
              <span>{item.name} x {item.qty}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => setCart(prev => prev.map(x => x.id === item.id ? {...x, qty: x.qty - 1} : x).filter(x => x.qty > 0))}><Minus className="w-4"/></Button>
                <span>{item.sell_price * item.qty}</span>
                <Button variant="ghost" size="icon" onClick={() => setCart(prev => prev.filter(x => x.id !== item.id))}><Trash2 className="w-4 text-red-500"/></Button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <div className="flex justify-between"><span>المجموع:</span> <span>{subtotal}</span></div>
          <Input type="number" placeholder="خصم" onChange={(e) => setDiscount(Number(e.target.value))} className="bg-slate-800 border-slate-700" />
          <div className="font-bold text-xl flex justify-between"><span>الإجمالي:</span> <span>{total}</span></div>
        </div>
        <Button className="w-full bg-[#FF685B] text-white" onClick={saveInvoice}>إتمام البيع</Button>
      </div>
    </div>
  );
}
