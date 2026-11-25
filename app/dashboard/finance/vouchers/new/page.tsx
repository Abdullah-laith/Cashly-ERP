'use client';
import { useState, useEffect } from 'react';
import { getTreasuries, addVoucher } from '@/lib/finance';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { soundEngine } from '@/lib/sound-engine';

export default function AddVoucherPage({ type }: { type: 'expense' | 'receipt' }) {
  const [treasuries, setTreasuries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTreasuries().then(setTreasuries);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Logic for adding voucher
      soundEngine.playSuccess();
      toast.success('تم حفظ السند بنجاح');
    } catch (error) {
      soundEngine.playError();
      toast.error('حدث خطأ أثناء حفظ السند');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-2xl bg-slate-900/60 rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-4">{type === 'expense' ? 'سند صرف جديد' : 'سند قبض جديد'}</h2>
      <Input type="number" placeholder="المبلغ" required />
      <Input placeholder="البيان / الوصف" />
      <Button type="submit" className="w-full bg-[#FF685B]" disabled={loading}>حفظ السند</Button>
    </form>
  );
}
