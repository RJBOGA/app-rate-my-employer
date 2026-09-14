import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-canvas-subtle">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <p className="font-serif text-lg text-ink">Rate My Desi Employer</p>
            <p className="mt-2 text-sm text-ink-muted">
              Community-written accounts of what it is actually like to work at Desi-owned
              and Desi-focused employers and consultancies.
            </p>
            <p className="mt-3 flex items-start gap-2 text-sm text-privacy">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Reviews are anonymous by default. Your email and phone number are never
                shown publicly.
              </span>
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:gap-x-16">
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Browse</span>
              <Link to="/" className="text-ink-muted hover:text-brand">
                Rankings
              </Link>
              <Link to="/search" className="text-ink-muted hover:text-brand">
                Search employers
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Contribute</span>
              <Link to="/review" className="text-ink-muted hover:text-brand">
                Write a review
              </Link>
              <Link to="/guidelines" className="text-ink-muted hover:text-brand">
                Review guidelines
              </Link>
            </div>
          </nav>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-xs text-ink-subtle">
          Reviews express the personal experiences and opinions of the people who wrote
          them. They are not statements of fact by this site, and they are not verified.
        </p>
      </div>
    </footer>
  )
}
