import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogoMark } from '@/components/shared/misc';
import { Button, Skeleton } from '@/components/ui/primitives';
import { contentService } from '@/services/content.service';
import { formatDate } from '@/lib/utils';

export default function PublicNewsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['public-news', page], queryFn: () => contentService.getNews(page) });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">News</h1>
      <p className="mt-1 text-muted-foreground">Updates and stories from the association.</p>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        {(data?.data ?? []).map((n) => (
          <Link key={n.slug} to={`/news/${n.slug}`} className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
            {n.coverImageUrl
              ? <img src={n.coverImageUrl} alt="" className="h-44 w-full object-cover" />
              : <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-[#0b3d23] to-[#0f4d2b]"><LogoMark className="h-12 w-12 rounded-xl bg-white/15" /></div>}
            <div className="p-5">
              <p className="text-xs text-muted-foreground">{formatDate(n.publishedAt)}</p>
              <p className="mt-1.5 font-semibold leading-snug group-hover:text-primary">{n.title}</p>
              {n.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{n.excerpt}</p>}
            </div>
          </Link>
        ))}
      </div>

      {!isLoading && (data?.data ?? []).length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No news published yet.</p>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="px-3 py-2 text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}