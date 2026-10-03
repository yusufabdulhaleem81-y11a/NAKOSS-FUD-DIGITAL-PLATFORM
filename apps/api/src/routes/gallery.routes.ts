import { Router } from 'express';
import multer from 'multer';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { db, ApiError } from '../lib/supabase';
import { authenticate, requirePermission, uid } from '../middleware/auth';
import { audit } from '../services/audit';

export const galleryRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 12 } });

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function detectImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

/* ───────────── PUBLIC ───────────── */

galleryRouter.get('/api/public/gallery', async (_req, res) => {
  const { data: albums } = await db.from('gallery_albums')
    .select('id, title, description, cover_image_path, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = albums ?? [];
  const counts = new Map<string, number>();
  if (rows.length) {
    const { data: photos } = await db.from('gallery_photos')
      .select('album_id').in('album_id', rows.map((a: any) => a.id));
    (photos ?? []).forEach((p: any) => counts.set(p.album_id, (counts.get(p.album_id) ?? 0) + 1));
  }
  res.json(rows.map((a: any) => ({
    id: a.id, title: a.title, description: a.description,
    coverImageUrl: a.cover_image_path, photoCount: counts.get(a.id) ?? 0, createdAt: a.created_at,
  })));
});

galleryRouter.get('/api/public/gallery/:id', async (req, res) => {
  const { data: album } = await db.from('gallery_albums')
    .select('id, title, description, created_at')
    .eq('id', req.params.id).eq('is_published', true).maybeSingle();
  if (!album) throw new ApiError(404, 'Album not found', 'NOT_FOUND');

  const { data: photos } = await db.from('gallery_photos')
    .select('id, image_path, caption').eq('album_id', album.id).order('created_at');

  res.json({
    id: album.id, title: album.title, description: album.description, createdAt: album.created_at,
    photos: (photos ?? []).map((p: any) => ({ id: p.id, url: p.image_path, caption: p.caption })),
  });
});

/* ───────────── MANAGE (content.gallery.manage) ───────────── */

galleryRouter.get('/api/gallery/albums', authenticate, requirePermission('content.gallery.manage'), async (_req, res) => {
  const { data } = await db.from('gallery_albums')
    .select('id, title, description, is_published, created_at')
    .order('created_at', { ascending: false }).limit(50);
  res.json((data ?? []).map((a: any) => ({
    id: a.id, title: a.title, description: a.description,
    isPublished: a.is_published, createdAt: a.created_at,
  })));
});

galleryRouter.post('/api/gallery/albums', authenticate, requirePermission('content.gallery.manage'), upload.single('cover'), async (req, res) => {
  const input = z.object({
    title: z.string().min(3).max(120),
    description: z.string().max(2000).optional().or(z.literal('')),
  }).parse(req.body);

  let coverUrl: string | null = null;
  if (req.file) {
    const mime = detectImageMime(req.file.buffer);
    if (!mime || !ALLOWED_IMAGE.has(mime)) throw new ApiError(400, 'Cover must be JPEG, PNG or WebP', 'INVALID_FILE');
    const path = `covers/albums/${randomBytes(8).toString('hex')}.${EXT[mime]}`;
    const { error } = await db.storage.from('gallery').upload(path, req.file.buffer, { contentType: mime });
    if (error) throw new ApiError(500, 'Cover upload failed');
    coverUrl = db.storage.from('gallery').getPublicUrl(path).data.publicUrl;
  }

  const { data: album, error } = await db.from('gallery_albums').insert({
    title: input.title, description: input.description || null,
    cover_image_path: coverUrl, created_by: uid(req), is_published: false,
  }).select('id').single();
  if (error) throw new ApiError(500, error.message);

  await audit({ actorId: uid(req), action: 'content.submitted', targetType: 'gallery_album', targetId: album.id, metadata: { title: input.title } });
  res.status(201).json({ id: album.id });
});

galleryRouter.post('/api/gallery/albums/:id/photos', authenticate, requirePermission('content.gallery.manage'), upload.array('photos', 12), async (req, res) => {
  const albumId = req.params.id;
  const { data: album } = await db.from('gallery_albums').select('id').eq('id', albumId).maybeSingle();
  if (!album) throw new ApiError(404, 'Album not found');
  if (!req.files?.length) throw new ApiError(400, 'At least one photo is required', 'FILE_REQUIRED');

  const rows: { album_id: string; image_path: string; uploaded_by: string }[] = [];
  for (const file of req.files as Express.Multer.File[]) {
    const mime = detectImageMime(file.buffer);
    if (!mime || !ALLOWED_IMAGE.has(mime)) throw new ApiError(400, `${file.originalname}: not a valid JPEG/PNG/WebP image`, 'INVALID_FILE');
    const path = `albums/${albumId}/${randomBytes(8).toString('hex')}.${EXT[mime]}`;
    const { error } = await db.storage.from('gallery').upload(path, file.buffer, { contentType: mime });
    if (error) throw new ApiError(500, `Upload failed for ${file.originalname}`);
    rows.push({ album_id: albumId, image_path: db.storage.from('gallery').getPublicUrl(path).data.publicUrl, uploaded_by: uid(req) });
  }
  const { error: insErr } = await db.from('gallery_photos').insert(rows);
  if (insErr) throw new ApiError(500, insErr.message);

  await audit({ actorId: uid(req), action: 'gallery.photos.uploaded', targetType: 'gallery_album', targetId: albumId, metadata: { count: rows.length } });
  res.status(201).json({ uploaded: rows.length });
});

galleryRouter.post('/api/gallery/albums/:id/submit', authenticate, requirePermission('content.gallery.manage'), async (req, res) => {
  const albumId = req.params.id;
  const { data: album } = await db.from('gallery_albums').select('id, is_published, title').eq('id', albumId).maybeSingle();
  if (!album) throw new ApiError(404, 'Album not found');
  if (album.is_published) throw new ApiError(400, 'Album is already published', 'INVALID_STATUS');

  const { data: pending } = await db.from('approvals')
    .select('id').eq('target_type', 'gallery_album').eq('target_id', albumId).is('decided_at', null).maybeSingle();
  if (pending) return res.json({ ok: true, alreadySubmitted: true });

  await db.from('approvals').insert({ target_type: 'gallery_album', target_id: albumId, requested_by: uid(req) });
  await audit({ actorId: uid(req), action: 'content.submitted', targetType: 'gallery_album', targetId: albumId });
  res.json({ ok: true });
});