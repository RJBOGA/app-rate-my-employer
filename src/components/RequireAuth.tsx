import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageSpinner } from '@/components/States'

/**
 * Route guard.
 *
 * This is a convenience, not a security control: every protected action
 * is independently enforced by RLS and by require_admin() inside the
 * database. Hiding a route only saves the user a pointless round trip.
 */
export function RequireAuth() {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <PageSpinner label="Checking your session" />

  if (!user) {
    // Preserve where they were headed so sign-in can return them.
    return <Navigate to="/sign-in" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function RequireStaff() {
  const { user, isStaff, initializing, profileLoading } = useAuth()
  const location = useLocation()

  if (initializing || profileLoading) return <PageSpinner label="Checking permissions" />

  if (!user) return <Navigate to="/sign-in" replace state={{ from: location }} />
  if (!isStaff) return <Navigate to="/" replace />

  return <Outlet />
}
