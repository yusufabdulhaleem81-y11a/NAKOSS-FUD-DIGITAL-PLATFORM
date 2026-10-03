import { Router } from 'express';
import { z } from 'zod';
import { db, ApiError } from '../lib/supabase';
import { authenticate, uid, requirePermission } from '../middleware/auth';
import { audit } from '../services/audit';

export const approvalsRouter = Router();

const TYPE_TABLE: Record<string, string> = {
  news: 'news', event: 'events', announcement: 'announcements',
  document: 'documents', past_question: 'past_questions',
  project: 'projects', report: 'reports', gallery_album: 'gallery_albums',
};
const TYPE_LABEL: Record<string, string> = {
  news: 'News', event: 'Event', announcement: 'Announcement',
  document: 'Document', past_question: 'Past Question',
  project: 'Project', report: 'Report', gallery_album: 'Gallery Album',
};

approvalsRouter.get('/api/approvals', authenticate, requirePermission('content.approve'), async (_req, res) => {
  const { data: pending } = await db
    .from('approvals')
    .select('id, target_type, target_id, requested_by, created_at')
    .is('decided_at', null)
    .order('created_at')
    .limit(100);

  const rows = pending ?? [];

  const requesterIds = [...new Set(rows.map((r: any) => r.requested_by).filter(Boolean))];
  const { data: profiles } = requesterIds.length
    ? await db.from('profiles').select('id, full_name').in('id', requesterIds)
    : { data: [] as any[] };
  const names = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

  const titles = new Map<string, string>();
  const byType = new Map<string, string[]>();
  rows.forEach((r: any) => {
    const list = byType.get(r.target_type) ?? [];
    list.push(r.target_id);
    byType.set(r.target_type, list);
  });
  for (const [type, ids] of byType) {
    const table = TYPE_TABLE[type];
    if (!table || !ids.length) continue;
    const { data: targets } = await db.from(table).select('id, title').in('id', ids);
    (targets ?? []).forEach((t: any) => titles.set(t.id, t.title));
  }

  res.json(rows.map((r: any) => ({
    id: r.id,
    type: TYPE_LABEL[r.target_type] ?? r.target_type,
    title: titles.get(r.target_id) ?? '(untitled)',
    submittedBy: names.get(r.requested_by) ?? '—',
    submittedAt: r.created_at,
  })));
});

const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  notes: z.string().max(2000).optional(),
});

approvalsRouter.post('/api/approvals/:id/decision', authenticate, requirePermission('content.approve'), async (req, res) => {
  const input = decisionSchema.parse(req.body);
  const approvalId = req.params.id;

  const { data: approval } = await db
    .from('approvals').select('*').eq('id', approvalId).is('decided_at', null).maybeSingle();
  if (!approval) throw new ApiError(404, 'Approval request not found or already decided');

  const { error } = await db.from('approvals').update({
    decision: input.decision,
    reviewer: uid(req),
    notes: input.notes ?? null,
    decided_at: new Date().toISOString(),
  }).eq('id', approvalId);
  if (error) throw new ApiError(500, error.message);

  const table = TYPE_TABLE[approval.target_type];
  if (table) {
    const approved = input.decision === 'approved';
    const patch: Record<string, unknown> =
      approval.target_type === 'project' ? { status_review: approved ? 'published' : 'rejected' } :
      approval.target_type === 'gallery_album' ? { is_published: approved } :
      { status: approved ? 'published' : 'rejected' };
    await db.from(table).update(patch).eq('id', approval.target_id);
  }

  // Notify the author — fire-and-forget, never fails the decision
  if (approval.requested_by) {
    try {
      let itemTitle = '';
      if (table) {
        const { data: t } = await db.from(table).select('title').eq('id', approval.target_id).maybeSingle();
        itemTitle = t?.title ?? '';
      }
      await db.from('notifications').insert({
        recipient_id: approval.requested_by,
        title: input.decision === 'approved' ? 'Your submission was approved ✓' : 'Your submission was rejected',
        body: `${TYPE_LABEL[approval.target_type] ?? approval.target_type}${itemTitle ? `: ${itemTitle}` : ''}`,
        category: 'approval',
        link: '/exco/content',
      });
    } catch { /* non-fatal */ }
  }

  await audit({
    actorId: uid(req),
    action: input.decision === 'approved' ? 'content.approved' : 'content.rejected',
    targetType: approval.target_type, targetId: approval.target_id,
    metadata: { approvalId, notes: input.notes ?? null },
  });
  res.json({ ok: true });
});