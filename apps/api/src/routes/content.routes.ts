import { Router } from 'express';
import multer from 'multer';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { db, ApiError } from '../lib/supabase';
import { authenticate, uid, requirePermission } from '../middleware/auth';
import { audit } from '../services/audit';
import { currentAdministrationId } from '../lib/helpers';

export const contentRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Magic-byte check — never trust the declared MIME type. */
function detectImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
}

/** Covers go to the public `gallery` bucket under covers/ — public URL stored directly. */
async function saveCover(file: Express.Multer.File | undefined, folder: string): Promise<string | null> {
  if (!file) return null;
  const mime = detectImageMime(file.buffer);
  if (!mime || !ALLOWED_IMAGE.has(mime)) {
    throw new ApiError(400, 'Cover must be a JPEG, PNG or WebP image', 'INVALID_FILE');
  }
  const path = `covers/${folder}/${randomBytes(8).toString('hex')}.${EXT[mime]}`;
  const { error } = await db.storage.from('gallery').upload(path, file.buffer, { contentType: mime });
  if (error) throw new ApiError(500, 'Cover upload failed');
  return db.storage.from('gallery').getPublicUrl(path).data.publicUrl;
}

/* ══════════════════ PUBLIC READS (no auth) ══════════════════ */

contentRouter.get('/api/public/news', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(24, Math.max(3, Number(req.query.limit) || 9));
  const { data, count, error } = await db
    .from('news')
    .select('slug, title, excerpt, cover_image_path, published_at', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (error) throw new ApiError(500, error.message);
  res.json({
    data: (data ?? []).map((n: any) => ({
      slug: n.slug, title: n.title, excerpt: n.excerpt,
      coverImageUrl: n.cover_image_path, publishedAt: n.published_at,
    })),
    page, limit, total: count ?? 0,
  });
});

contentRouter.get('/api/public/news/:slug', async (req, res) => {
  const { data: n } = await db
    .from('news')
    .select('slug, title, excerpt, body, cover_image_path, published_at, profiles(full_name)')
    .eq('slug', req.params.slug).eq('status', 'published').maybeSingle();
  if (!n) throw new ApiError(404, 'News article not found', 'NOT_FOUND');
  res.json({
    slug: n.slug, title: n.title, excerpt: n.excerpt, body: n.body,
    coverImageUrl: n.cover_image_path, publishedAt: n.published_at,
    authorName: (n as any).profiles?.full_name ?? null,
  });
});

contentRouter.get('/api/public/events', async (_req, res) => {
  const { data, error } = await db
    .from('events')
    .select('slug, title, description, cover_image_path, start_at, end_at, location')
    .eq('status', 'published')
    .order('start_at', { ascending: true })
    .limit(60);
  if (error) throw new ApiError(500, error.message);
  res.json((data ?? []).map((e: any) => ({
    slug: e.slug, title: e.title, description: e.description,
    coverImageUrl: e.cover_image_path, startAt: e.start_at, endAt: e.end_at, location: e.location,
  })));
});

contentRouter.get('/api/public/projects', async (_req, res) => {
  const { data, error } = await db
    .from('projects')
    .select('slug, title, description, cover_image_path, progress, status, administrations(session_label)')
    .eq('status_review', 'published')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw new ApiError(500, error.message);
  res.json((data ?? []).map((p: any) => ({
    slug: p.slug, title: p.title, description: p.description,
    coverImageUrl: p.cover_image_path, progress: p.progress, status: p.status,
    sessionLabel: p.administrations?.session_label ?? null,
  })));
});

/* ══════════════════ MANAGE: NEWS ══════════════════ */

contentRouter.get('/api/news/mine', authenticate, async (req, res) => {
  const { data } = await db
    .from('news').select('id, title, slug, status, published_at, created_at')
    .eq('author_id', uid(req)).order('created_at', { ascending: false }).limit(50);
  res.json((data ?? []).map((n: any) => ({
    id: n.id, title: n.title, slug: n.slug, status: n.status,
    publishedAt: n.published_at, createdAt: n.created_at,
  })));
});

contentRouter.post('/api/news', authenticate, requirePermission('content.news.manage'), upload.single('cover'), async (req, res) => {
  const input = z.object({
    title: z.string().min(3).max(200),
    excerpt: z.string().max(400).optional(),
    body: z.string().min(1).max(50000),
  }).parse(req.body);

  const coverImageUrl = await saveCover(req.file, 'news');
  const { data: item, error } = await db.from('news').insert({
    title: input.title,
    slug: `${slugify(input.title)}-${randomBytes(3).toString('hex')}`,
    excerpt: input.excerpt ?? input.body.slice(0, 180),
    body: input.body,
    cover_image_path: coverImageUrl,
    author_id: uid(req),
    administration_id: await currentAdministrationId(),
    status: 'pending_review',
  }).select('id, slug').single();
  if (error) throw new ApiError(500, error.message);

  await db.from('approvals').insert({ target_type: 'news', target_id: item.id, requested_by: uid(req) });
  await audit({ actorId: uid(req), action: 'content.submitted', targetType: 'news', targetId: item.id, metadata: { title: input.title } });
  res.status(201).json({ id: item.id, slug: item.slug });
});

/* ══════════════════ MANAGE: EVENTS ══════════════════ */

contentRouter.get('/api/events/mine', authenticate, async (req, res) => {
  const { data } = await db
    .from('events').select('id, title, slug, status, start_at, created_at')
    .eq('created_by', uid(req)).order('created_at', { ascending: false }).limit(50);
  res.json((data ?? []).map((e: any) => ({
    id: e.id, title: e.title, slug: e.slug, status: e.status,
    startAt: e.start_at, createdAt: e.created_at,
  })));
});

contentRouter.post('/api/events', authenticate, requirePermission('content.events.manage'), upload.single('cover'), async (req, res) => {
  const input = z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(20000).optional(),
    startAt: z.string().min(10),
    endAt: z.string().optional().or(z.literal('')),
    location: z.string().max(200).optional(),
  }).parse(req.body);

  const coverImageUrl = await saveCover(req.file, 'events');
  const { data: item, error } = await db.from('events').insert({
    title: input.title,
    slug: `${slugify(input.title)}-${randomBytes(3).toString('hex')}`,
    description: input.description ?? null,
    cover_image_path: coverImageUrl,
    start_at: input.startAt,
    end_at: input.endAt || null,
    location: input.location || null,
    created_by: uid(req),
    status: 'pending_review',
  }).select('id, slug').single();
  if (error) throw new ApiError(500, error.message);

  await db.from('approvals').insert({ target_type: 'event', target_id: item.id, requested_by: uid(req) });
  await audit({ actorId: uid(req), action: 'content.submitted', targetType: 'event', targetId: item.id, metadata: { title: input.title } });
  res.status(201).json({ id: item.id, slug: item.slug });
});

/* ══════════════════ MANAGE: PROJECTS ══════════════════ */

contentRouter.get('/api/projects/mine', authenticate, async (req, res) => {
  const { data } = await db
    .from('projects').select('id, title, slug, status_review, progress, created_at')
    .eq('created_by', uid(req)).order('created_at', { ascending: false }).limit(50);
  res.json((data ?? []).map((p: any) => ({
    id: p.id, title: p.title, slug: p.slug, status: p.status_review,
    progress: p.progress, createdAt: p.created_at,
  })));
});

contentRouter.post('/api/projects', authenticate, requirePermission('content.approve'), async (req, res) => {
  const input = z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(20000).optional(),
    progress: z.coerce.number().int().min(0).max(100).default(0),
  }).parse(req.body);

  const { data: item, error } = await db.from('projects').insert({
    title: input.title,
    slug: `${slugify(input.title)}-${randomBytes(3).toString('hex')}`,
    description: input.description ?? null,
    administration_id: await currentAdministrationId(),
    progress: input.progress,
    created_by: uid(req),
    status_review: 'pending_review',
  }).select('id, slug').single();
  if (error) throw new ApiError(500, error.message);

  await db.from('approvals').insert({ target_type: 'project', target_id: item.id, requested_by: uid(req) });
  await audit({ actorId: uid(req), action: 'content.submitted', targetType: 'project', targetId: item.id, metadata: { title: input.title } });
  res.status(201).json({ id: item.id, slug: item.slug });
});

/* ══════════════════ MANAGE: ANNOUNCEMENTS ══════════════════ */

contentRouter.get('/api/announcements/mine', authenticate, async (req, res) => {
  const { data } = await db
    .from('announcements').select('id, title, status, published_at, created_at')
    .eq('posted_by', uid(req)).order('created_at', { ascending: false }).limit(50);
  res.json((data ?? []).map((a: any) => ({
    id: a.id, title: a.title, status: a.status,
    publishedAt: a.published_at, createdAt: a.created_at,
  })));
});

contentRouter.post('/api/announcements', authenticate, requirePermission('content.news.manage'), async (req, res) => {
  const input = z.object({
    title: z.string().min(3).max(200),
    body: z.string().min(1).max(5000),
  }).parse(req.body);

  const { data: item, error } = await db.from('announcements').insert({
    title: input.title, body: input.body,
    audience: 'members',
    posted_by: uid(req),
    administration_id: await currentAdministrationId(),
    status: 'pending_review',
  }).select('id').single();
  if (error) throw new ApiError(500, error.message);

  await db.from('approvals').insert({ target_type: 'announcement', target_id: item.id, requested_by: uid(req) });
  await audit({ actorId: uid(req), action: 'content.submitted', targetType: 'announcement', targetId: item.id, metadata: { title: input.title } });
  res.status(201).json({ id: item.id });
});

/* ══════════════════ REPORTS (kept from Phase 3) ══════════════════ */

contentRouter.get('/api/reports/mine', authenticate, async (req, res) => {
  const { data } = await db
    .from('reports').select('*')
    .eq('author_id', uid(req))
    .order('created_at', { ascending: false })
    .limit(100);

  res.json((data ?? []).map((r: any) => ({
    id: r.id, title: r.title, body: r.body, authorName: '',
    status: r.status === 'published' ? 'approved' : r.status,
    createdAt: r.created_at,
  })));
});

contentRouter.post('/api/reports', authenticate, requirePermission('reports.submit'), async (req, res) => {
  const input = z.object({
    title: z.string().min(3).max(200),
    body: z.string().min(1).max(20000),
  }).parse(req.body);

  const { data: report, error } = await db.from('reports').insert({
    title: input.title, body: input.body, author_id: uid(req),
    administration_id: await currentAdministrationId(), status: 'pending_review',
  }).select('*').single();
  if (error) throw new ApiError(500, error.message);

  await db.from('approvals').insert({ target_type: 'report', target_id: report.id, requested_by: uid(req) });
  await audit({ actorId: uid(req), action: 'report.submitted', targetType: 'report', targetId: report.id });
  res.status(201).json({ id: report.id });
});