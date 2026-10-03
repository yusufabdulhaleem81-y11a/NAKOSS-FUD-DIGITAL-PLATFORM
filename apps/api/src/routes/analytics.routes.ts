import { Router } from 'express';
import { db } from '../lib/supabase';
import { authenticate, requirePermission } from '../middleware/auth';
import { countOf } from '../lib/helpers';

export const analyticsRouter = Router();

function startOfWeek(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); // Monday start
  return x;
}
function weekLabel(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

/** reference-table labels × member counts — always computed, never stored. */
async function breakdown(refTable: string, labelCol: string, fkCol: string, orderCol: string, keepZero = false) {
  const [{ data: refs }, { data: fks }] = await Promise.all([
    db.from(refTable).select(`id, ${labelCol}`).order(orderCol),
    db.from('members').select(fkCol),
  ]);
  const counts = new Map<string, number>();
  (fks ?? []).forEach((m: any) => {
    const key = m[fkCol] as string | null;
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const result = (refs ?? []).map((r: any) => ({ label: r[labelCol] as string, count: counts.get(r.id) ?? 0 }));
  return keepZero ? result : result.filter((x) => x.count > 0);
}

analyticsRouter.get('/api/analytics/membership-summary', authenticate, requirePermission('analytics.view'), async (_req, res) => {
  const { data: currentAdmin } = await db.from('administrations').select('id').eq('is_current', true).maybeSingle();

  const totalMembers     = await countOf('members');
  const verifiedMembers  = await countOf('members', { status: ['verified', 'active'] });
  const activeMembers    = await countOf('members', { status: 'active' });
  const excoOfficers     = currentAdmin ? await countOf('leadership_assignments', { administration_id: currentAdmin.id, status: 'active' }) : 0;
  const activeProjects   = currentAdmin ? await countOf('projects', { administration_id: currentAdmin.id, status: ['planned', 'ongoing'] }) : 0;
  const pendingTasks     = currentAdmin ? await countOf('tasks', { administration_id: currentAdmin.id, status: ['pending', 'in_progress'] }) : 0;
  const completedTasks   = currentAdmin ? await countOf('tasks', { administration_id: currentAdmin.id, status: 'completed' }) : 0;
  const pendingApprovals = await countOf('approvals', { decided_at: null });

  const { data: rows } = await db.from('members').select('created_at');
  const weekly = new Map<string, number>();
  (rows ?? []).forEach((r: any) => {
    const key = startOfWeek(new Date(r.created_at)).toISOString().slice(0, 10);
    weekly.set(key, (weekly.get(key) ?? 0) + 1);
  });
  const registrationTrend: { week: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const week = startOfWeek(new Date(Date.now() - i * 7 * 24 * 3600 * 1000));
    const key = week.toISOString().slice(0, 10);
    registrationTrend.push({ week: weekLabel(week), count: weekly.get(key) ?? 0 });
  }

  res.json({
    totalMembers, verifiedMembers, activeMembers, excoOfficers,
    activeProjects, pendingTasks, completedTasks, pendingApprovals,
    byLevel:      await breakdown('levels', 'label', 'level_id', 'sort', true),
    byDepartment: await breakdown('departments', 'name', 'department_id', 'name'),
    byState:      await breakdown('states', 'name', 'state_id', 'name'),
    byCategory:   await breakdown('member_categories', 'label', 'category_id', 'sort'),
    registrationTrend,
  });
});