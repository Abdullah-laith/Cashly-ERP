'use client';
import { Bell, Menu, Sun, Moon, User, AlertTriangle, CreditCard } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import SoundToggle from '@/components/sound-toggle';
import { useOrganization } from '@/components/organization-provider';

type Notice = { id: string; text: string; href: string; kind: 'stock' | 'debt' };

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { organization, trialDaysRemaining } = useOrganization();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const theme = document.documentElement.dataset.theme || (localStorage.getItem('theme') === 'light' ? 'light' : 'dark');
    setIsDarkMode(theme !== 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme !== 'light');
    document.documentElement.classList.add('theme-ready');
  }, []);

  const toggleTheme = () => {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(nextTheme === 'dark');
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.classList.toggle('light', nextTheme === 'light');
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    localStorage.setItem('theme', nextTheme);
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
    <header className="topbar sticky top-0 z-40 flex items-center justify-between px-6 text-white">
      <div className="flex items-center gap-4">
        {trialDaysRemaining !== null && <span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200 sm:inline-flex">تجربة: {trialDaysRemaining} يوم</span>}
        {onMenuClick && <button type="button" aria-label="فتح القائمة" title="القائمة" onClick={onMenuClick} className="icon-button mobile-menu-button"><Menu className="w-5 h-5" /></button>}
        <SoundToggle />
        <button aria-label="تبديل الوضع" title={isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'} onClick={toggleTheme} className="icon-button">
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="relative" ref={box}>
          <button
            aria-label="الإشعارات"
            onClick={() => {
              if (!open) loadNotices();
              setOpen(!open);
            }}
            className="icon-button relative"
          >
            <Bell className="w-5 h-5" />
            {notices.length > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 text-[10px] leading-4 text-center bg-red-500 text-white rounded-full">{notices.length}</span>
            )}
          </button>
          {open && (
            <div className="glass-popover absolute left-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl z-50">
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
            <div className="text-sm font-medium">{organization.business_name || name || '...'}</div>
            <div className="text-xs text-slate-400">{role}</div>
          </div>
          <div className="avatar-glass flex h-9 w-9 items-center justify-center rounded-full">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
