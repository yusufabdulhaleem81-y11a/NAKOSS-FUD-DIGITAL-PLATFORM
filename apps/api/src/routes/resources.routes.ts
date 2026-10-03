import { Router } from 'express';
import multer from 'multer';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { db, ApiError } from '../lib/supabase';
import { authenticate, uid, requirePermission } from '../middleware/auth';
import { audit } from '../services/audit';

export const resourcesRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

/** PDF magic bytes: "%PDF" */
function isPdf(buf: Buffer): boolean {
  return buf.length > 4 && buf.subarray(0, 4).toString('ascii') === '%PDF';
}

/** Filter options for the student-facing search UI. */
resourcesRouter.get('/api/resources/filters', authenticate, async (_req, res) => {
  const [departments, levels, { data: sessions }] = await Promise.all([
    db.from('departments').select('id, name').order('name'),
    db.from('levels').select('id, label').order('sort'),
    db.from('past_questions').select('session_label'),
  ]);
  const uniqueSessions = [...new Set((sessions ?? []).map((s: any) => s.session_label))].sort().reverse();
  res.json({ departments: departments.data ?? [], levels: levels.data ?? [], sessions: uniqueSessions });
});

/** Published past questions — members only, searchable. */
resourcesRouter.get('/api/resources/past-questions', authenticate, async (req, res) => {
  const departmentId = typeof req.query.departmentId === 'string' && req.query.departmentId ? req.query.departmentId : null;
  const levelId = typeof req.query.levelId === 'string' && req.query.levelId ? req.query.levelId : null;
  const session = typeof req.query.session === 'string' && req.query.session ? req.query.session : null;
  const semester = typeof req.query.semester === 'string' && req.query.semester ? req.query.semester : null;
  const q = typeof req.query.q === 'string' ? req.query.q.trim().replace(/[,()%]/g, '') : '';

  let query = db.from('past_questions')
    .select('id, course_code, course_title, session_label, semester, year, download_count, departments(name), levels(label)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(100);

  if (departmentId) query = query.eq('department_id', departmentId);
  if (levelId) query = query.eq('level_id', levelId);
  if (session) query = query.eq('session_label', session);
  if (semester) query = query.eq('semester', semester);
  if (q) query = query.or(`course_code.ilike.%${q}%,course_title.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) throw new ApiError(500, error.message);

  res.json((data ?? []).map((p: any) => ({
    id: p.id, courseCode: p.course_code, courseTitle: p.course_title,
    sessionLabel: p.session_label, semester: p.semester, year: p.year,
    downloadCount: p.download_count,
    department: p.departments?.name ?? null, level: p.levels?.label ?? null,
  })));
});

/** Signed download URL — increments the counter, expires in 10 minutes. */
resourcesRouter.get('/api/resources/past-questions/:id/download', authenticate, async (req, res) => {
  const { data: pq } = await db
    .from('past_questions')
    .select('id, status, file_asset_id, file_assets(bucket, path)')
    .eq('id', req.params.id).maybeSingle();
  if (!pq || pq.status !== 'published') throw new ApiError(404, 'Past question not found', 'NOT_FOUND');

  const asset = (pq as any).file_assets;
  if (!asset) throw new ApiError(404, 'File missing', 'FILE_MISSING');

  const { data: signed, error } = await db.storage
    .from(asset.bucket).createSignedUrl(asset.path, 600);
  if (error || !signed) throw new ApiError(500, 'Could not generate download link');

  await db.from('past_questions').update({ download_count: (pq as any).download_count + 1 }).eq('id', pq.id);
  res.json({ url: signed.signedUrl });
});

/** Upload (officers with resources.upload) → pending_review + approval pipeline. */
const uploadSchema = z.object({
  courseCode: z.string().min(2).max(30),
  courseTitle: z.string().max(200).optional().or(z.literal('')),
  departmentId: z.string().uuid(),
  levelId: z.string().uuid(),
  sessionLabel: z.string().min(4).max(20),
  semester: z.enum(['first', 'second', '']).optional(),
  year: z.coerce.number().int().min(2000).max(2100),
});

resourcesRouter.post('/api/resources/past-questions', authenticate, requirePermission('resources.upload'), upload.single('file'), async (req, res) => {
  const input = uploadSchema.parse(req.body);
  if (!req.file) throw new ApiError(400, 'A PDF file is required', 'FILE_REQUIRED');
  if (!isPdf(req.file.buffer)) throw new ApiError(400, 'Only PDF files are accepted', 'INVALID_FILE');

  const path = `pq/${randomBytes(10).toString('hex')}.pdf`;
  const { error: upErr } = await db.storage.from('past-questions')
    .upload(path, req.file.buffer, { contentType: 'application/pdf' });
  if (upErr) throw new ApiError(500, 'File upload failed');

  const { data: asset, error: assetErr } = await db.from('file_assets').insert({
    bucket: 'past-questions', path,
    file_name: req.file.originalname, mime_type: 'application/pdf',
    size_bytes: req.file.size, uploaded_by: uid(req),
    visibility: 'members', target_type: 'past_question',
  }).select('id').single();
  if (assetErr) throw new ApiError(500, assetErr.message);

  const { data: item, error } = await db.from('past_questions').insert({
    course_code: input.courseCode.toUpperCase(),
    course_title: input.courseTitle || null,
    department_id: input.departmentId,
    level_id: input.levelId,
    session_label: input.sessionLabel,
    semester: input.semester || null,
    year: input.year,
    file_asset_id: asset.id,
    uploaded_by: uid(req),
    status: 'pending_review',
  }).select('id').single();
  if (error) throw new ApiError(500, error.message);

  await db.from('approvals').insert({ target_type: 'past_question', target_id: item.id, requested_by: uid(req) });
  await audit({ actorId: uid(req), action: 'content.submitted', targetType: 'past_question', targetId: item.id, metadata: { courseCode: input.courseCode } });
  res.status(201).json({ id: item.id });
});