import { USE_MOCKS } from '@/lib/env';
import { api } from '@/lib/api';
import type { MembershipCardData } from '@/services/card.service';

export type RegistrationResult = Omit<MembershipCardData, 'position'> & { position: null };

export interface ReferenceData {
  departments: { id: string; name: string; faculty: string | null }[];
  levels: { id: string; label: string }[];
  states: { id: string; name: string }[];
  localGovernments: { id: string; stateId: string; name: string }[];
  categories: { id: string; label: string }[];
}

export interface RegisterInput {
  fullName: string; email: string; phone: string; matricNumber: string;
  departmentId: string; levelId: string; stateId: string; localGovernmentId: string; categoryId: string;
  password: string; photo?: File | null;
}

const FACULTIES = [
  'Faculty of Agriculture',
  'Faculty of Arts',
  'Faculty of Computing',
  'Faculty of Education',
  'Faculty of Engineering',
  'Faculty of Environmental Sciences',
  'Faculty of Law',
  'Faculty of Science',
  'Faculty of Social Sciences',
];

const KOGI_LGAS = [
  'Adavi', 'Ajaokuta', 'Ankpa', 'Bassa', 'Dekina', 'Ibaji', 'Idah',
  'Igalamela-Odolu', 'Ijumu', 'Kabba/Bunu', 'Kogi', 'Lokoja', 'Mopa-Muro',
  'Ofu', 'Ogori/Magongo', 'Okehi', 'Okene', 'Olamaboro', 'Omala',
  'Yagba East', 'Yagba West',
];

const MOCK_REFERENCE: ReferenceData = {
  departments: FACULTIES.map((name, index) => ({
    id: `f${index + 1}`,
    name,
    faculty: null,
  })),
  levels: [
    { id: 'l1', label: '100 Level' }, { id: 'l2', label: '200 Level' },
    { id: 'l3', label: '300 Level' }, { id: 'l4', label: '400 Level' },
  ],
  states: [{ id: 's1', name: 'Kogi' }],
  localGovernments: KOGI_LGAS.map((name, index) => ({
    id: `lg${index + 1}`,
    stateId: 's1',
    name,
  })),
  categories: [ { id: 'c1', label: 'Category A' }, { id: 'c2', label: 'Category B' }, { id: 'c3', label: 'Category C' } ],
};

export const registrationService = {
  async getReferenceData(): Promise<ReferenceData> {
    if (USE_MOCKS) return MOCK_REFERENCE;
    return api.get<ReferenceData>('/api/public/reference-data');
  },

  async register(input: RegisterInput): Promise<RegistrationResult> {
    if (USE_MOCKS) {
      await new Promise((r) => setTimeout(r, 800));
      return {
        fullName: input.fullName, membershipNumber: 'NAKOSS-2026-0042',
        matricNumber: input.matricNumber, department: 'Computer Science (demo)',
        level: '200 Level (demo)', photoUrl: null, status: 'pending',
        session: '2026/2027', position: null,
      };
    }
    const fd = new FormData();
    fd.set('fullName', input.fullName);
    fd.set('email', input.email);
    fd.set('phone', input.phone);
    fd.set('matricNumber', input.matricNumber);
    fd.set('departmentId', input.departmentId);
    fd.set('levelId', input.levelId);
    fd.set('stateId', input.stateId);
    fd.set('categoryId', input.categoryId || '');
    fd.set('password', input.password);
    if (input.photo) fd.set('photo', input.photo);
    return api.postForm<RegistrationResult>('/api/members/register', fd);
  },
};