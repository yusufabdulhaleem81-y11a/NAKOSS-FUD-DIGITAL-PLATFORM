NAKOSS Digital — FUD Chapter
One identity. Every administration.

The official digital platform of the National Association of Kano State Students(NAKOSS), Federal University Dutse Chapter — a complete membership, governance andresource system built to survive multiple administrations.

NAKOSS logo  FUD logo

✨ What it does
NAKOSS Digital is five systems sharing one identity:

System	What it provides
🌍 Public website	Home, news, events, projects, gallery — live from the database
🪪 Membership & Digital IDs	Registration → permanent membership number (NAKOSS-2026-0001) → dynamic ID card with QR verification
🏛️ Governance	EXCO dashboards, task assignment & tracking, reports, one shared approval pipeline, member submissions inbox
📚 Resource hub	Searchable past questions & documents (PDF, stored in object storage)
🗄️ Administration archive	Every administration preserved forever — switching the "current" one updates the whole platform instantly
Highlights
Race-proof membership numbers — atomic Postgres counter; two simultaneousregistrations can never collide
Dynamic digital ID cards — rendered live from the database (NAKOSS + FUD logos,QR code, officer banner). Change a photo → every card updates instantly
Public QR verification — /verify/NAKOSS-2026-0001 shows a strict whitelist offields only; every scan is logged and rate-limited
Data-driven leadership — no hardcoded President. Change the currentadministration → homepage, login page, dashboards and cards all update
Permission-driven EXCO modules — the P.R.O sees News & Gallery, the Treasurersees Finance — derived from editable position permissions, not code
One approval pipeline — nothing publishes without review: news, events,projects, past questions, gallery albums, reports
Anonymous submissions — members can report issues/suggestions; identity ishidden even from staff, but responses still reach them
One-time temporary passwords — WhatsApp-deliverable officer onboarding thatbypasses email limits entirely; forced password change on first login
Full audit log — every administrative action recorded (actor, action, target, when)
🧰 Tech stack
Layer	Technology
Frontend	React 18 · TypeScript · Vite · Tailwind CSS · shadcn-style UI · TanStack Query · Zustand
Backend	Node.js · Express · TypeScript · Zod · helmet · express-rate-limit
Database	PostgreSQL (Supabase) with Row Level Security on every table
Auth	Supabase Auth (JWT) — passwords hashed by Supabase, never stored by us
Storage	Supabase Storage (8 buckets, MIME + magic-byte validated uploads)
Hosting	Web → Vercel · API → Railway (Docker) · DB → Supabase
🚀 Getting started
Prerequisites
Node.js 18+ · a Supabase project · Git
1. Install
git clone https://github.com/YOUR-USERNAME/nakoss-digital.gitcd nakoss-digitalnpm install
2. Database setup
Run the three migration files (in order) in the Supabase SQL Editor:

supabase/migrations/0001_core.sql   ← tables, functions, triggerssupabase/migrations/0002_rls.sql    ← row-level security + views + storage bucketssupabase/migrations/0003_seed.sql   ← 17 positions, roles, permissions, states
3. Environment variables
apps/web/.env

VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.coVITE_SUPABASE_ANON_KEY=your-publishable-keyVITE_API_URL=http://localhost:4000VITE_USE_MOCKS=false
apps/api/.env (server-only — the service-role key NEVER leaves the backend)

PORT=4000SUPABASE_URL=https://YOUR-PROJECT.supabase.coSUPABASE_SERVICE_ROLE_KEY=your-secret-keyCORS_ORIGIN=http://localhost:5173
4. Run
npm run dev:api     # terminal 1 → API on :4000npm run dev         # terminal 2 → web app on :5173
5. Create your first admin
Create a user in Supabase (Authentication → Users), then:

insert into role_assignments (profile_id, role_id)select p.id, r.id from profiles p, roles rwhere r.key = 'central_admin';
📜 Scripts
Command	What it does
npm run dev	Web app (Vite)
npm run dev:api	API server (watch mode)
npm run build	Production web build
npm run typecheck	Typecheck both apps
🗂️ Project structure
nakoss-digital/├── apps/│   ├── web/                  # React frontend│   │   └── src/│   │       ├── features/     # public · auth · member · exco · president · vp · admin · verify│   │       ├── services/     # the ONLY fetch layer (mock-capable)│   │       ├── components/   # ui primitives + shared (cards, tables, shell)│   │       ├── store/ hooks/ lib/ types/│   │       └── app/          # router + guards│   └── api/                  # Express backend│       └── src/│           ├── routes/       # 14 route modules│           ├── middleware/   # JWT auth + requirePermission + rate limits│           ├── services/     # profile/permissions, audit│           └── lib/          # supabase admin client, helpers├── supabase/migrations/      # 0001 core · 0002 RLS · 0003 seed├── docs/                     # full documentation set├── Dockerfile                # API deployment image
👥 Roles at a glance
Student	EXCO	Vice President	President	Central Admin
Digital card + QR	✅	✅	✅	✅	✅
Submit suggestions/issues/welfare	✅	✅	✅	✅	✅
Download past questions	✅	✅	✅	✅	✅
Office modules (news/gallery/finance…)	—	✅ by position	✅	✅	✅
Own tasks & reports	—	✅	✅	✅	✅
Assign tasks	—	—	✅	✅	✅
Approve content	—	—	✅	✅	✅
Verify members · analytics	—	—	view	✅	✅
Invite officers · temp passwords	—	—	—	—	✅
Create/switch administrations	—	—	—	—	✅
Audit log · settings	—	—	—	—	✅
Frontend buttons are UX only — every request is re-authorized server-side(RLS + API middleware).

🔐 Security
Passwords: hashed by Supabase Auth; nobody (including Central Admin) can view one
Temporary passwords: one-time, 24h expiry, stored as hashes, invalidated after use
Authorization: enforced in 3 layers — RLS policies, API permission middleware, UI gating
Uploads: MIME allowlist + magic-byte checks + size caps before storage
Rate limiting on auth, registration and public verification endpoints
Public verification returns a fixed whitelist of fields — never private data
Secrets: service-role key lives only in the API environment
📚 Documentation
Full documentation lives in docs/ — architecture, database & ERD,authentication flows, RBAC, API contracts, security model, operations runbooks,and the complete user manual for every role.

🚢 Deployment
Piece	Host	Notes
Web	Vercel	root apps/web, set the 4 VITE_* vars
API	Railway / Render	deploy via Dockerfile, set server-only env vars
Database	Supabase	add the Vercel domain to Auth redirect URLs; enable custom SMTP (e.g. Resend) for invitation emails
📄 License
Built for NAKOSS — Federal University Dutse Chapter.© 2026 NAKOSS Digital. All rights reserved.