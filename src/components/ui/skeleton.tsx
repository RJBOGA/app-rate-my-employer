import { cn } from '@/lib/utils'

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-canvas-sunken rounded-md motion-reduce:animate-none',
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  )
}
Skeleton.displayName = 'Skeleton'

export { Skeleton }
