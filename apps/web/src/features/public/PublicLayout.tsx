import { NavLink, Link, Outlet } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { LogoMark } from '@/components/shared/misc';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { useCurrentAdministration } from '@/hooks/queries';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/news', label: 'News', end: false },
  { to: '/events', label: 'Events', end: false },
  { to: '/projects', label: 'Projects', end: false },
  { to: '/gallery', label: 'Gallery', end: false },
];

export default function PublicLayout() {
  const { data: administration } = useCurrentAdministration();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="container flex h-16 items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark />
            <div className="leading-tight">
              <p className="text-sm font-bold">{BRAND.platformName}</p>
              <p className="text-[11px] text-muted-foreground">{BRAND.chapter}</p>
            </div>
          </Link>

          <nav className="hidden gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }: { isActive: boolean }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {administration && (
              <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground lg:inline">
                Administration {administration.sessionLabel}
              </span>
            )}
            <Link to="/login" className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-muted">
              <LogIn className="h-3.5 w-3.5" /> Login
            </Link>
            <Link to="/register" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <UserPlus className="h-3.5 w-3.5" /> Register
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t bg-card">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} {BRAND.fullName}</p>
          <p className="italic">“{BRAND.tagline}”</p>
        </div>
      </footer>
    </div>
  );
}