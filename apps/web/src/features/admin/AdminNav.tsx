import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/students', label: 'Students', end: false },
  { to: '/admin/exco', label: 'EXCO', end: false },
  { to: '/admin/administrations', label: 'Administrations', end: false },
  { to: '/admin/audit', label: 'Audit Log', end: false },
];

export function AdminNav() {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end}
          className={({ isActive }: { isActive: boolean }) =>cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            isActive ? 'bg-primary text-primary-foreground' : 'border bg-card text-muted-foreground hover:bg-muted',
          )}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}