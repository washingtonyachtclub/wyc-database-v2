import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMembershipPromotionQuoteMutation } from '@/domains/membership-promotions/query-options'
import type { PromotionAudience, PromotionQuote } from '@/domains/membership-promotions/schema'
import type { RenewalDuration, RenewalTier } from '@/domains/renewals/compute-renewal'
import { useEffect, useRef, useState } from 'react'

function formatMoney(cents: number, currency: string) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency })
}

export function PromotionCodeField({
  audience,
  disabled,
  duration,
  onApplied,
  tier,
}: {
  audience: Exclude<PromotionAudience, 'both'>
  disabled?: boolean
  duration: RenewalDuration
  onApplied: (promotion: PromotionQuote | null) => void
  tier: RenewalTier | null
}) {
  const quote = useMembershipPromotionQuoteMutation()
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<PromotionQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const onAppliedRef = useRef(onApplied)

  useEffect(() => {
    onAppliedRef.current = onApplied
  }, [onApplied])

  useEffect(() => {
    setApplied(null)
    setCode('')
    setError(null)
    onAppliedRef.current(null)
  }, [audience, duration, tier])

  async function apply() {
    if (!tier || !code.trim()) return
    setError(null)
    try {
      const result = await quote.mutateAsync({ audience, code, duration, tier })
      setApplied(result)
      setCode(result.code)
      onApplied(result)
    } catch (caught: any) {
      setApplied(null)
      onApplied(null)
      setError(caught?.message ?? 'Could not apply the discount code.')
    }
  }

  function remove() {
    setApplied(null)
    setCode('')
    setError(null)
    onApplied(null)
  }

  return (
    <div className="space-y-3">
      <Label htmlFor={`${audience}-promotion-code`}>Discount code</Label>
      <div className="flex gap-2">
        <Input
          id={`${audience}-promotion-code`}
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase())
            if (applied) {
              setApplied(null)
              onApplied(null)
            }
            setError(null)
          }}
          disabled={disabled || quote.isPending || tier === null}
          maxLength={50}
        />
        <Button
          type="button"
          variant="outline"
          onClick={apply}
          disabled={disabled || quote.isPending || tier === null || !code.trim()}
        >
          {quote.isPending ? 'Applying…' : 'Apply'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {applied && (
        <div className="flex items-start justify-between gap-4 rounded-md border bg-muted p-3 text-sm">
          <div>
            <p className="font-medium">{applied.name}</p>
            <p className="text-muted-foreground">
              {formatMoney(applied.discountCents, applied.currency)} discount · Total{' '}
              {formatMoney(applied.finalCents, applied.currency)}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={remove}>
            Remove
          </Button>
        </div>
      )}
    </div>
  )
}
