import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth, RequireStaff } from '@/components/RequireAuth'
import { PageSpinner } from '@/components/States'

import { HomePage } from '@/pages/HomePage'
import { SearchPage } from '@/pages/SearchPage'
import { EmployerProfilePage } from '@/pages/EmployerProfilePage'
import { GuidelinesPage } from '@/pages/GuidelinesPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { SignInPage } from '@/pages/auth/SignInPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { UpdatePasswordPage } from '@/pages/auth/UpdatePasswordPage'

import { WriteReviewStartPage } from '@/pages/WriteReviewStartPage'
import { WriteReviewPage } from '@/pages/WriteReviewPage'
import { DashboardPage } from '@/pages/account/DashboardPage'
import { AccountPage } from '@/pages/account/AccountPage'
import { MyReviewsPage } from '@/pages/account/MyReviewsPage'
import { EmploymentPage } from '@/pages/account/EmploymentPage'

// The admin area is a separate bundle: most visitors never load it.
const AdminLayout = lazy(() =>
  import('@/pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const AdminReportsPage = lazy(() =>
  import('@/pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })),
)
const AdminEmployersPage = lazy(() =>
  import('@/pages/admin/AdminEmployersPage').then((m) => ({ default: m.AdminEmployersPage })),
)
const AdminUsersPage = lazy(() =>
  import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
)
const AdminAuditPage = lazy(() =>
  import('@/pages/admin/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage })),
)

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* ---- Public. No account required to browse or read. ---- */}
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="employers/:employerId" element={<EmployerProfilePage />} />
        <Route path="guidelines" element={<GuidelinesPage />} />

        {/* ---- Auth ---- */}
        <Route path="sign-in" element={<SignInPage />} />
        <Route path="sign-up" element={<SignUpPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="update-password" element={<UpdatePasswordPage />} />

        {/* ---- Requires an account ---- */}
        <Route element={<RequireAuth />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="review" element={<WriteReviewStartPage />} />
          <Route path="employers/:employerId/review" element={<WriteReviewPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="account/reviews" element={<MyReviewsPage />} />
          <Route path="account/employment" element={<EmploymentPage />} />
        </Route>

        {/* ---- Moderation ---- */}
        <Route element={<RequireStaff />}>
          <Route
            path="admin"
            element={
              <Suspense fallback={<PageSpinner label="Loading moderation tools" />}>
                <AdminLayout />
              </Suspense>
            }
          >
            <Route index element={<Navigate to="reports" replace />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="employers" element={<AdminEmployersPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="audit" element={<AdminAuditPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
