import { env } from './env';
import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!env.VITE_API_URL) throw new ApiError(0, 'API URL is not configured yet.');
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${env.VITE_API_URL}${path}`, {
    ...options,
    headers: {
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText, body.code);
  }
  return res.json();
}

export const api = {
  get:   <T>(p: string)          => request<T>(p),
  post:  <T>(p: string, b?: unknown) => request<T>(p, { method: 'POST',  body: JSON.stringify(b), headers: { 'Content-Type': 'application/json' } }),
  patch: <T>(p: string, b?: unknown) => request<T>(p, { method: 'PATCH', body: JSON.stringify(b), headers: { 'Content-Type': 'application/json' } }),
  /** Multipart upload (e.g. registration with photo). */
  postForm: <T>(p: string, form: FormData) => request<T>(p, { method: 'POST', body: form }),
};