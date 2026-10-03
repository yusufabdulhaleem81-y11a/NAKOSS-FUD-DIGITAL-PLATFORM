import { Router } from 'express';
import { db, ApiError } from '../lib/supabase';
import { authenticate, uid } from '../middleware/auth';

export const notificationsRouter = Router();

notificationsRouter.get('/api/notifications', authenticate, async (req, res) => {
  const { data } = await db.from('notifications')
    .select('*').eq('recipient_id', uid(req))
    .order('created_at', { ascending: false }).limit(30);

  const items = (data ?? []).map((n: any) => ({
    id: n.id, title: n.title, body: n.body, category: n.category,
    link: n.link, read: !!n.read_at, createdAt: n.created_at,
  }));
  res.json({ unread: items.filter((i) => !i.read).length, items });
});

notificationsRouter.post('/api/notifications/:id/read', authenticate, async (req, res) => {
  const { error } = await db.from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', req.params.id).eq('recipient_id', uid(req));
  if (error) throw new ApiError(500, error.message);
  res.json({ ok: true });
});

notificationsRouter.post('/api/notifications/read-all', authenticate, async (req, res) => {
  const { error } = await db.from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', uid(req)).is('read_at', null);
  if (error) throw new ApiError(500, error.message);
  res.json({ ok: true });
});