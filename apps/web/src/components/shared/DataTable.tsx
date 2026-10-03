import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T>({ columns, rows, keyOf, empty }: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  empty?: React.ReactNode;
}) {
  if (!rows.length) return <>{empty ?? <p className="py-10 text-center text-sm text-muted-foreground">Nothing here yet.</p>}</>;
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            {columns.map((c) => (
              <th key={c.header} className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyOf(row)} className="border-b transition-colors last:border-0 hover:bg-muted/40">
              {columns.map((c) => <td key={c.header} className={cn('px-4 py-3 align-middle', c.className)}>{c.cell(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}