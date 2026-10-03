import { useState } from 'react';
import { Crown } from 'lucide-react';
import { Badge, Button, Input, Label } from '@/components/ui/primitives';
import { PageHeader, EmptyState } from '@/components/shared/misc';
import { AdminNav } from './AdminNav';
import { useAdministrations, useCreateAdministration, useSetCurrentAdministration } from '@/hooks/adminQueries';

const STATUS_STYLE: Record<string, string> = {
  current: 'bg-emerald-100 text-emerald-700',
  upcoming: 'bg-blue-100 text-blue-700',
  archived: 'bg-slate-100 text-slate-600',
};

export default function AdminAdministrations() {
  const { data: administrations = [] } = useAdministrations();
  const create = useCreateAdministration();
  const setCurrent = useSetCurrentAdministration();

  const [name, setName] = useState('');
  const [sessionLabel, setSessionLabel] = useState('');

  return (
    <div>
      <PageHeader title="Administrations" description="Create sessions, set the current one, archive the past. Nothing is ever deleted." />
      <AdminNav />

      <div className="mb-8 rounded-xl border bg-card p-5">
        <p className="mb-4 font-semibold">Create a new administration</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Name</Label>
            <Input placeholder="e.g. 2027/2028 Executive Council" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Session label</Label>
            <Input placeholder="e.g. 2027/2028" value={sessionLabel} onChange={(e) => setSessionLabel(e.target.value)} /></div>
        </div>
        {create.isError && <p className="mt-3 text-sm text-red-600">{(create.error as Error).message}</p>}
        <Button className="mt-4" disabled={!name || !sessionLabel || create.isPending}
          onClick={() => create.mutate({ name, sessionLabel }, { onSuccess: () => { setName(''); setSessionLabel(''); } })}>
          {create.isPending ? 'Creating…' : 'Create administration'}
        </Button>
      </div>

      {administrations.length === 0 ? (
        <EmptyState title="No administrations" hint="Create the first one above." />
      ) : (
        <div className="space-y-3">
          {administrations.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{a.sessionLabel}</p>
                  {a.isCurrent && (
                    <Badge className="bg-accent text-accent-foreground"><Crown className="mr-1 inline h-3 w-3" />Current</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{a.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={STATUS_STYLE[a.status] ?? ''}>{a.status}</Badge>
                {!a.isCurrent && (
                  <Button size="sm" variant="outline" disabled={setCurrent.isPending}
                    onClick={() => { if (window.confirm(`Make ${a.sessionLabel} the current administration? The previous one is archived automatically and the whole site updates.`)) setCurrent.mutate(a.id); }}>
                    Set as current
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}