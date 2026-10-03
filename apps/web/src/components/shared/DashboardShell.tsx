import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, BriefcaseBusiness, GraduationCap, Inbox, Landmark, LogOut, Menu, Network, ShieldCheck, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge, Button } from '@/components/ui/primitives';
import { LogoMark } from './misc';
import { NotificationsBell } from './NotificationsBell';
import { useAuthStore } from '@/store/auth.store';
import { useCurrentAdministration } from '@/hooks/queries';
import type { AppRole } from '@/types/auth';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem { label: string; href: string; icon: LucideIcon; roles?: AppRole[] }

const NAV_ITEMS: NavItem[] = [
  { label: 'President', href: '/president', icon: Landmark, roles: ['president'] },
  { label: 'Vice President', href: '/vp', icon: Network, roles: ['vice_president'] },
  { label: 'EXCO Workspace', href: '/exco', icon: BriefcaseBusiness, roles: ['exco', 'president', 'vice_president', 'central_admin'] },
  { label: 'Member Portal', href: '/member', icon: GraduationCap },
  { label: 'Submissions', href: '/member/submissions', icon: Inbox },
  { label: 'Resources', href: '/member/resources', icon: BookOpen },
  { label: 'Central Admin', href: '/admin', icon: ShieldCheck, roles: ['central_admin'] },
];

export function DashboardShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuthStore();
  const hasRole = useAuthStore((s) => s.hasRole);
  const { data: administration } = useCurrentAdministration();
  const navigate = useNavigate();

  const items = NAV_ITEMS.filter((i) => !i.roles || hasRole(...i.roles));
  const initials = profile?.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <LogoMark />
        <div>
          <p className="text-sm font-bold leading-tight">NAKOSS Digital</p>
          <p className="text-[11px] text-muted-foreground">FUD Chapter</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <NavLink key={item.href} to={item.href}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }: { isActive: boolean }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
            <item.icon className="h-4 w-4" /> {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t px-5 py-4 text-xs text-muted-foreground">
        {administration ? <>Administration<br /><span className="font-semibold text-foreground">{administration.sessionLabel}</span></> : '—'}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-card">
            <button className="absolute right-3 top-4 p-1" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button>

          {administration && (
            <Badge className="hidden bg-secondary text-secondary-foreground sm:inline-flex">
              Administration {administration.sessionLabel}
            </Badge>
          )}

          <div className="ml-auto flex items-center gap-2">
            <NotificationsBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 hover:bg-muted">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials}</span>
                  <span className="hidden text-left md:block">
                    <span className="block text-sm font-medium leading-tight">{profile?.fullName}</span>
                    <span className="block text-[11px] text-muted-foreground">{profile?.position ?? 'Member'}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{profile?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/change-password')}>Change password</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600" onSelect={() => void signOut().then(() => navigate('/login'))}>
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}