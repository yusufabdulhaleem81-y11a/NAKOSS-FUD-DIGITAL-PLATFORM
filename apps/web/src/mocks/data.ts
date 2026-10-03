import type { Announcement, LeaderEntry, MembershipAnalytics, PendingApproval, Report, Task } from '@/types/task';

/** In-memory demo store — mutations persist for the browser session only. */
export const mockDb = {
  tasks: [
    { id: 't1', title: 'Draft freshers’ orientation budget', description: 'Line items for venue, refreshments and printing.', assigneeName: 'Musa Ali', assigneePosition: 'Treasurer', createdByName: 'Ibrahim Yusuf', deadline: '2026-02-10T17:00:00Z', priority: 'high', status: 'in_progress', progress: 60, reportText: null },
    { id: 't2', title: 'Publish press release: academic awards', description: null, assigneeName: 'Dev exco', assigneePosition: 'P.R.O 1', createdByName: 'Fatima Abubakar', deadline: '2026-01-28T17:00:00Z', priority: 'urgent', status: 'submitted', progress: 100, reportText: 'Draft attached for review.' },
    { id: 't3', title: 'Compile welfare needs assessment', description: 'Survey 200-level and 300-level students.', assigneeName: 'Zainab Idris', assigneePosition: 'Welfare Director', createdByName: 'Fatima Abubakar', deadline: '2026-02-20T17:00:00Z', priority: 'medium', status: 'pending', progress: 0, reportText: null },
    { id: 't4', title: 'Organise inter-departmental football fixture', description: null, assigneeName: 'Sani Bello', assigneePosition: 'Sports Director', createdByName: 'Ibrahim Yusuf', deadline: '2026-01-15T17:00:00Z', priority: 'medium', status: 'completed', progress: 100, reportText: 'Completed with 8 departments participating.' },
    { id: 't5', title: 'Digitise 2024/2025 past questions (CS)', description: 'Scan and upload to the resource hub.', assigneeName: 'Dev exco', assigneePosition: 'P.R.O 1', createdByName: 'Fatima Abubakar', deadline: '2026-01-10T17:00:00Z', priority: 'low', status: 'pending', progress: 0, reportText: null },
    { id: 't6', title: 'Audit Q1 expenditure receipts', description: null, assigneeName: 'Hauwa Garba', assigneePosition: 'Auditor General', createdByName: 'Ibrahim Yusuf', deadline: '2026-02-01T17:00:00Z', priority: 'high', status: 'in_progress', progress: 35, reportText: null },
  ] as Task[],

  officers: [
    { id: 'o1', name: 'Musa Ali', position: 'Treasurer' },
    { id: 'o2', name: 'Zainab Idris', position: 'Welfare Director' },
    { id: 'o3', name: 'Sani Bello', position: 'Sports Director' },
    { id: 'o4', name: 'Hauwa Garba', position: 'Auditor General' },
    { id: 'o5', name: 'Emeka Obi', position: 'General Secretary' },
    { id: 'o6', name: 'Amina Sadiq', position: 'Social Director' },
    { id: 'o7', name: 'Dev exco', position: 'P.R.O 1' },
  ],

  leadership: [
    { position: 'President', holderName: 'Ibrahim Yusuf' },
    { position: 'Vice President', holderName: 'Fatima Abubakar' },
    { position: 'General Secretary', holderName: 'Emeka Obi' },
    { position: 'Treasurer', holderName: 'Musa Ali' },
    { position: 'Financial Secretary', holderName: null },
    { position: 'Assistant General Secretary', holderName: null },
    { position: 'Assistant Secretary', holderName: null },
    { position: 'Special Adviser', holderName: null },
    { position: 'Provost', holderName: null },
    { position: 'Speaker', holderName: null },
    { position: 'Chief of Staff', holderName: null },
    { position: 'Welfare Director', holderName: 'Zainab Idris' },
    { position: 'Social Director', holderName: 'Amina Sadiq' },
    { position: 'P.R.O 1', holderName: 'Dev exco' },
    { position: 'P.R.O 2', holderName: null },
    { position: 'Sports Director', holderName: 'Sani Bello' },
    { position: 'Auditor General', holderName: 'Hauwa Garba' },
  ] as LeaderEntry[],

  approvals: [
    { id: 'a1', type: 'News', title: 'NAKOSS wins debate championship', submittedBy: 'Emeka Obi', submittedAt: '2026-01-24T10:00:00Z' },
    { id: 'a2', type: 'Past Question', title: 'CSC 301 — 2024/2025 Second Semester', submittedBy: 'Dev exco', submittedAt: '2026-01-23T14:20:00Z' },
    { id: 'a3', type: 'Document', title: 'Revised dues policy (v2)', submittedBy: 'Musa Ali', submittedAt: '2026-01-22T09:00:00Z' },
    { id: 'a4', type: 'Project', title: 'Computer lab renovation', submittedBy: 'Fatima Abubakar', submittedAt: '2026-01-21T16:45:00Z' },
  ] as PendingApproval[],

  reports: [
    { id: 'r1', title: 'January office report — Publicity', body: 'Two press releases published; social engagement up 18%.', authorName: 'Dev exco', status: 'approved', createdAt: '2026-01-31T18:00:00Z' },
    { id: 'r2', title: 'Week 3 publicity roundup', body: 'Awaiting review.', authorName: 'Dev exco', status: 'pending_review', createdAt: '2026-02-07T12:30:00Z' },
    { id: 'r3', title: 'Draft — orientation publicity plan', body: 'Not yet submitted.', authorName: 'Dev exco', status: 'draft', createdAt: '2026-02-09T08:00:00Z' },
  ] as Report[],

  announcements: [
    { id: 'n1', title: 'Dues payment deadline extended', body: 'Membership dues may now be paid until Feb 28 via the Treasurer.', publishedAt: '2026-02-05T09:00:00Z', author: 'General Secretary' },
    { id: 'n2', title: 'EXCO meeting — Thursday 5pm', body: 'All officers should attend with office reports.', publishedAt: '2026-02-03T15:00:00Z', author: 'Chief of Staff' },
    { id: 'n3', title: 'Past questions drive', body: 'Submit scanned past questions to your P.R.O.', publishedAt: '2026-01-30T11:00:00Z', author: 'Vice President' },
  ] as Announcement[],
};

/**
 * DEMO ANALYTICS ONLY — every number here will be replaced by real DB queries
 * (Phase 5). Category labels are placeholders: the real labels are configured
 * by Central Admin and are never invented by the app.
 */
export const mockAnalytics: MembershipAnalytics = {
  totalMembers: 743, verifiedMembers: 612, activeMembers: 587, excoOfficers: 17,
  activeProjects: 5, pendingTasks: 3, completedTasks: 41, pendingApprovals: 4,
  byLevel: [
    { label: '100 Level', count: 186 }, { label: '200 Level', count: 203 },
    { label: '300 Level', count: 171 }, { label: '400 Level', count: 141 },
    { label: '500 Level', count: 42 },
  ],
  byDepartment: [
    { label: 'Computer Science', count: 121 }, { label: 'Medicine & Surgery', count: 98 },
    { label: 'Economics', count: 83 }, { label: 'Law', count: 76 },
    { label: 'Civil Engineering', count: 69 }, { label: 'Others', count: 296 },
  ],
  byState: [
    { label: 'Jigawa', count: 152 }, { label: 'Kano', count: 128 }, { label: 'Bauchi', count: 97 },
    { label: 'Kaduna', count: 74 }, { label: 'Borno', count: 61 }, { label: 'Others', count: 231 },
  ],
  byLocalGovernment: [
    { label: 'Dutse', count: 44 }, { label: 'Birnin Kudu', count: 31 }, { label: 'Gwaram', count: 26 },
    { label: 'Hadejia', count: 19 }, { label: 'Kazaure', count: 17 }, { label: 'Kiyawa', count: 14 },
    { label: 'Miga', count: 12 }, { label: 'Ringim', count: 10 }, { label: 'Others', count: 58 },
  ],
  byCategory: [
    { label: 'Category A', count: 268 }, { label: 'Category B', count: 221 }, { label: 'Category C', count: 254 },
  ],
  registrationTrend: [
    { week: 'Dec 15', count: 18 }, { week: 'Dec 22', count: 34 }, { week: 'Dec 29', count: 61 },
    { week: 'Jan 05', count: 102 }, { week: 'Jan 12', count: 148 }, { week: 'Jan 19', count: 121 },
    { week: 'Jan 26', count: 96 }, { week: 'Feb 02', count: 74 },
  ],
};