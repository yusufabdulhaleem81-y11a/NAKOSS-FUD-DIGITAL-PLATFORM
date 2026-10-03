import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Plus, Send } from 'lucide-react';
import { Badge, Button, Input, Label, Textarea } from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PageHeader, EmptyState } from '@/components/shared/misc';
import { galleryService } from '@/services/gallery.service';
import type { MyAlbum } from '@/services/gallery.service';
import { formatDate } from '@/lib/utils';

export default function ExcoGallery() {
  const qc = useQueryClient();
  const { data: albums = [], isLoading } = useQuery({ queryKey: ['my-gallery'], queryFn: () => galleryService.myAlbums() });
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState<MyAlbum | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  const submit = useMutation({
    mutationFn: (id: string) => galleryService.submitForApproval(id),
    onSuccess: (_r, id) => { setSubmittedIds((s) => new Set(s).add(id)); qc.invalidateQueries({ queryKey: ['my-gallery'] }); },
  });

  return (
    <div>
      <PageHeader title="Media & Gallery" description="Create albums, upload photos, and submit albums for approval before they appear on the public site."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New album</Button>} />

      {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        : albums.length === 0 ? <EmptyState title="No albums yet" hint="Create your first album — it goes for approval before publishing." />
        : <div className="space-y-2">
            {albums.map((a) => {
              const pending = !a.isPublished && (submittedIds.has(a.id) || false);
              return (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">Created {formatDate(a.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.isPublished
                      ? <Badge className="bg-emerald-100 text-emerald-700">published</Badge>
                      : pending
                        ? <Badge className="bg-amber-100 text-amber-800">pending approval</Badge>
                        : <Button size="sm" variant="outline" onClick={() => submit.mutate(a.id)} disabled={submit.isPending}>
                            <Send className="h-3 w-3" /> Submit for approval
                          </Button>}
                    <Button size="sm" variant="outline" onClick={() => setUploading(a)}><ImagePlus className="h-3 w-3" /> Add photos</Button>
                  </div>
                </div>
              );
            })}
          </div>}

      <CreateAlbumDialog open={creating} onClose={() => setCreating(false)} />
      {uploading && <UploadPhotosDialog album={uploading} onClose={() => setUploading(null)} />}
    </div>
  );
}

function CreateAlbumDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<File | null>(null);

  const create = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.set('title', title); fd.set('description', description);
      if (cover) fd.set('cover', cover);
      return galleryService.createAlbum(fd);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-gallery'] }); setTitle(''); setDescription(''); setCover(null); onClose(); },
  });

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent>
        <DialogTitle>New gallery album</DialogTitle>
        <DialogDescription>Created unpublished — submit it for approval when the photos are in.</DialogDescription>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Freshers' Orientation 2026" /></div>
          <div className="space-y-1.5"><Label>Description (optional)</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Cover image (optional)</Label><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCover(e.target.files?.[0] ?? null)} /></div>
          {create.isError && <p className="text-sm text-red-600">{(create.error as Error).message}</p>}
          <Button className="w-full" disabled={!title || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Creating…' : 'Create album'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UploadPhotosDialog({ album, onClose }: { album: MyAlbum; onClose: () => void }) {
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      files.forEach((f) => fd.append('photos', f));
      return galleryService.uploadPhotos(album.id, fd);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['public-gallery'] }); setFiles([]); onClose(); },
  });

  return (
    <Dialog open onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent>
        <DialogTitle>Add photos — {album.title}</DialogTitle>
        <DialogDescription>Up to 12 images at a time, JPEG/PNG/WebP, max 5 MB each.</DialogDescription>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Photos</Label>
            <Input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            {files.length > 0 && <p className="text-xs text-muted-foreground">{files.length} photo(s) selected</p>}
          </div>
          {upload.isError && <p className="text-sm text-red-600">{(upload.error as Error).message}</p>}
          <Button className="w-full" disabled={files.length === 0 || upload.isPending} onClick={() => upload.mutate()}>
            {upload.isPending ? 'Uploading…' : `Upload ${files.length || ''} photo(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}