
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/primitives';
import { contentService } from '@/services/content.service';
import { formatDate } from '@/lib/utils';

export default function PublicEventsPage() {
  const { data: events = [], isLoading } = useQuery({ queryKey: ['public-events'], queryFn: () => contentService.getEvents() });

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.startAt) >= now);
  const past = events.filter((e) => new Date(e.startAt) < now).reverse();

  const EventCard = ({ e }: { e: typeof events[number] }) => (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold leading-snug">{e.title}</p>
        <span className="shrink-0 rounded-lg bg-secondary px-2.5 py-1 text-center text-xs font-semibold text-secondary-foreground">
          {formatDate(e.startAt)}
        </span>
      </div>
      {e.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(e.startAt)}{e.endAt ? ` – ${formatDate(e.endAt)}` : ''}</span>
        {e.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{e.location}</span>}
      </div>
    </div>
  );

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">Events</h1>

      <h2 className="mb-4 mt-8 text-lg font-semibold">Upcoming</h2>
      {isLoading ? <Skeleton className="h-24 rounded-xl" /> : upcoming.length === 0
        ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No upcoming events.</p>
        : <div className="grid gap-4 md:grid-cols-2">{upcoming.map((e) => <EventCard key={e.slug} e={e} />)}</div>}

      {past.length > 0 && (
        <>
          <h2 className="mb-4 mt-10 text-lg font-semibold text-muted-foreground">Past events</h2>
          <div className="grid gap-4 opacity-75 md:grid-cols-2">{past.map((e) => <EventCard key={e.slug} e={e} />)}</div>
        </>
      )}
    </div>
  );
}