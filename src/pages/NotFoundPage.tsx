import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-16 text-center">
      <p className="eyebrow mb-4">404</p>
      <h1 className="display-lg text-ink">Page not found</h1>
      <p className="mt-4 max-w-sm text-base text-ink-muted">
        The page you are looking for does not exist or may have been moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/"
          className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-medium text-canvas hover:bg-brand-hover"
        >
          Go home
        </Link>
        <Link
          to="/search"
          className="inline-flex h-10 items-center rounded-md border border-line-strong bg-canvas px-4 text-sm font-medium text-ink hover:bg-canvas-subtle"
        >
          Search employers
        </Link>
      </div>
    </div>
  )
}
