import { Router } from 'express';
import { randomBytes, scryptSync } from 'crypto';
import { z } from 'zod';
import { db, ApiError } from '../lib/supabase';
import { authenticate, uid, requirePermission } from '../middleware/auth';
import { audit } from '../services/audit';
import { currentAdministrationId } from '../lib/helpers';

export const adminRouter = Router();
adminRouter.use(authenticate);

/* ───────────────────────── STUDENTS ───────────────────────── */

adminRouter.get('/api/admin/members', requirePermission('members.view'), async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 20));
  const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : null;
  const q = typeof req.query.q === 'string' ? req.query.q.trim().replace(/[,()%]/g, '') : '';

  let query = db.from('members')
    .select('id, membership_number, full_name, email, phone, matric_number, status, profile_id, created_at, departments(name), levels(label), states(name)', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (q) query = query.or(`full_name.ilike.%${q}%,matric_number.ilike.%${q}%,membership_number.ilike.%${q}%`);

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (error) throw new ApiError(500, error.message);

  res.json({
    data: (data ?? []).map((m: any) => ({
      id: m.id, membershipNumber: m.membership_number, fullName: m.full_name,
      email: m.email, phone: m.phone, matricNumber: m.matric_number,
      status: m.status, department: m.departments?.name ?? null,
      level: m.levels?.label ?? null, state: m.states?.name ?? null,
      profileId: m.profile_id, createdAt: m.created_at,
    })),
    page, limit, total: count ?? 0,
  });
});

adminRouter.post('/api/admin/members/:id/verify', requirePermission('members.verify'), async (req, res) => {
  const { data: member } = await db.from('members')
    .select('id, membership_number, status, profile_id, full_name').eq('id', req.params.id).maybeSingle();
  if (!member) throw new ApiError(404, 'Member not found');
  if (member.status !== 'pending') throw new ApiError(400, 'Only pending members can be verified', 'INVALID_STATUS');

  await db.from('members').update({
    status: 'verified', verified_at: new Date().toISOString(), verified_by: uid(req),
  }).eq('id', member.id);

  if (member.profile_id) {
    try {
      await db.from('notifications').insert({
        recipient_id: member.profile_id,
        title: 'Membership verified ✓',
        body: `Welcome ${member.full_name} — your NAKOSS membership is now verified.`,
        category: 'membership',
        link: '/member',
      });
    } catch { /* non-fatal */ }
  }

  await audit({ actorId: uid(req), action: 'member.verified', targetType: 'member', targetId: member.id, metadata: { membershipNumber: member.membership_number } });
  res.json({ ok: true });
});

const editSchema = z.object({
  fullName: z.string().min(3).max(120).optional(),
  phone: z.string().max(20).optional(),
  departmentId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  stateId: z.string().uuid().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

adminRouter.patch('/api/admin/members/:id', requirePermission('members.view'), async (req, res) => {
  const input = editSchema.parse(req.body);
  const patch: Record<string, unknown> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.departmentId !== undefined) patch.department_id = input.departmentId;
  if (input.levelId !== undefined) patch.level_id = input.levelId;
  if (input.stateId !== undefined) patch.state_id = input.stateId;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId || null;

  const { error } = await db.from('members').update(patch).eq('id', req.params.id);
  if (error) throw new ApiError(500, error.message);

  await audit({ actorId: uid(req), action: 'member.updated', targetType: 'member', targetId: req.params.id, metadata: patch });
  res.json({ ok: true });
});

/* ───────────────────────── EXCO ───────────────────────── */

adminRouter.get('/api/admin/officers', requirePermission('members.view'), async (_req, res) => {
  const adminId = await currentAdministrationId();
  const { data } = await db.from('leadership_assignments')
    .select('id, status, started_at, positions(title), administrations(session_label), members(id, membership_number, full_name, profile_id)')
    .eq('administration_id', adminId)
    .order('created_at');

  res.json((data ?? []).map((la: any) => ({
    assignmentId: la.id,
    position: la.positions?.title ?? '—',
    memberName: la.members?.full_name ?? '—',
    membershipNumber: la.members?.membership_number ?? '—',
    profileId: la.members?.profile_id ?? null,
    status: la.status,
    session: la.administrations?.session_label ?? null,
  })));
});

adminRouter.get('/api/admin/positions', requirePermission('members.view'), async (_req, res) => {
  const { data } = await db.from('positions').select('id, title').eq('is_active', true).order('sort_order');
  res.json(data ?? []);
});

async function grantExcoRole(profileId: string, administrationId: string, assignedBy: string) {
  const { data: excoRole } = await db.from('roles').select('id').eq('key', 'exco').maybeSingle();
  if (!excoRole) return;
  const { data: existing } = await db.from('role_assignments')
    .select('id').eq('profile_id', profileId).eq('role_id', excoRole.id)
    .eq('administration_id', administrationId).is('revoked_at', null).maybeSingle();
  if (!existing) {
    await db.from('role_assignments').insert({
      profile_id: profileId, role_id: excoRole.id,
      administration_id: administrationId, assigned_by: assignedBy,
    });
  }
}

const assignSchema = z.object({ memberId: z.string().uuid(), positionId: z.string().uuid() });

adminRouter.post('/api/admin/exco/assign', requirePermission('exco.invite'), async (req, res) => {
  const input = assignSchema.parse(req.body);
  const adminId = await currentAdministrationId();

  const { data: member } = await db.from('members')
    .select('id, profile_id, full_name').eq('id', input.memberId).maybeSingle();
  if (!member) throw new ApiError(404, 'Member not found');

  const { data: la, error } = await db.from('leadership_assignments').insert({
    member_id: member.id, position_id: input.positionId,
    administration_id: adminId, assigned_by: uid(req),
  }).select('id').single();
  if (error) {
    if (error.code === '23505') throw new ApiError(409, 'That position already has an active holder in this administration', 'POSITION_FILLED');
    throw new ApiError(500, error.message);
  }

  if (member.profile_id) await grantExcoRole(member.profile_id, adminId, uid(req));

  await audit({ actorId: uid(req), action: 'exco.assigned', targetType: 'leadership_assignment', targetId: la.id, metadata: { member: member.full_name } });
  res.status(201).json({ id: la.id });
});

adminRouter.post('/api/admin/exco/assignments/:id/end', requirePermission('exco.invite'), async (req, res) => {
  const { error } = await db.from('leadership_assignments')
    .update({ status: 'ended', ended_at: new Date().toISOString().slice(0, 10) })
    .eq('id', req.params.id);
  if (error) throw new ApiError(500, error.message);

  await audit({ actorId: uid(req), action: 'exco.assignment.ended', targetType: 'leadership_assignment', targetId: req.params.id });
  res.json({ ok: true });
});

/** Invite → returns a LINK the admin sends via WhatsApp/SMS (no email dependency). */
const inviteSchema = z.object({
  fullName: z.string().min(3).max(120),
  email: z.string().trim().toLowerCase().email(),
  positionId: z.string().uuid(),
});

adminRouter.post('/api/admin/exco/invite', requirePermission('exco.invite'), async (req, res) => {
  const input = inviteSchema.parse(req.body);
  const adminId = await currentAdministrationId();
  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  const { error } = await db.from('invitations').insert({
    token, email: input.email, full_name: input.fullName,
    position_id: input.positionId, administration_id: adminId,
    invited_by: uid(req), expires_at: expiresAt,
  });
  if (error) throw new ApiError(500, error.message);

  await audit({ actorId: uid(req), action: 'exco.invited', targetType: 'invitation', metadata: { email: input.email } });
  res.status(201).json({ token, expiresAt });
});

/** One-time temp password — plaintext shown ONCE here, only a hash is stored. */
adminRouter.post('/api/admin/profiles/:id/temp-password', requirePermission('exco.invite'), async (req, res) => {
  const profileId = req.params.id;
  const { data: profile } = await db.from('profiles').select('id, is_active').eq('id', profileId).maybeSingle();
  if (!profile) throw new ApiError(404, 'Profile not found');
  if (!profile.is_active) throw new ApiError(400, 'Account is suspended', 'ACCOUNT_SUSPENDED');

  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from(randomBytes(4)).map((b) => alphabet[b % alphabet.length]).join('');
  const plain = `NAKOSS-${seg()}-${new Date().getFullYear()}`;

  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  const { error: authError } = await db.auth.admin.updateUserById(profileId, { password: plain });
  if (authError) throw new ApiError(400, authError.message);

  await db.from('temporary_passwords').insert({
    profile_id: profileId, password_hash: `${salt}:${hash}`,
    expires_at: expiresAt, created_by: uid(req),
  });
  await db.from('profiles').update({ must_change_password: true }).eq('id', profileId);

  await audit({ actorId: uid(req), action: 'temp_password.issued', targetType: 'profile', targetId: profileId });
  res.json({ tempPassword: plain, expiresAt });
});

/* ───────────────────── ADMINISTRATIONS ───────────────────── */

adminRouter.get('/api/admin/administrations', requirePermission('administrations.manage'), async (_req, res) => {
  const { data } = await db.from('administrations')
    .select('*').order('session_label', { ascending: false });
  res.json((data ?? []).map((a: any) => ({
    id: a.id, name: a.name, sessionLabel: a.session_label,
    status: a.status, isCurrent: a.is_current, startDate: a.start_date, endDate: a.end_date,
  })));
});

const adminSchema = z.object({
  name: z.string().min(3).max(120),
  sessionLabel: z.string().min(4).max(20),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
});

adminRouter.post('/api/admin/administrations', requirePermission('administrations.manage'), async (req, res) => {
  const input = adminSchema.parse(req.body);
  const { data, error } = await db.from('administrations').insert({
    name: input.name, session_label: input.sessionLabel,
    start_date: input.startDate || null, end_date: input.endDate || null,
  }).select('id').single();
  if (error) {
    if (error.code === '23505') throw new ApiError(409, 'That session label already exists', 'SESSION_EXISTS');
    throw new ApiError(500, error.message);
  }

  await audit({ actorId: uid(req), action: 'administration.created', targetType: 'administration', targetId: data.id, metadata: { session: input.sessionLabel } });
  res.status(201).json({ id: data.id });
});

adminRouter.post('/api/admin/administrations/:id/set-current', requirePermission('administrations.manage'), async (req, res) => {
  const { error } = await db.rpc('set_current_administration', { p_id: req.params.id });
  if (error) {
    if (error.message.includes('ADMINISTRATION_NOT_FOUND')) throw new ApiError(404, 'Administration not found');
    throw new ApiError(500, error.message);
  }

  await audit({ actorId: uid(req), action: 'administration.current.set', targetType: 'administration', targetId: req.params.id });
  res.json({ ok: true });
});

/* ───────────────────────── AUDIT LOG ───────────────────────── */

adminRouter.get('/api/admin/audit', requirePermission('audit.view'), async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 30));
  const q = typeof req.query.q === 'string' ? req.query.q.trim().replace(/[,()%]/g, '') : '';

  let query = db.from('activity_logs').select('*', { count: 'exact' });
  if (q) query = query.ilike('action', `%${q}%`);

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (error) throw new ApiError(500, error.message);

  res.json({
    data: (data ?? []).map((l: any) => ({
      id: l.id, action: l.action, actor: l.actor_label ?? 'system',
      targetType: l.target_type, targetId: l.target_id,
      metadata: l.metadata, createdAt: l.created_at,
    })),
    page, limit, total: count ?? 0,
  });
});