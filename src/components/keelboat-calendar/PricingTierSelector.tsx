import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  pricingTierLabels,
  pricingTiers,
  type PricingTier,
} from '@/domains/keelboat-calendar/pricing'

export function PricingTierSelector({
  value,
  onChange,
}: {
  value: PricingTier
  onChange: (value: PricingTier) => void
}) {
  return (
    <div role="group" aria-label="Rate category" className="inline-flex rounded-full bg-muted p-1">
      {pricingTiers.map((tier) => (
        <Button
          key={tier}
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={value === tier}
          className={cn(
            'rounded-full px-4',
            value === tier && 'bg-background text-foreground shadow-sm',
          )}
          onClick={() => onChange(tier)}
        >
          {pricingTierLabels[tier]}
        </Button>
      ))}
    </div>
  )
}
