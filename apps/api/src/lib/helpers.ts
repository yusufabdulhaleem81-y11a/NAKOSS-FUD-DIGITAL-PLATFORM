import { db, ApiError } from './supabase';

/** Every governance row is scoped to the current administration — resolved here, never guessed. */
export async function currentAdministrationId(): Promise<string> {
  const { data } = await db.from('administrations').select('id').eq('is_current', true).maybeSingle();
  if (!data) throw new ApiError(400, 'No current administration has been set', 'NO_CURRENT_ADMINISTRATION');
  return data.id;
}

/** Exact count with filters. { col: null } → IS NULL, arrays → IN. */
export async function countOf(table: string, filters: Record<string, unknown> = {}): Promise<number> {
  let q = db.from(table).select('id', { count: 'exact', head: true });
  for (const [col, val] of Object.entries(filters)) {
    if (val === null) q = q.is(col, null);
    else if (Array.isArray(val)) q = q.in(col, val as string[]);
    else q = q.eq(col, val as string);
  }
  const { count } = await q;
  return count ?? 0;
}