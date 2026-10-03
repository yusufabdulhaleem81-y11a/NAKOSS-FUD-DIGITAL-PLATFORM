import { Router } from 'express';
import { z } from 'zod';
import { db, ApiError } from '../lib/supabase';
import { authenticate, uid } from '../middleware/auth';
import { getEffectivePermissions } from '../services/profile.service';
import { audit } from '../services/audit';

export const submissionsRouter = Router();

const TYPES = ['suggestion', 'issue', 'request', 'support', 'welfare'] as const;
const STATUSES = ['submitted', 'under_review', 'in_progress', 'resolved', 'closed'] as const;

const createSchema = z.object({
  type: z.enum(TYPES),
  subject: z.string().min(3).max(200),
  message: z.string().min(5).max(10000),
  isAnonymous: z.boolean().optional(),
});

function mapSub(s: any) {
  return {
    id: s.id, reference: s.reference, type: s.type, subject: s.subject,
    message: s.message, status: s.status, isAnonymous: s.is_anonymous,
    responseText: s.response_text, respondedAt: s.responded_at, createdAt: s.created_at,
  };
}

async function memberGuard(profileId: string) {
  const { data: member } = await db.from('members').select('id').eq('profile_id', profileId).maybeSingle();
  if (!member) throw new ApiError(403, 'Only registered members can use submissions', 'NO_MEMBER_RECORD');
  return member;
}

/** Staff guard: welfare needs welfare.manage OR respond; everything else needs respond. */
async function staffGuard(profileId: string, type: string) {
  const perms = await getEffectivePermissions(profileId);
  const respond = perms.has('governance.submissions.respond');
  if (type === 'welfare') {
    if (!respond && !perms.has('welfare.manage')) {
      throw new ApiError(403, 'You do not have permission for this queue', 'PERMISSION_DENIED');
    }
  } else if (!respond) {
    throw new ApiError(403, 'You do not have permission for this queue', 'PERMISSION_DENIED');
  }
}

submissionsRouter.post('/api/submissions', authenticate, async (req, res) => {
  const input = createSchema.parse(req.body);
  const member = await memberGuard(uid(req));

  // Race-proof reference via the same atomic counter used for membership numbers
  const year = new Date().getFullYear();
  const { data: seq, error: seqErr } = await db.rpc('next_counter', { p_scope: `submission:${year}` });
  if (seqErr || typeof seq !== 'number') throw new ApiError(500, 'Could not generate reference');
  const reference = `SUB-${year}-${String(seq).padStart(4, '0')}`;

  const { data: sub, error } = await db.from('member_submissions').insert({
    reference, member_id: member.id, is_anonymous: input.isAnonymous ?? false,
    type: input.type, subject: input.subject, message: input.message,
  }).select('id, reference').single();
  if (error) throw new ApiError(500, error.message);

  await audit({ actorId: uid(req), action: 'submission.created', targetType: 'submission', targetId: sub.id, metadata: { type: input.type } });
  res.status(201).json({ id: sub.id, reference: sub.reference });
});

submissionsRouter.get('/api/submissions/mine', authenticate, async (req, res) => {
  const member = await memberGuard(uid(req));
  const { data } = await db.from('member_submissions')
    .select('*').eq('member_id', member.id)
    .order('created_at', { ascending: false }).limit(100);
  res.json((data ?? []).map(mapSub));
});

submissionsRouter.get('/api/submissions', authenticate, async (req, res) => {
  const profileId = uid(req);
  const type = typeof req.query.type === 'string' && (TYPES as readonly string[]).includes(req.query.type) ? req.query.type : null;
  const status = typeof req.query.status === 'string' && (STATUSES as readonly string[]).includes(req.query.status) ? req.query.status : null;
  await staffGuard(profileId, type ?? 'all');

  let q = db.from('member_submissions').select('*').order('created_at', { ascending: false }).limit(100);
  if (type) q = q.eq('type', type);
  if (status) q = q.eq('status', status);
  const { data } = await q;
  const rows = data ?? [];

  // Submitter names — hidden for anonymous submissions, even from staff
  const nonAnonIds = rows.filter((r: any) => !r.is_anonymous && r.member_id).map((r: any) => r.member_id);
  const names = new Map<string, string>();
  if (nonAnonIds.length) {
    const { data: members } = await db.from('members').select('id, full_name').in('id', nonAnonIds);
    (members ?? []).forEach((m: any) => names.set(m.id, m.full_name));
  }

  res.json(rows.map((r: any) => ({
    ...mapSub(r),
    submitterName: r.is_anonymous ? 'Anonymous' : (names.get(r.member_id) ?? '—'),
  })));
});

const patchSchema = z.object({
  status: z.enum(STATUSES).optional(),
  responseText: z.string().max(10000).optional(),
});

submissionsRouter.patch('/api/submissions/:id', authenticate, async (req, res) => {
  const input = patchSchema.parse(req.body);
  if (!input.status && input.responseText === undefined) {
    throw new ApiError(400, 'Nothing to update', 'EMPTY_PATCH');
  }

  const { data: sub } = await db.from('member_submissions').select('*').eq('id', req.params.id).maybeSingle();
  if (!sub) throw new ApiError(404, 'Submission not found');
  await staffGuard(uid(req), sub.type);

  const patch: Record<string, unknown> = {};
  if (input.status) patch.status = input.status;
  if (input.responseText !== undefined) {
    patch.response_text = input.responseText;
    patch.responded_by = uid(req);
    patch.responded_at = new Date().toISOString();
  }

  const { error } = await db.from('member_submissions').update(patch).eq('id', sub.id);
  if (error) throw new ApiError(500, error.message);

  // Notify the member (works for anonymous too — identity is never shown, but they still get the answer)
  const { data: member } = await db.from('members').select('profile_id').eq('id', sub.member_id).maybeSingle();
  if (member?.profile_id) {
    await db.from('notifications').insert({
      recipient_id: member.profile_id,
      title: `Update on ${sub.reference}`,
      body: input.responseText ?? `Status changed to ${input.status}`,
      category: 'submission', link: '/member/submissions',
    });
  }

  await audit({
    actorId: uid(req),
    action: input.responseText ? 'submission.responded' : 'submission.updated',
    targetType: 'submission', targetId: sub.id,
    metadata: { status: input.status ?? sub.status },
  });
  res.json({ ok: true });
});