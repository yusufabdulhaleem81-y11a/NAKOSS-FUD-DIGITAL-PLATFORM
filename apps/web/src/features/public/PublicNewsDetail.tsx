import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/primitives';
import { contentService } from '@/services/content.service';
import { formatDate } from '@/lib/utils';

export default function PublicNewsDetail() {
  const { slug = '' } = useParams();
  const { data: n, isLoading, isError } = useQuery({
    queryKey: ['public-news-item', slug],
    queryFn: () => contentService.getNewsItem(slug),
    retry: false,
  });

  if (isLoading) return <div className="container max-w-3xl py-12"><Skeleton className="h-10 w-3/4" /><Skeleton className="mt-6 h-64 rounded-xl" /></div>;

  if (isError || !n) {
    return (
      <div className="container max-w-3xl py-16 text-center">
        <p className="text-lg font-semibold">Article not found</p>
        <Link to="/news" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Back to news</Link>
      </div>
    );
  }

  return (
    <article className="container max-w-3xl py-12">
      <Link to="/news" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> All news</Link>
      <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">{n.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {formatDate(n.publishedAt)}{n.authorName ? ` · by ${n.authorName}` : ''}
      </p>
      {n.coverImageUrl && <img src={n.coverImageUrl} alt="" className="mt-6 w-full rounded-xl object-cover" />}
      {/* Paragraph rendering only — never raw HTML (XSS-safe) */}
      <div className="mt-6 space-y-4">
        {(n.body ?? '').split(/\n{2,}/).map((para, i) => (
          <p key={i} className="leading-relaxed text-foreground/90">{para}</p>
        ))}
      </div>
    </article>
  );
}