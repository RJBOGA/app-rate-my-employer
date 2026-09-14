import { forwardRef } from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

export type LabelProps = React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>

const Label = forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-sm font-medium text-ink leading-none select-none',
      'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
      className,
    )}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }
