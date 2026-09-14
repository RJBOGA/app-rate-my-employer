import { NavLink, Outlet } from 'react-router-dom'
import { useReportCounts } from '@/hooks/useAdmin'
import { cn } from '@/lib/utils'

function NavBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span
      className="ml-1.5 inline-flex items-center rounded-full bg-critical px-1.5 py-0.5 text-xs font-semibold text-canvas"
      aria-label={`${count} open`}
    >
      {count}
    </span>
  )
}

export function AdminLayout() {
  const { data: counts } = useReportCounts()
  const openCount = counts?.open ?? 0

  const navLinks = [
    { to: 'reports', label: 'Reports', badge: openCount },
    { to: 'employers', label: 'Employers', badge: 0 },
    { to: 'users', label: 'Users', badge: 0 },
    { to: 'audit', label: 'Audit Log', badge: 0 },
  ] as const

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="display-lg text-ink">Moderation</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Every action taken in this area is recorded in the audit log and cannot be erased
        through the application.
      </p>

      <nav
        className="mt-6 flex gap-1 border-b border-line"
        aria-label="Moderation sections"
      >
        {navLinks.map(({ to, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center px-3 pb-3 text-sm font-medium transition-colors duration-100',
                isActive
                  ? 'border-b-2 border-brand text-ink'
                  : 'border-b-2 border-transparent text-ink-muted hover:text-ink',
              )
            }
          >
            {label}
            {badge > 0 && <NavBadge count={badge} />}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  )
}
