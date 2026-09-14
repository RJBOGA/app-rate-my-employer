import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type FieldProps = React.HTMLAttributes<HTMLDivElement>

const Field = forwardRef<HTMLDivElement, FieldProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-1.5', className)} {...props} />
  ),
)
Field.displayName = 'Field'

export type FieldLabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

const FieldLabel = forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-sm font-medium text-ink', className)}
      {...props}
    />
  ),
)
FieldLabel.displayName = 'FieldLabel'

export type FieldDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>

const FieldDescription = forwardRef<HTMLParagraphElement, FieldDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-ink-muted', className)} {...props} />
  ),
)
FieldDescription.displayName = 'FieldDescription'

export type FieldErrorProps = React.HTMLAttributes<HTMLParagraphElement>

const FieldError = forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, children, ...props }, ref) => {
    if (!children) return null
    return (
      <p
        ref={ref}
        role="alert"
        className={cn('text-sm text-critical', className)}
        {...props}
      >
        {children}
      </p>
    )
  },
)
FieldError.displayName = 'FieldError'

export { Field, FieldLabel, FieldDescription, FieldError }
