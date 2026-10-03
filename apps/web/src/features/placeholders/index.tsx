import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Megaphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/primitives';
import { PageHeader } from '@/components/shared/misc';
import { LogoMark } from '@/components/shared/misc';
import { useCurrentAdministration, useLeadership } from '@/hooks/queries';
import { contentService } from '@/services/content.service';
import { useQuery } from '@tanstack/react-query';
import { BRAND } from '@/lib/brand';
import { formatDate } from '@/lib/utils';

export function PublicHome() {
  const { data: administration } = useCurrentAdministration();
  const { data: leadership = [] } = useLeadership();
  const { data: news } = useQuery({ queryKey: ['public-news', 1], queryFn: () => contentService.getNews(1) });
  const { data: events } = useQuery({ queryKey: ['public-events'], queryFn: () => contentService.getEvents() });

  const filled = leadership.filter((l) => l.holderName);
  const upcoming = (events ?? [])
    .filter((e) => new Date(e.startAt) >= new Date())
    .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
    .slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="container relative py-16 md:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <Megaphone className="h-3.5 w-3.5" />
              {administration ? `Current Administration — ${administration.sessionLabel}` : BRAND.chapter}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              One identity. Every administration.
            </h1>
            <p className="mt-4 text-base opacity-85">
              Membership, digital IDs, governance and resources for the NAKOSS community —
              built to outlast every administration.
            </p>
            {administration?.motto && <p className="mt-2 text-sm italic opacity-70">“{administration.motto}”</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex h-11 items-center rounded-lg bg-accent px-6 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
                Student Registration
              </Link>
              <Link to="/login" className="inline-flex h-11 items-center rounded-lg border border-white/30 bg-white/10 px-6 text-sm font-medium backdrop-blur hover:bg-white/20">
                Member Login
              </Link>
            </div>
            {administration && (
              <div className="mt-8 flex gap-10 text-sm">
                <div><p className="text-xs opacity-70">President</p><p className="font-semibold">{administration.presidentName ?? '—'}</p></div>
                <div><p className="text-xs opacity-70">Vice President</p><p className="font-semibold">{administration.vicePresidentName ?? '—'}</p></div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Leadership preview — live from the current administration */}
      <section className="container py-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Current Leadership</h2>
            <p className="mt-1 text-sm text-muted-foreground">Serving for {administration?.sessionLabel ?? 'the current session'}</p>
          </div>
          <p className="text-sm text-muted-foreground">{filled.length} of {leadership.length} offices filled</p>
        </div>
        {filled.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Leadership assignments appear here automatically once officers are assigned.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {filled.slice(0, 8).map((l) => (
              <div key={l.position} className="flex items-center gap-3 rounded-xl border bg-card p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {l.holderName?.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{l.holderName}</p>
                  <p className="text-xs text-muted-foreground">{l.position}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Latest news */}
      <section className="bg-muted/40 py-14">
        <div className="container">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Latest News</h2>
            <Link to="/news" className="text-sm font-medium text-primary hover:underline">All news →</Link>
          </div>
          {(news?.data ?? []).length === 0 ? (
            <p className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">News will appear here once published.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {(news?.data ?? []).slice(0, 3).map((n) => (
                <Link key={n.slug} to={`/news/${n.slug}`} className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
                  {n.coverImageUrl
                    ? <img src={n.coverImageUrl} alt="" className="h-40 w-full object-cover" />
                    : <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-[#0b3d23] to-[#0f4d2b]"><LogoMark className="h-12 w-12 rounded-xl bg-white/15" /></div>}
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground">{formatDate(n.publishedAt)}</p>
                    <p className="mt-1 font-semibold leading-snug group-hover:text-primary">{n.title}</p>
                    {n.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upcoming events */}
      <section className="container py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Upcoming Events</h2>
          <Link to="/events" className="text-sm font-medium text-primary hover:underline">All events →</Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No upcoming events scheduled yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {upcoming.map((e) => (
              <div key={e.slug} className="rounded-xl border bg-card p-5">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{formatDate(e.startAt)}</p>
                <p className="mt-1.5 font-semibold">{e.title}</p>
                {e.location && <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{e.location}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function ModulePlaceholder() {
  return <PageHeader title="Module" description="This office module is built in a later phase; navigation and permissions are already wired." />;
}

export function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-6xl font-extrabold text-primary">403</p>
      <p className="text-muted-foreground">You don't have access to that area.</p>
      <Link to="/" className="text-sm font-medium text-primary hover:underline">Go back</Link>
    </div>
  );
}

export function LegacyPlaceholder() {
  return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Coming soon.</CardContent></Card>;
}