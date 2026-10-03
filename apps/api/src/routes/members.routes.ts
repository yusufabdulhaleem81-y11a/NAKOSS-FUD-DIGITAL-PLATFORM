import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { db, ApiError } from '../lib/supabase';
import { authLimiter } from '../middleware/auth';
import { audit } from '../services/audit';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};

/** Magic-byte check — never trust the client's declared MIME type. */
function detectImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

async function rollbackUser(userId: string) {
  try { await db.auth.admin.deleteUser(userId); } catch { /* best effort */ }
}

const registerSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().min(7).max(20),
  matricNumber: z.string().trim().min(3).max(50),
  departmentId: z.string().uuid(),
  levelId: z.string().uuid(),
  stateId: z.string().uuid(),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  password: z.string().min(10).max(72),
});

export const membersRouter = Router();

/** Dropdown data for the registration form — public. */
membersRouter.get('/api/public/reference-data', async (_req, res) => {
  const [departments, levels, states, categories] = await Promise.all([
    db.from('departments').select('id, name, faculties(name)').order('name'),
    db.from('levels').select('id, label').order('sort'),
    db.from('states').select('id, name').order('name'),
    db.from('member_categories').select('id, label').eq('is_active', true).order('sort'),
  ]);

  res.json({
    departments: (departments.data ?? []).map((d: any) => ({ id: d.id, name: d.name, faculty: d.faculties?.name ?? null })),
    levels: levels.data ?? [],
    states: states.data ?? [],
    categories: categories.data ?? [],
  });
});

/**
 * PUBLIC registration. Creates the auth account + profile (trigger),
 * uploads the photo, then calls the ATOMIC register_member RPC which
 * mints the membership number under a row lock — two simultaneous
 * registrations can never collide. Any failure after account creation
 * rolls the account back.
 */
membersRouter.post('/api/members/register', authLimiter, upload.single('photo'), async (req, res) => {
  const input = registerSchema.parse({
    ...req.body,
    categoryId: req.body.categoryId || undefined,
  });

  // Registration open? (Central Admin can close it via settings)
  const { data: setting } = await db.from('settings').select('value').eq('key', 'registration.open').maybeSingle();
  if (setting && setting.value === false) {
    throw new ApiError(403, 'Registration is currently closed', 'REGISTRATION_CLOSED');
  }

  // Validate photo content (magic bytes), not just the declared type
  let photoMime: string | null = null;
  if (req.file) {
    photoMime = detectImageMime(req.file.buffer);
    if (!photoMime || !ALLOWED_IMAGE.has(photoMime)) {
      throw new ApiError(400, 'Photo must be a JPEG, PNG or WebP image', 'INVALID_FILE');
    }
  }

  // 1) Create the auth account (profile is auto-created by the DB trigger)
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, phone: input.phone },
  });
  if (authError || !authData.user) {
    const msg = authError?.message ?? '';
    if (msg.toLowerCase().includes('already')) {
      throw new ApiError(409, 'This email is already registered', 'EMAIL_EXISTS');
    }
    throw new ApiError(400, msg || 'Could not create account');
  }
  const userId = authData.user.id;

  try {
    // 2) Upload photo (service role — bucket is private)
    let photoPath: string | null = null;
    if (req.file && photoMime) {
      photoPath = `members/${userId}/photo.${EXT_BY_MIME[photoMime]}`;
      const { error: upErr } = await db.storage.from('members-photos').upload(photoPath, req.file.buffer, {
        contentType: photoMime, upsert: true,
      });
      if (upErr) throw new ApiError(500, 'Photo upload failed');
    }

    // 3) Current administration session label
    const { data: currentAdmin } = await db.from('administrations').select('session_label').eq('is_current', true).maybeSingle();
    const now = new Date();
    const session = currentAdmin?.session_label ?? `${now.getFullYear()}/${now.getFullYear() + 1}`;

    // 4) THE atomic registration — number minted under row lock
    const { data: rpcData, error: rpcError } = await db.rpc('register_member', {
      p_profile_id: userId,
      p_full_name: input.fullName,
      p_email: input.email,
      p_phone: input.phone,
      p_matric: input.matricNumber,
      p_department: input.departmentId,
      p_level: input.levelId,
      p_state: input.stateId,
      p_category: input.categoryId || null,
      p_photo: photoPath,
      p_session: session,
    });
    if (rpcError) {
      if (rpcError.message.includes('MATRIC_EXISTS')) {
        throw new ApiError(409, 'This matric number is already registered', 'MATRIC_EXISTS');
      }
      throw new ApiError(500, rpcError.message);
    }
    const member = Array.isArray(rpcData) ? rpcData[0] : rpcData;

    // 5) Friendly labels for the card/success page
    const [{ data: dept }, { data: level }] = await Promise.all([
      db.from('departments').select('name').eq('id', input.departmentId).maybeSingle(),
      db.from('levels').select('label').eq('id', input.levelId).maybeSingle(),
    ]);

    let photoUrl: string | null = null;
    if (photoPath) {
      const { data: signed } = await db.storage.from('members-photos').createSignedUrl(photoPath, 3600);
      photoUrl = signed?.signedUrl ?? null;
    }

    if (photoPath) {
      await db.from('file_assets').insert({
        bucket: 'members-photos', path: photoPath,
        file_name: req.file?.originalname ?? null, mime_type: photoMime,
        size_bytes: req.file?.size ?? null, uploaded_by: userId,
        visibility: 'members', target_type: 'member', target_id: (member as any).id,
      });
    }

    await audit({
      actorId: userId, action: 'member.registered',
      targetType: 'member', targetId: (member as any).id,
      metadata: { membershipNumber: (member as any).membership_number },
    });

    res.status(201).json({
      membershipNumber: (member as any).membership_number,
      fullName: (member as any).full_name,
      matricNumber: (member as any).matric_number,
      department: dept?.name ?? null,
      level: level?.label ?? null,
      status: (member as any).status,
      session: (member as any).joined_session,
      photoUrl,
    });
  } catch (e) {
    await rollbackUser(userId); // no orphan accounts
    throw e;
  }
});