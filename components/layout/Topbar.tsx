'use client';
import { Bell, Sun, Moon, Plus, User, AlertTriangle, CreditCard } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Notice = { id: string; text: string; href: string; kind: 'stock' | 'debt' };

export default function Topbar() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const light = localStorage.getItem('theme') === 'light';
    setIsDarkMode(!light);
    document.documentElement.classList.toggle('light', light);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    document.documentElement.classList.toggle('light', !nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
  };

  const loadNotices = async () => {
    const list: Notice[] = [];
    const { data: prods } = await supabase.from('products').select('id,name,quantity,min_quantity');
    for (const p of prods || []) {
      if (Number(p.quantity) <= Number(p.min_quantity ?? 5)) {
        list.push({ id: 'p' + p.id, kind: 'stock', href: '/dashboard/inventory', text: `مخزون منخفض: ${p.name} (${p.quantity} متبقي)` });
      }
    }
    const { data: debts } = await supabase.from('invoices').select('remaining_debt').is('deleted_at', null).gt('remaining_debt', 0);
    if (debts && debts.length) {
      const total = debts.reduce((a, d) => a + Number(d.remaining_debt), 0);
      list.push({ id: 'debts', kind: 'debt', href: '/dashboard/debts', text: `${debts.length} فاتورة غير مسددة بإجمالي ${total.toLocaleString()} د.ع` });
    }
    setNotices(list);
  };

  useEffect(() => {
    loadNotices();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
      const labels: Record<string, string> = { admin: 'مدير النظام', manager: 'مدير', cashier: 'كاشير' };
      setRole(data?.role ? labels[data.role] || data.role : '');
    });
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <header className="h-16 bg-[#070B14] border-b border-slate-800 flex items-center justify-between px-6 text-white">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/dashboard/invoicing')} className="bg-[#FF685B] hover:bg-[#ff5545] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> إنشاء فاتورة
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button aria-label="تبديل الوضع" title={isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'} onClick={toggleTheme} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="relative" ref={box}>
          <button
            aria-label="الإشعارات"
            onClick={() => {
              if (!open) loadNotices();
              setOpen(!open);
            }}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {notices.length > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 text-[10px] leading-4 text-center bg-red-500 text-white rounded-full">{notices.length}</span>
            )}
          </button>
          {open && (
            <div className="absolute left-0 mt-2 w-80 max-h-96 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50">
              <div className="px-4 py-3 border-b border-slate-700 font-bold text-sm">الإشعارات</div>
              {notices.length === 0 && <div className="px-4 py-6 text-sm text-slate-400 text-center">لا توجد إشعارات</div>}
              {notices.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setOpen(false);
                    router.push(n.href);
                  }}
                  className="w-full flex items-start gap-3 px-4 py-3 text-right text-sm hover:bg-slate-800 border-b border-slate-800 last:border-0"
                >
                  {n.kind === 'stock' ? <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" /> : <CreditCard className="w-4 h-4 mt-0.5 text-rose-500 shrink-0" />}
                  <span>{n.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="text-right">
            <div className="text-sm font-medium">{name || '...'}</div>
            <div className="text-xs text-slate-400">{role}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
