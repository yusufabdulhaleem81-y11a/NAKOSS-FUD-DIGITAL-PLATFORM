import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  default: 'bg-muted text-muted-foreground',
  green: 'bg-emerald-100 text-emerald-700',
  gold: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-600',
  blue: 'bg-blue-100 text-blue-700',
} as const;

export function DashboardStat({ label, value, icon: Icon, tone = 'default', hint }: {
  label: string; value: React.ReactNode; icon: LucideIcon; tone?: keyof typeof TONES; hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={cn('rounded-lg p-2', TONES[tone])}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}