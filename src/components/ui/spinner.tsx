import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SpinnerProps extends React.SVGAttributes<SVGElement> {
  label?: string
  className?: string
}

function Spinner({ label = 'Loading', className, ...props }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <Loader2
        className={cn('h-4 w-4 animate-spin text-ink-muted', className)}
        aria-hidden="true"
        {...props}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
Spinner.displayName = 'Spinner'

export { Spinner }
