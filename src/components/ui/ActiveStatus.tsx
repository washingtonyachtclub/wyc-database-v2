import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ActiveStatusProps = {
  active: boolean
}

export function activeStatusRowClassName(active: boolean) {
  return active ? undefined : 'bg-destructive/5 hover:bg-destructive/10'
}

export function ActiveStatus({ active }: ActiveStatusProps) {
  return active ? (
    <span className="text-sm">Active</span>
  ) : (
    <span className="text-sm text-muted-foreground">Inactive</span>
  )
}

type ActiveStatusButtonProps = ActiveStatusProps & {
  disabled?: boolean
  onClick: () => void
  className?: string
}

export function ActiveStatusButton({
  active,
  disabled,
  onClick,
  className,
}: ActiveStatusButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? 'outline' : 'default'}
      size="sm"
      disabled={disabled}
      className={cn(
        'w-32',
        active &&
          'border-yellow-300 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:text-yellow-800',
        className,
      )}
      onClick={onClick}
    >
      {active ? 'Mark Inactive' : 'Mark Active'}
    </Button>
  )
}
