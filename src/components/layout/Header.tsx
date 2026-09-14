import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Menu, PenLine, Shield, User as UserIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmployerCombobox } from '@/components/EmployerCombobox'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { initialsFrom } from '@/lib/format'

/**
 * Translucent chrome: content scrolls underneath rather than being
 * pushed out of a fixed opaque strip. Falls back to solid automatically
 * under prefers-reduced-transparency (see index.css).
 */
export function Header() {
  const navigate = useNavigate()
  const { user, profile, isStaff, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="chrome-blur sticky top-0 z-40 border-b border-line">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="shrink-0 font-serif text-lg leading-none text-ink hover:text-brand sm:text-xl"
        >
          Rate My Desi Employer
        </Link>

        {/* Search lives in the chrome: looking an employer up is the
            primary job on every page, not just the homepage. */}
        <div className="ml-auto hidden max-w-sm flex-1 md:block">
          <EmployerCombobox
            placeholder="Search employers…"
            onSelect={(employer) => navigate(`/employers/${employer.id}`)}
          />
        </div>

        <nav className="ml-auto hidden items-center gap-1 md:ml-0 md:flex">
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/review">
                  <PenLine className="size-4" aria-hidden="true" />
                  Write a review
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Account menu">
                    <span className="flex size-7 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand">
                      {initialsFrom(profile?.display_name ?? user.email)}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">
                    {profile?.display_name ?? 'Your account'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <LayoutDashboard className="size-4" aria-hidden="true" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account">
                      <UserIcon className="size-4" aria-hidden="true" />
                      Profile &amp; privacy
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/reviews">
                      <PenLine className="size-4" aria-hidden="true" />
                      Your reviews
                    </Link>
                  </DropdownMenuItem>
                  {isStaff && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin">
                          <Shield className="size-4" aria-hidden="true" />
                          Moderation
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      void signOut().then(() => navigate('/'))
                    }}
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button variant="primary" size="sm" asChild>
                <Link to="/sign-up">Create account</Link>
              </Button>
            </>
          )}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Mobile panel */}
      <div
        className={cn(
          'overflow-hidden border-t border-line md:hidden',
          mobileOpen ? 'block' : 'hidden',
        )}
      >
        <div className="space-y-3 px-4 py-4">
          <EmployerCombobox
            placeholder="Search employers…"
            onSelect={(employer) => {
              setMobileOpen(false)
              navigate(`/employers/${employer.id}`)
            }}
          />

          <div className="flex flex-col gap-1">
            {user ? (
              <>
                <MobileLink to="/review" onClick={() => setMobileOpen(false)}>
                  Write a review
                </MobileLink>
                <MobileLink to="/dashboard" onClick={() => setMobileOpen(false)}>
                  Dashboard
                </MobileLink>
                <MobileLink to="/account" onClick={() => setMobileOpen(false)}>
                  Profile &amp; privacy
                </MobileLink>
                <MobileLink to="/account/reviews" onClick={() => setMobileOpen(false)}>
                  Your reviews
                </MobileLink>
                {isStaff && (
                  <MobileLink to="/admin" onClick={() => setMobileOpen(false)}>
                    Moderation
                  </MobileLink>
                )}
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-canvas-subtle"
                  onClick={() => {
                    setMobileOpen(false)
                    void signOut().then(() => navigate('/'))
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <MobileLink to="/sign-in" onClick={() => setMobileOpen(false)}>
                  Sign in
                </MobileLink>
                <MobileLink to="/sign-up" onClick={() => setMobileOpen(false)}>
                  Create account
                </MobileLink>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function MobileLink({
  to,
  children,
  onClick,
}: {
  to: string
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="rounded-md px-3 py-2 text-sm text-ink hover:bg-canvas-subtle"
    >
      {children}
    </Link>
  )
}
