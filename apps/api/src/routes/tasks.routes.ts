import { Router } from 'express';
import { z } from 'zod';
import { db, ApiError } from '../lib/supabase';
import { authenticate, uid, requirePermission } from '../middleware/auth';
import { getEffectivePermissions } from '../services/profile.service';
import { audit } from '../services/audit';
import { currentAdministrationId } from '../lib/helpers';

export const tasksRouter = Router();

async function officerDirectory() {
  const names = new Map<string, string>();
  const positions = new Map<string, string>();

  const { data: profiles } = await db.from('profiles').select('id, full_name');
  (profiles ?? []).forEach((p: any) => names.set(p.id, p.full_name));

  const { data: las } = await db
    .from('leadership_assignments')
    .select('positions(title), members(profile_id)')
    .eq('status', 'active');
  (las ?? []).forEach((la: any) => {
    if (la.members?.profile_id && la.positions?.title) {
      positions.set(la.members.profile_id, la.positions.title);
    }
  });

  return { names, positions };
}

/** Fire-and-forget notification — never blocks or fails the main request. */
async function notify(opts: { recipientId: string; title: string; body: string; link: string }) {
  try {
    await db.from('notifications').insert({
      recipient_id: opts.recipientId, title: opts.title,
      body: opts.body, category: 'task', link: opts.link,
    });
  } catch { /* non-fatal */ }
}

function mapTask(t: any, names: Map<string, string>, positions: Map<string, string>) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    assigneeName: names.get(t.assigned_to) ?? '—',
    assigneePosition: positions.get(t.assigned_to) ?? null,
    createdByName: names.get(t.created_by) ?? '—',
    deadline: t.deadline,
    priority: t.priority,
    status: t.status,
    progress: t.progress,
    reportText: t.report_text,
  };
}

tasksRouter.get('/api/tasks', authenticate, requirePermission('tasks.view_all'), async (_req, res) => {
  const adminId = await currentAdministrationId();
  const { data } = await db
    .from('tasks').select('*')
    .eq('administration_id', adminId)
    .order('created_at', { ascending: false })
    .limit(100);
  const { names, positions } = await officerDirectory();
  res.json((data ?? []).map((t) => mapTask(t, names, positions)));
});

tasksRouter.get('/api/tasks/mine', authenticate, async (req, res) => {
  const { data } = await db
    .from('tasks').select('*')
    .eq('assigned_to', uid(req))
    .order('created_at', { ascending: false })
    .limit(100);
  const { names, positions } = await officerDirectory();
  res.json((data ?? []).map((t) => mapTask(t, names, positions)));
});

tasksRouter.get('/api/officers', authenticate, requirePermission('tasks.assign'), async (_req, res) => {
  const { data: las } = await db
    .from('leadership_assignments')
    .select('members(profile_id, full_name), positions(title)')
    .eq('status', 'active')
    .limit(100);
  res.json((las ?? [])
    .filter((l: any) => l.members?.profile_id)
    .map((l: any) => ({ id: l.members.profile_id, name: l.members.full_name, position: l.positions?.title ?? null })));
});

const assignSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().uuid(),
  deadline: z.string().min(10).max(40),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

tasksRouter.post('/api/tasks', authenticate, requirePermission('tasks.assign'), async (req, res) => {
  const input = assignSchema.parse(req.body);

  const { data: assignee } = await db
    .from('profiles').select('id, is_active, full_name').eq('id', input.assigneeId).maybeSingle();
  if (!assignee || !assignee.is_active) {
    throw new ApiError(400, 'Assignee not found or inactive', 'INVALID_ASSIGNEE');
  }

  const { data: task, error } = await db.from('tasks').insert({
    title: input.title,
    description: input.description ?? null,
    assigned_to: input.assigneeId,
    created_by: uid(req),
    administration_id: await currentAdministrationId(),
    deadline: input.deadline,
    priority: input.priority,
  }).select('*').single();
  if (error) throw new ApiError(500, error.message);

  await audit({
    actorId: uid(req), action: 'task.assigned', targetType: 'task', targetId: task.id,
    metadata: { title: task.title, assignedTo: task.assigned_to },
  });

  await notify({
    recipientId: input.assigneeId,
    title: 'New task assigned',
    body: `${input.title} — deadline ${new Date(input.deadline).toLocaleDateString('en-GB')}`,
    link: '/exco/tasks',
  });

  res.status(201).json({ id: task.id });
});

const updateSchema = z.object({
  progress: z.number().int().min(0).max(100).optional(),
  status: z.enum(['pending', 'in_progress', 'submitted', 'completed', 'rejected']).optional(),
  reportText: z.string().max(5000).optional(),
});

tasksRouter.patch('/api/tasks/:id', authenticate, async (req, res) => {
  const profileId = uid(req);
  const { data: task } = await db.from('tasks').select('*').eq('id', req.params.id).maybeSingle();
  if (!task) throw new ApiError(404, 'Task not found');

  const isAssignee = task.assigned_to === profileId;
  const perms = await getEffectivePermissions(profileId);
  const canManage = perms.has('tasks.assign') || perms.has('tasks.view_all');
  if (!isAssignee && !canManage) {
    throw new ApiError(403, 'You cannot update this task', 'PERMISSION_DENIED');
  }

  const input = updateSchema.parse(req.body);
  const patch: Record<string, unknown> = {};
  if (input.progress !== undefined) patch.progress = input.progress;
  if (input.reportText !== undefined) patch.report_text = input.reportText;
  if (input.status !== undefined) {
    patch.status = input.status;
    if (input.status === 'completed') patch.completed_at = new Date().toISOString();
  }

  const { data: updated, error } = await db
    .from('tasks').update(patch).eq('id', task.id).select('*').single();
  if (error) throw new ApiError(500, error.message);

  await audit({
    actorId: profileId,
    action: input.status === 'completed' ? 'task.completed' : 'task.updated',
    targetType: 'task', targetId: task.id,
    metadata: { status: updated.status, progress: updated.progress },
  });

  // Notify the creator when the officer completes or submits the work
  if (input.status === 'completed' || input.status === 'submitted') {
    if (task.created_by && task.created_by !== profileId) {
      await notify({
        recipientId: task.created_by,
        title: input.status === 'completed' ? 'Task completed' : 'Task submitted for review',
        body: task.title,
        link: '/president',
      });
    }
  }

  res.json({ ok: true });
});