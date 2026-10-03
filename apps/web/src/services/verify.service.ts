import { USE_MOCKS } from '@/lib/env';
import { api, ApiError } from '@/lib/api';

/** Exactly what the public endpoint returns — the whitelisted fields ONLY. */
export interface VerifyResult {
  fullName: string;
  department: string | null;
  level: string | null;
  membershipNumber: string;
  status: string;
  sessionLabel: string | null;
  positionTitle: string | null;
  officerVerified: boolean;
}

export type VerifyOutcome = { found: true; data: VerifyResult } | { found: false };

export const verifyService = {
  async verify(membershipNumber: string): Promise<VerifyOutcome> {
    if (USE_MOCKS) {
      await new Promise((r) => setTimeout(r, 500));
      if (membershipNumber.toUpperCase().endsWith('0000')) return { found: false };
      return {
        found: true,
        data: {
          fullName: 'Aisha Muhammad (demo)',
          department: 'Computer Science',
          level: '300 Level',
          membershipNumber: membershipNumber.toUpperCase(),
          status: 'verified',
          sessionLabel: '2026/2027',
          positionTitle: null,
          officerVerified: false,
        },
      };
    }
    try {
      const data = await api.get<VerifyResult>(`/api/verify/${encodeURIComponent(membershipNumber)}`);
      return { found: true, data };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return { found: false };
      throw e; // network / rate-limit errors surface to the page
    }
  },
};