import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { db, ApiError } from '../lib/supabase';
import { authLimiter } from '../middleware/auth';
import { audit } from '../services/audit';

export const invitesRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function detectImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

invitesRouter.get('/api/invites/:token', async (req, res) => {
  const { data: inv } = await db.from('invitations')
    .select('email, full_name, status, expires_at, positions(title), administrations(session_label)')
    .eq('token', req.params.token).maybeSingle();

  if (!inv || inv.status !== 'pending' || new Date(inv.expires_at) < new Date()) {
    throw new ApiError(404, 'This invitation is invalid or has expired', 'INVITATION_INVALID');
  }
  res.json({
    email: inv.email, fullName: inv.full_name,
    positionTitle: (inv as any).positions?.title ?? null,
    sessionLabel: (inv as any).administrations?.session_label ?? null,
  });
});

const acceptSchema = z.object({
  token: z.string().min(10),
  fullName: z.string().min(3).max(120),
  matricNumber: z.string().min(3).max(50),
  departmentId: z.string().uuid(),
  levelId: z.string().uuid(),
  stateId: z.string().uuid(),
  password: z.string().min(10).max(72),
});

invitesRouter.post('/api/invites/accept', authLimiter, upload.single('photo'), async (req, res) => {
  const input = acceptSchema.parse(req.body);

  const { data: inv } = await db.from('invitations').select('*').eq('token', input.token).maybeSingle();
  if (!inv || inv.status !== 'pending' || new Date(inv.expires_at) < new Date()) {
    throw new ApiError(400, 'This invitation is invalid or has expired', 'INVITATION_INVALID');
  }

  let photoMime: string | null = null;
  if (req.file) {
    photoMime = detectImageMime(req.file.buffer);
    if (!photoMime || !ALLOWED_IMAGE.has(photoMime)) {
      throw new ApiError(400, 'Photo must be a JPEG, PNG or WebP image', 'INVALID_FILE');
    }
  }

  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email: inv.email, password: input.password, email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (authError || !authData.user) {
    const msg = authError?.message ?? '';
    if (msg.toLowerCase().includes('already')) throw new ApiError(409, 'An account with this email already exists', 'EMAIL_EXISTS');
    throw new ApiError(400, msg || 'Could not create account');
  }
  const userId = authData.user.id;

  try {
    let photoPath: string | null = null;
    if (req.file && photoMime) {
      photoPath = `members/${userId}/photo.${EXT[photoMime]}`;
      const { error: upErr } = await db.storage.from('members-photos')
        .upload(photoPath, req.file.buffer, { contentType: photoMime, upsert: true });
      if (upErr) throw new ApiError(500, 'Photo upload failed');
    }

    const { data: adminRow } = await db.from('administrations')
      .select('session_label').eq('id', inv.administration_id).maybeSingle();

    const { data: rpcData, error: rpcError } = await db.rpc('register_member', {
      p_profile_id: userId, p_full_name: input.fullName, p_email: inv.email,
      p_phone: null, p_matric: input.matricNumber,
      p_department: input.departmentId, p_level: input.levelId, p_state: input.stateId,
      p_category: null, p_photo: photoPath, p_session: adminRow?.session_label ?? null,
    });
    if (rpcError) {
      if (rpcError.message.includes('MATRIC_EXISTS')) throw new ApiError(409, 'This matric number is already registered', 'MATRIC_EXISTS');
      throw new ApiError(500, rpcError.message);
    }
    const member = Array.isArray(rpcData) ? rpcData[0] : rpcData;

    if (photoPath) {
      await db.from('file_assets').insert({
        bucket: 'members-photos', path: photoPath,
        file_name: req.file?.originalname ?? null, mime_type: photoMime,
        size_bytes: req.file?.size ?? null, uploaded_by: userId,
        visibility: 'members', target_type: 'member', target_id: (member as any).id,
      });
    }

    await db.from('leadership_assignments').insert({
      member_id: (member as any).id, position_id: inv.position_id,
      administration_id: inv.administration_id, assigned_by: inv.invited_by,
    });

    const { data: excoRole } = await db.from('roles').select('id').eq('key', 'exco').maybeSingle();
    if (excoRole) {
      const { data: existing } = await db.from('role_assignments')
        .select('id').eq('profile_id', userId).eq('role_id', excoRole.id)
        .eq('administration_id', inv.administration_id).is('revoked_at', null).maybeSingle();
      if (!existing) {
        await db.from('role_assignments').insert({
          profile_id: userId, role_id: excoRole.id,
          administration_id: inv.administration_id, assigned_by: inv.invited_by,
        });
      }
    }

    await db.from('invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', inv.id);

    await audit({ actorId: userId, action: 'exco.invitation.accepted', targetType: 'invitation', targetId: inv.id });

    let photoUrl: string | null = null;
    if (photoPath) {
      const { data: signed } = await db.storage.from('members-photos').createSignedUrl(photoPath, 3600);
      photoUrl = signed?.signedUrl ?? null;
    }
    res.json({ ok: true, membershipNumber: (member as any).membership_number, photoUrl });
  } catch (e) {
    try { await db.auth.admin.deleteUser(userId); } catch { /* best effort */ }
    throw e;
  }
});