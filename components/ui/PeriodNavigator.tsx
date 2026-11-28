'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PeriodMode = 'daily' | 'monthly' | 'yearly' | 'custom' | 'all';
export type PeriodSelection = {
  mode: PeriodMode;
  date: string;
  month: string;
  year: number;
  startDate: string;
  endDate: string;
};

export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createPeriodSelection = (date = new Date()): PeriodSelection => ({
  mode: 'daily',
  date: localDateKey(date),
  month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
  year: date.getFullYear(),
  startDate: localDateKey(date),
  endDate: localDateKey(date),
});

export function periodRange(selection: PeriodSelection) {
  if (selection.mode === 'all') return null;
  if (selection.mode === 'custom') {
    if (!selection.startDate || !selection.endDate) return null;
    return { start: new Date(`${selection.startDate}T00:00:00`), end: new Date(`${selection.endDate}T23:59:59.999`) };
  }
  if (selection.mode === 'daily') {
    return { start: new Date(`${selection.date}T00:00:00`), end: new Date(`${selection.date}T23:59:59.999`) };
  }
  if (selection.mode === 'monthly') {
    const [year, month] = selection.month.split('-').map(Number);
    return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59, 999) };
  }
  return { start: new Date(selection.year, 0, 1), end: new Date(selection.year, 11, 31, 23, 59, 59, 999) };
}

const monthFormatter = new Intl.DateTimeFormat('ar-IQ', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('ar-IQ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const modes: Array<[PeriodMode, string]> = [['daily', 'يومي'], ['monthly', 'شهري'], ['yearly', 'سنوي'], ['custom', 'فترة مخصصة'], ['all', 'الكل']];

export function PeriodNavigator({ value, onChange, className }: { value: PeriodSelection; onChange: (value: PeriodSelection) => void; className?: string }) {
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const currentDate = new Date();
  const todayKey = localDateKey(currentDate);
  const selectedDate = new Date(`${value.date}T00:00:00`);
  const [selectedYear, selectedMonth] = value.month.split('-').map(Number);
  const monthDate = new Date(selectedYear || currentDate.getFullYear(), (selectedMonth || currentDate.getMonth() + 1) - 1, 1);
  const monthNames = useMemo(() => Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat('ar-IQ', { month: 'long' }).format(new Date(2020, index, 1))), []);
  const update = (patch: Partial<PeriodSelection>) => onChange({ ...value, ...patch });
  const shiftDate = (amount: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + amount);
    const date = localDateKey(next);
    update({ date, startDate: date, endDate: date });
  };
  const shiftMonth = (amount: number) => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + amount, 1);
    update({ month: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}` });
  };
  const monthLabel = monthFormatter.format(monthDate);
  const dayLabel = value.date ? dayFormatter.format(selectedDate) : 'اختر يوماً';

  return <section className={cn('rounded-2xl border border-slate-200 bg-white p-3 shadow-sm', className)} dir="rtl" aria-label="اختيار الفترة الزمنية">
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-50 p-1" role="tablist" aria-label="نمط الفترة">
        {modes.map(([mode, label]) => <button key={mode} type="button" role="tab" aria-selected={value.mode === mode} onClick={() => { update({ mode }); if (mode === 'custom' && !value.startDate) update({ mode, startDate: todayKey, endDate: todayKey }); }} className={cn('rounded-lg px-3 py-2 text-sm font-semibold transition', value.mode === mode ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:bg-orange-50 hover:text-orange-700')}>{label}</button>)}
      </div>
      {value.mode === 'daily' && <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600" onClick={() => shiftDate(-1)} aria-label="اليوم السابق"><ChevronRight className="h-4 w-4" /></button>
        <label className="relative flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-orange-300"><CalendarDays className="h-4 w-4 text-orange-500" /><span>{dayLabel}</span><input type="date" value={value.date} onChange={event => { const date = event.target.value; update({ date, startDate: date, endDate: date }); }} className="absolute inset-0 cursor-pointer opacity-0" aria-label="اختيار يوم" /></label>
        <button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => shiftDate(1)} disabled={value.date >= todayKey} aria-label="اليوم التالي"><ChevronLeft className="h-4 w-4" /></button>
        {value.date !== todayKey && <><button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-orange-300 hover:text-orange-600" onClick={() => { const yesterday = new Date(currentDate); yesterday.setDate(yesterday.getDate() - 1); const date = localDateKey(yesterday); update({ date, startDate: date, endDate: date }); }}>أمس</button><button type="button" className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100" onClick={() => update({ date: todayKey, startDate: todayKey, endDate: todayKey })}>اليوم</button></>}
      </div>}
      {value.mode === 'monthly' && <div className="relative flex items-center gap-2">
        <button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600" onClick={() => shiftMonth(-1)} aria-label="الشهر السابق"><ChevronRight className="h-4 w-4" /></button>
        <button type="button" className="min-w-40 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-orange-300" onClick={() => setMonthPickerOpen(open => !open)}>{monthLabel}</button>
        <button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600" onClick={() => shiftMonth(1)} aria-label="الشهر التالي"><ChevronLeft className="h-4 w-4" /></button>
        {monthPickerOpen && <div className="absolute right-0 top-11 z-20 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><div className="mb-2 flex items-center justify-between"><button type="button" onClick={() => update({ month: `${selectedYear - 1}-${String(selectedMonth).padStart(2, '0')}` })} className="rounded p-1 text-slate-500 hover:bg-orange-50"><ChevronRight className="h-4 w-4" /></button><strong className="text-sm">{selectedYear}</strong><button type="button" onClick={() => update({ month: `${selectedYear + 1}-${String(selectedMonth).padStart(2, '0')}` })} className="rounded p-1 text-slate-500 hover:bg-orange-50"><ChevronLeft className="h-4 w-4" /></button></div><div className="grid grid-cols-3 gap-1">{monthNames.map((name, index) => <button type="button" key={name} onClick={() => { update({ month: `${selectedYear}-${String(index + 1).padStart(2, '0')}` }); setMonthPickerOpen(false); }} className={cn('rounded-lg px-2 py-2 text-xs', index + 1 === selectedMonth ? 'bg-orange-500 font-bold text-white' : 'text-slate-600 hover:bg-orange-50 hover:text-orange-700')}>{name}</button>)}</div></div>}
      </div>}
      {value.mode === 'yearly' && <div className="flex items-center gap-2"><button type="button" onClick={() => update({ year: value.year - 1 })} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-orange-300" aria-label="السنة السابقة"><ChevronRight className="h-4 w-4" /></button><span className="min-w-20 text-center text-lg font-bold tabular-nums">{value.year}</span><button type="button" onClick={() => update({ year: value.year + 1 })} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-orange-300" aria-label="السنة التالية"><ChevronLeft className="h-4 w-4" /></button></div>}
      {value.mode === 'custom' && <div className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-xs font-semibold text-slate-600">من<input type="date" value={value.startDate} max={value.endDate || undefined} onChange={event => update({ startDate: event.target.value })} className="h-9 rounded-lg border border-slate-200 px-2 text-sm font-normal text-slate-800" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">إلى<input type="date" value={value.endDate} min={value.startDate || undefined} onChange={event => update({ endDate: event.target.value })} className="h-9 rounded-lg border border-slate-200 px-2 text-sm font-normal text-slate-800" /></label></div>}
      {value.mode === 'all' && <span className="text-sm font-semibold text-slate-600">عرض جميع الفواتير والعمليات</span>}
    </div>
  </section>;
}
