import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex w-full min-h-[120px] rounded-md border border-line-strong bg-canvas px-3 py-2',
          'text-sm text-ink placeholder:text-ink-subtle',
          'resize-y',
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
Textarea.displayName = 'Textarea'

export { Textarea }
