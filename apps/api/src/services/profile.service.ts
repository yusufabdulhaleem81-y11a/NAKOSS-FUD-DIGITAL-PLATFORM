import { db, ApiError } from '../lib/supabase';

export async function getEffectivePermissions(profileId: string): Promise<Set<string>> {
  const permissions = new Set<string>();

  const { data: assignments } = await db
    .from('role_assignments')
    .select('role_id')
    .eq('profile_id', profileId)
    .is('revoked_at', null);
  const roleIds = (assignments ?? []).map((a: any) => a.role_id);

  if (roleIds.length) {
    const { data: rp } = await db
      .from('role_permissions')
      .select('permissions(key)')
      .in('role_id', roleIds);
    (rp ?? []).forEach((row: any) => {
      if (row.permissions?.key) permissions.add(row.permissions.key);
    });
  }

  const { data: member } = await db
    .from('members').select('id')
    .eq('profile_id', profileId).maybeSingle();

  if (member) {
    const { data: las } = await db
      .from('leadership_assignments')
      .select('position_id')
      .eq('member_id', member.id)
      .eq('status', 'active');
    const posIds = (las ?? []).map((l: any) => l.position_id);

    if (posIds.length) {
      const { data: pp } = await db
        .from('position_permissions')
        .select('permissions(key)')
        .in('position_id', posIds);
      (pp ?? []).forEach((row: any) => {
        if (row.permissions?.key) permissions.add(row.permissions.key);
      });
    }
  }

  return permissions;
}

async function getRoleKeys(profileId: string): Promise<string[]> {
  const { data } = await db
    .from('role_assignments')
    .select('roles(key)')
    .eq('profile_id', profileId)
    .is('revoked_at', null);
  const keys = (data ?? []).map((r: any) => r.roles?.key).filter(Boolean) as string[];
  return keys.length ? keys : ['student'];
}

async function getPhotoUrl(photoPath: string | null): Promise<string | null> {
  if (!photoPath) return null;
  const { data } = await db.storage.from('members-photos').createSignedUrl(photoPath, 3600);
  return data?.signedUrl ?? null;
}

export async function getMe(authUserId: string) {
  const { data: profile, error } = await db
    .from('profiles').select('*').eq('id', authUserId).maybeSingle();
  if (error || !profile) throw new ApiError(404, 'Profile not found', 'PROFILE_NOT_FOUND');
  if (!profile.is_active) throw new ApiError(403, 'Account suspended', 'ACCOUNT_SUSPENDED');

  const [{ data: authUser }, permissions, roles] = await Promise.all([
    db.auth.admin.getUserById(authUserId),
    getEffectivePermissions(authUserId),
    getRoleKeys(authUserId),
  ]);

  const { data: member } = await db
    .from('members')
    .select('id, membership_number, photo_path')
    .eq('profile_id', authUserId)
    .maybeSingle();

  let position: string | null = null;
  let administrationSession: string | null = null;
  const { data: currentAdmin } = await db
    .from('administrations')
    .select('id, session_label')
    .eq('is_current', true)
    .maybeSingle();

  if (member && currentAdmin) {
    const { data: las } = await db
      .from('leadership_assignments')
      .select('positions(title), administrations(session_label)')
      .eq('member_id', member.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);
    if (las?.[0]) {
      position = (las[0] as any).positions?.title ?? null;
      administrationSession = (las[0] as any).administrations?.session_label ?? null;
    }
  }
  if (!administrationSession) administrationSession = currentAdmin?.session_label ?? null;

  return {
    id: authUserId,
    fullName: profile.full_name,
    email: authUser?.user?.email ?? null,
    photoUrl: await getPhotoUrl(member?.photo_path ?? null),
    membershipNumber: member?.membership_number ?? null,
    position,
    administrationSession,
    roles,
    permissions: [...permissions],
    mustChangePassword: profile.must_change_password,
  };
}

/**
 * Card data for GET /api/me/card — EVERYTHING on the card comes from the
 * database, live. If the photo, level, or position changes, the card changes.
 * If the officer's assignment is in a past administration, the card renders
 * as a plain membership card (no EXCO banner).
 */
export async function getMyCard(authUserId: string) {
  const { data: member } = await db
    .from('members')
    .select('id, membership_number, full_name, matric_number, status, photo_path, joined_session, departments(name), levels(label)')
    .eq('profile_id', authUserId)
    .maybeSingle();
  if (!member) {
    throw new ApiError(404, 'No membership record linked to this account', 'NO_MEMBER_RECORD');
  }

  const { data: currentAdmin } = await db
    .from('administrations')
    .select('session_label')
    .eq('is_current', true)
    .maybeSingle();

  let position: string | null = null;
  let session: string | null = null;

  const { data: las } = await db
    .from('leadership_assignments')
    .select('positions(title), administrations(session_label, is_current)')
    .eq('member_id', member.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (las?.[0]) {
    const la = las[0] as any;
    if (la.administrations?.is_current) {
      position = la.positions?.title ?? null;
      session = la.administrations?.session_label ?? null;
    }
  }

  if (!session) session = currentAdmin?.session_label ?? member.joined_session ?? null;

  return {
    fullName: member.full_name,
    membershipNumber: member.membership_number,
    matricNumber: member.matric_number,
    department: (member as any).departments?.name ?? null,
    level: (member as any).levels?.label ?? null,
    photoUrl: await getPhotoUrl(member.photo_path),
    status: member.status as string,
    session: session as string,
    position,
  };
}