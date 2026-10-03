import { Router } from 'express';
import { db } from '../lib/supabase';
import { authenticate, uid, authLimiter } from '../middleware/auth';
import { audit } from '../services/audit';

export const authRouter = Router();

/**
 * The frontend already changed the password via Supabase Auth
 * (supabase.auth.updateUser). This endpoint completes the flow:
 * invalidate all unused temp passwords + clear the forced-change flag.
 */
authRouter.post('/api/auth/change-password', authLimiter, authenticate, async (req, res) => {
  const profileId = uid(req);

  await db.from('temporary_passwords')
    .update({ used_at: new Date().toISOString() })
    .eq('profile_id', profileId)
    .is('used_at', null);

  await db.from('profiles')
    .update({ must_change_password: false })
    .eq('id', profileId);

  await audit({ actorId: profileId, action: 'auth.password_changed' });
  res.json({ ok: true });
});