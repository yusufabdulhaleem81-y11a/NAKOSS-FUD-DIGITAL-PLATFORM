import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Images } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui/primitives';
import { LogoMark } from '@/components/shared/misc';
import { galleryService } from '@/services/gallery.service';
import { formatDate } from '@/lib/utils';

export default function PublicGalleryPage() {
  const [albumId, setAlbumId] = useState<string | null>(null);
  const { data: albums = [], isLoading } = useQuery({ queryKey: ['public-gallery'], queryFn: () => galleryService.publicAlbums() });
  const { data: album } = useQuery({
    queryKey: ['public-gallery-album', albumId],
    queryFn: () => galleryService.album(albumId!),
    enabled: !!albumId,
  });

  if (albumId && album) {
    return (
      <div className="container py-12">
        <Button variant="ghost" size="sm" onClick={() => setAlbumId(null)}><ArrowLeft className="h-4 w-4" /> All albums</Button>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{album.title}</h1>
        {album.description && <p className="mt-1 text-muted-foreground">{album.description}</p>}
        <p className="mt-1 text-sm text-muted-foreground">{album.photos.length} photo(s) · {formatDate(album.createdAt)}</p>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {album.photos.map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border bg-card">
              <img src={p.url} alt={p.caption ?? album.title} className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">Gallery</h1>
      <p className="mt-1 text-muted-foreground">Moments from association life.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        {albums.map((a) => (
          <button key={a.id} onClick={() => setAlbumId(a.id)} className="group overflow-hidden rounded-xl border bg-card text-left transition-shadow hover:shadow-md">
            {a.coverImageUrl
              ? <img src={a.coverImageUrl} alt="" className="h-44 w-full object-cover" />
              : <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-[#0b3d23] to-[#0f4d2b]"><LogoMark className="h-12 w-12 rounded-xl bg-white/15" /></div>}
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold group-hover:text-primary">{a.title}</p>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  <Images className="h-3 w-3" />{a.photoCount}
                </span>
              </div>
              {a.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>}
            </div>
          </button>
        ))}
      </div>

      {!isLoading && albums.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No albums published yet.</p>
      )}
    </div>
  );
}