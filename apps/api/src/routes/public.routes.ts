import { Router } from 'express';
import { db, ApiError } from '../lib/supabase';
import { verifyLimiter } from '../middleware/auth';

export const publicRouter = Router();

/** Read by the login page + public site. Changes when Central Admin switches administrations. */
publicRouter.get('/api/public/current-administration', async (_req, res) => {
  const { data: admin } = await db
    .from('public_current_administration').select('*').maybeSingle();
  if (!admin) throw new ApiError(404, 'No current administration set', 'NO_CURRENT_ADMINISTRATION');

  let groupPhotoUrl: string | null = null;
  if (admin.group_photo_path) {
    groupPhotoUrl = db.storage.from('administration-photos')
      .getPublicUrl(admin.group_photo_path).data.publicUrl;
  }

  const { data: leaders } = await db
    .from('public_current_leadership').select('position_title, full_name');

  res.json({
    id: admin.id,
    sessionLabel: admin.session_label,
    motto: admin.motto,
    groupPhotoUrl,
    presidentName: leaders?.find((l: any) => l.position_title === 'President')?.full_name ?? null,
    vicePresidentName: leaders?.find((l: any) => l.position_title === 'Vice President')?.full_name ?? null,
  });
});

/** ALL active positions — vacant ones return null so the UI can show "Vacant". */
publicRouter.get('/api/leadership/current', async (_req, res) => {
  const [{ data: positions }, { data: holders }] = await Promise.all([
    db.from('positions').select('title').eq('is_active', true).order('sort_order'),
    db.from('public_current_leadership').select('position_title, full_name, photo_path'),
  ]);
  const byPosition = new Map((holders ?? []).map((h: any) => [h.position_title, h]));
  res.json((positions ?? []).map((p: any) => ({
    position: p.title,
    holderName: byPosition.get(p.title)?.full_name ?? null,
    photoUrl: byPosition.get(p.title)?.photo_path ?? null,
  })));
});

/** PUBLIC QR verification — whitelist only, heavily rate-limited, every scan recorded. */
publicRouter.get('/api/verify/:membershipNumber', verifyLimiter, async (req, res) => {
  const number = String(req.params.membershipNumber).toUpperCase().trim();

  const { data, error } = await db.rpc('public_verify_member', { p_number: number });
  const row = data?.[0];

  if (error || !row) {
    await db.from('verification_records').insert({ membership_number: number, result: 'not_found' });
    throw new ApiError(404, 'Membership not found', 'NOT_FOUND');
  }

  await db.from('verification_records').insert({
    membership_number: row.membership_number,
    result: 'verified',
  });

  res.json({
    fullName: row.full_name,
    department: row.department,
    level: row.level,
    membershipNumber: row.membership_number,
    status: row.status,
    sessionLabel: row.session_label,
    positionTitle: row.position_title,
    officerVerified: row.officer_verified,
  });
});