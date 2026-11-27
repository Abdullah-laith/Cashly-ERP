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
      'nav-icon inline-grid shrink-0 place-items-center rounded-xl text-white',
      size === 'sm' && 'h-8 w-8',
      size === 'md' && 'h-10 w-10',
      size === 'lg' && 'h-12 w-12',
      toneClasses[tone],
      className,
    )}>
      <Icon className={cn(size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5')} />
    </span>
  );
}
