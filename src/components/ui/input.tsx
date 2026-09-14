import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  'data-numeric'?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border border-line-strong bg-canvas px-3 py-2',
          'text-sm text-ink placeholder:text-ink-subtle',
          'focus-visible:outline-none focus-visible:border-brand',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'aria-invalid:border-critical',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
