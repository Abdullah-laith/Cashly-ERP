'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Icon3DTone = 'orange' | 'emerald' | 'blue' | 'rose' | 'violet' | 'amber';

const toneClasses: Record<Icon3DTone, string> = {
  orange: 'bg-gradient-to-br from-orange-500 to-amber-500 shadow-[inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.2),0_6px_14px_-3px_rgba(249,115,22,0.35)]',
  emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.2),0_6px_14px_-3px_rgba(16,185,129,0.35)]',
  blue: 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.2),0_6px_14px_-3px_rgba(37,99,235,0.35)]',
  rose: 'bg-gradient-to-br from-rose-500 to-red-600 shadow-[inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.2),0_6px_14px_-3px_rgba(225,29,72,0.35)]',
  violet: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-[inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.2),0_6px_14px_-3px_rgba(124,58,237,0.35)]',
  amber: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-[inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.2),0_6px_14px_-3px_rgba(245,158,11,0.35)]',
};

export function Icon3D({ icon: Icon, tone = 'orange', size = 'md', className }: { icon: LucideIcon; tone?: Icon3DTone; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span className={cn(
      'icon-3d relative inline-grid shrink-0 place-items-center rounded-xl border-b-2 border-black/15 text-white transition-all duration-300 ease-out group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-lg group-active:scale-95',
      size === 'sm' && 'h-8 w-8',
      size === 'md' && 'h-10 w-10',
      size === 'lg' && 'h-12 w-12',
      toneClasses[tone],
      className,
    )}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-1 top-0.5 h-1/3 rounded-t-[inherit] bg-gradient-to-b from-white/55 to-transparent" />
      <Icon className={cn('relative z-[1]', size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5')} />
    </span>
  );
}
