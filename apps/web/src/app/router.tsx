import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardShell } from '@/components/shared/DashboardShell';
import { FullPageLoader, MustChangePasswordGuard, RequireAuth, RequireRole } from './guards';
import PublicLayout from '@/features/public/PublicLayout';
import { ModulePlaceholder, ForbiddenPage } from '@/features/placeholders';
import VerifyPage from '@/features/verify/VerifyPage';
import LoginPage from '@/features/auth/LoginPage';
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/ResetPasswordPage';
import RegisterPage from '@/features/auth/RegisterPage';
import RegistrationSuccessPage from '@/features/auth/RegistrationSuccessPage';
import ChangePasswordPage from '@/features/auth/ChangePasswordPage';
import InviteAcceptPage from '@/features/auth/InviteAcceptPage';

const PublicHome = lazy(() => import('@/features/placeholders').then((m) => ({ default: m.PublicHome })));
const PublicNewsPage = lazy(() => import('@/features/public/PublicNewsPage'));
const PublicNewsDetail = lazy(() => import('@/features/public/PublicNewsDetail'));
const PublicEventsPage = lazy(() => import('@/features/public/PublicEventsPage'));
const PublicProjectsPage = lazy(() => import('@/features/public/PublicProjectsPage'));
const PublicGalleryPage = lazy(() => import('@/features/public/PublicGalleryPage'));

const PresidentDashboard = lazy(() => import('@/features/president/PresidentDashboard'));
const VpDashboard = lazy(() => import('@/features/vp/VpDashboard'));
const ExcoDashboard = lazy(() => import('@/features/exco/ExcoDashboard'));
const ExcoTasks = lazy(() => import('@/features/exco/ExcoTasks'));
const ExcoReports = lazy(() => import('@/features/exco/ExcoReports'));
const ExcoContent = lazy(() => import('@/features/exco/ExcoContent'));
const ExcoGallery = lazy(() => import('@/features/exco/ExcoGallery'));
const ExcoSubmissions = lazy(() => import('@/features/exco/ExcoSubmissions'));
const MemberDashboard = lazy(() => import('@/features/member/MemberDashboard'));
const MemberResources = lazy(() => import('@/features/member/MemberResources'));
const MemberSubmissions = lazy(() => import('@/features/member/MemberSubmissions'));
const AdminDashboard = lazy(() => import('@/features/admin/AdminDashboard'));
const AdminStudents = lazy(() => import('@/features/admin/AdminStudents'));
const AdminExco = lazy(() => import('@/features/admin/AdminExco'));
const AdminAdministrations = lazy(() => import('@/features/admin/AdminAdministrations'));
const AdminAudit = lazy(() => import('@/features/admin/AdminAudit'));

const admin = (el: React.ReactNode) => (
  <RequireRole roles={['central_admin']}><Suspense fallback={<FullPageLoader />}>{el}</Suspense></RequireRole>
);
const excoFamily = (el: React.ReactNode) => (
  <RequireRole roles={['exco', 'president', 'vice_president', 'central_admin']}>
    <Suspense fallback={<FullPageLoader />}>{el}</Suspense>
  </RequireRole>
);
const member = (el: React.ReactNode) => <Suspense fallback={<FullPageLoader />}>{el}</Suspense>;

export const router = createBrowserRouter([
  /* ── PUBLIC WEBSITE ── */
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Suspense fallback={<FullPageLoader />}><PublicHome /></Suspense> },
      { path: '/news', element: <Suspense fallback={<FullPageLoader />}><PublicNewsPage /></Suspense> },
      { path: '/news/:slug', element: <Suspense fallback={<FullPageLoader />}><PublicNewsDetail /></Suspense> },
      { path: '/events', element: <Suspense fallback={<FullPageLoader />}><PublicEventsPage /></Suspense> },
      { path: '/projects', element: <Suspense fallback={<FullPageLoader />}><PublicProjectsPage /></Suspense> },
      { path: '/gallery', element: <Suspense fallback={<FullPageLoader />}><PublicGalleryPage /></Suspense> },
    ],
  },

  /* ── STANDALONE PAGES ── */
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/registration-success', element: <RegistrationSuccessPage /> },
  { path: '/change-password', element: <ChangePasswordPage /> },
  { path: '/invite/:token', element: <InviteAcceptPage /> },
  { path: '/verify/:membershipNumber', element: <VerifyPage /> },

  /* ── AUTHENTICATED APP ── */
  {
    element: (
      <RequireAuth>
        <MustChangePasswordGuard>
          <DashboardShell />
        </MustChangePasswordGuard>
      </RequireAuth>
    ),
    children: [
      { path: '/president', element: <RequireRole roles={['president']}><Suspense fallback={<FullPageLoader />}><PresidentDashboard /></Suspense></RequireRole> },
      { path: '/vp', element: <RequireRole roles={['vice_president']}><Suspense fallback={<FullPageLoader />}><VpDashboard /></Suspense></RequireRole> },
      { path: '/exco', element: excoFamily(<ExcoDashboard />) },
      { path: '/exco/tasks', element: excoFamily(<ExcoTasks />) },
      { path: '/exco/reports', element: excoFamily(<ExcoReports />) },
      { path: '/exco/content', element: excoFamily(<ExcoContent />) },
      { path: '/exco/news', element: excoFamily(<ExcoContent defaultTab="news" />) },
      { path: '/exco/events', element: excoFamily(<ExcoContent defaultTab="events" />) },
      { path: '/exco/gallery', element: excoFamily(<ExcoGallery />) },
      { path: '/exco/submissions', element: excoFamily(<ExcoSubmissions />) },
      { path: '/exco/welfare', element: excoFamily(<ExcoSubmissions defaultType="welfare" />) },
      { path: '/exco/resources', element: member(<MemberResources />) },
      { path: '/exco/:module', element: <ModulePlaceholder /> },
      { path: '/member', element: member(<MemberDashboard />) },
      { path: '/member/resources', element: member(<MemberResources />) },
      { path: '/member/submissions', element: member(<MemberSubmissions />) },
      { path: '/admin', element: admin(<AdminDashboard />) },
      { path: '/admin/students', element: admin(<AdminStudents />) },
      { path: '/admin/exco', element: admin(<AdminExco />) },
      { path: '/admin/administrations', element: admin(<AdminAdministrations />) },
      { path: '/admin/audit', element: admin(<AdminAudit />) },
    ],
  },

  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);