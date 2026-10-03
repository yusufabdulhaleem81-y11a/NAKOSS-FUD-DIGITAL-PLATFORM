import { USE_MOCKS } from '@/lib/env';
import { api } from '@/lib/api';

/** Shape of GET /api/me/card — the backend returns exactly this. */
export interface MembershipCardData {
  fullName: string;
  membershipNumber: string;
  matricNumber: string | null;
  department: string | null;
  level: string | null;
  photoUrl: string | null;
  status: string;          // 'pending' | 'verified' | 'active' | ...
  session: string;         // '2026/2027'
  position: string | null; // set → the card renders as an EXCO ID
}

export const cardService = {
  async getMyCard(): Promise<MembershipCardData> {
    if (USE_MOCKS) {
      // Demo card so you can preview the design before the backend runs.
      return {
        fullName: 'Aisha Muhammad',
        membershipNumber: 'NAKOSS-2026-0001',
        matricNumber: 'FUD/CSC/21/0183',
        department: 'Computer Science',
        level: '300 Level',
        photoUrl: null,
        status: 'verified',
        session: '2026/2027',
        position: null,
      };
    }
    return api.get<MembershipCardData>('/api/me/card');
  },
};