import { db } from '../lib/supabase';

export async function audit(opts: {
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  let actorLabel: string | null = null;
  if (opts.actorId) {
    const { data } = await db.from('profiles').select('full_name').eq('id', opts.actorId).maybeSingle();
    actorLabel = data?.full_name ?? null;
  }
  await db.from('activity_logs').insert({
    actor_id: opts.actorId,
    actor_label: actorLabel,
    action: opts.action,
    target_type: opts.targetType ?? null,
    target_id: opts.targetId ?? null,
    metadata: opts.metadata ?? {},
    ip: opts.ip ?? null,
  });
}