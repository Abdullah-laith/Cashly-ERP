'use client';

import { Inbox, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
};

export function EmptyState({ title, description, actionLabel, onAction, icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-500">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {actionLabel && onAction && (
        <Button type="button" onClick={onAction} className="mt-5 bg-orange-500 text-white hover:bg-orange-600">
          <Plus className="ml-2 h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3 p-4" aria-label="جاري تحميل البيانات" role="status">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, column) => <span key={column} className="h-4 animate-pulse rounded-xl bg-slate-200/70" />)}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="جاري تحميل البيانات" role="status">
      {Array.from({ length: count }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />)}
    </div>
  );
}
