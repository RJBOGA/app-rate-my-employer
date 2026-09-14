import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'

export function AppLayout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  // Route changes must reset scroll and announce the new page, otherwise
  // a keyboard or screen-reader user stays parked wherever they were.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <a
        href="#main"
        className="sr-only-focusable absolute top-2 left-2 z-50 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
