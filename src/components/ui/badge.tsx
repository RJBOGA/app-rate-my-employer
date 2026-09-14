import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-canvas-sunken text-ink-muted',
        brand: 'bg-brand-subtle text-brand',
        positive: 'bg-positive-subtle text-positive',
        critical: 'bg-critical-subtle text-critical',
        caution: 'bg-caution-subtle text-caution',
        privacy: 'bg-privacy-subtle text-privacy',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
