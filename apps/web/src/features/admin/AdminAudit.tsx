import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button, Input } from '@/components/ui/primitives';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader, EmptyState } from '@/components/shared/misc';
import { AdminNav } from './AdminNav';
import { useAudit } from '@/hooks/adminQueries';
import { formatDate, timeAgo } from '@/lib/utils';
import type { AuditRow } from '@/services/admin.service';

export default function AdminAudit() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data } = useAudit({ page, q });

  const rows = data?.data ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <PageHeader title="Audit Log" description="Every administrative action — who, what, when." />
      <AdminNav />

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Filter by action (e.g. member., task., exco.)"
          value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>

      <DataTable
        rows={rows} keyOf={(r) => String(r.id)}
        empty={<EmptyState title="No audit entries" hint="Actions appear here as admins work." />}
        columns={[
          { header: 'When', cell: (r) => <span className="whitespace-nowrap text-xs text-muted-foreground" title={formatDate(r.createdAt)}>{timeAgo(r.createdAt)}</span> },
          { header: 'Actor', cell: (r) => <span className="text-sm font-medium">{r.actor}</span> },
          { header: 'Action', cell: (r) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.action}</code> },
          { header: 'Target', cell: (r) => <span className="text-xs text-muted-foreground">{r.targetType ?? '—'}</span> },
          { header: 'Details', cell: (r) => <span className="line-clamp-1 max-w-64 text-xs text-muted-foreground">{JSON.stringify(r.metadata)}</span> },
        ]}
      />

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.total} entries · page {data.page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}