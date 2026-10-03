import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

export function PageHeader({ title, description, actions }: {
  title: string; description?: string; actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function ChartCard({ title, description, className, children }: {
  title: string; description?: string; className?: string; children: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader><CardTitle>{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  if (BRAND.logoUrl) {
    return (
      <img
        src={BRAND.logoUrl}
        alt={BRAND.associationName}
        className={cn('h-9 w-9 rounded-lg object-contain', className)}
      />
    );
  }
  return (
    <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-extrabold text-primary-foreground', className)}>
      {BRAND.monogram}
    </div>
  );
}