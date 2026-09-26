import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/Modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateMembershipPromotionMutation,
  useUpdateMembershipPromotionMutation,
} from '@/domains/membership-promotions/query-options'
import type { listMembershipPromotions } from '@/domains/membership-promotions/server-fns'
import type { PromotionAudience } from '@/domains/membership-promotions/schema'
import { getTodayPacificDateString, pacificDatePlusDays } from '@/lib/date-utils'
import { useState } from 'react'

type MembershipPromotion = Awaited<ReturnType<typeof listMembershipPromotions>>[number]
type DiscountType = 'percentage' | 'fixed'

export function PromotionFormModal({
  onClose,
  promotion,
}: {
  onClose: () => void
  promotion: MembershipPromotion | null
}) {
  const create = useCreateMembershipPromotionMutation()
  const update = useUpdateMembershipPromotionMutation()
  const [name, setName] = useState(promotion?.name ?? '')
  const [code, setCode] = useState(promotion?.code ?? '')
  const [audience, setAudience] = useState<PromotionAudience>(
    (promotion?.audience as PromotionAudience) ?? 'both',
  )
  const [discountType, setDiscountType] = useState<DiscountType>(
    promotion?.percentageOff !== null ? 'percentage' : 'fixed',
  )
  const [discountValue, setDiscountValue] = useState(
    promotion ? String(promotion.percentageOff ?? (promotion.amountOffCents ?? 0) / 100) : '20',
  )
  const [startsOn, setStartsOn] = useState(promotion?.startsOn ?? getTodayPacificDateString())
  const [endsOn, setEndsOn] = useState(promotion?.endsOn ?? pacificDatePlusDays(30))
  const [maxRedemptions, setMaxRedemptions] = useState(
    promotion?.maxRedemptions == null ? '' : String(promotion.maxRedemptions),
  )
  const [error, setError] = useState<string | null>(null)
  const busy = create.isPending || update.isPending

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const numericValue = Number(discountValue)
    const discount =
      discountType === 'percentage'
        ? { type: 'percentage' as const, percentage: numericValue }
        : { type: 'fixed' as const, amountCents: Math.round(numericValue * 100) }
    try {
      if (promotion) {
        await update.mutateAsync({
          audience,
          discount,
          endsOn,
          index: promotion.index,
          name,
          startsOn,
        })
      } else {
        await create.mutateAsync({
          audience,
          code,
          discount,
          endsOn,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
          name,
          startsOn,
        })
      }
      onClose()
    } catch (caught: any) {
      setError(caught?.message ?? 'Could not save the discount code.')
    }
  }

  return (
    <Modal onClose={onClose} title={promotion ? 'Edit Discount Code' : 'New Discount Code'}>
      <form onSubmit={submit} className="space-y-5 p-6">
        <ErrorAlert error={error} action="Save discount code" />

        <div className="space-y-2">
          <Label htmlFor="promotion-name">Name</Label>
          <Input
            id="promotion-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="promotion-code">Code</Label>
          <Input
            id="promotion-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={50}
            disabled={promotion !== null}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Applies to</Label>
          <Select
            value={audience}
            onValueChange={(value) => setAudience(value as PromotionAudience)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">New members and renewals</SelectItem>
              <SelectItem value="new_members">New members</SelectItem>
              <SelectItem value="renewals">Renewals</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Discount type</Label>
            <Select
              value={discountType}
              onValueChange={(value) => setDiscountType(value as DiscountType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="promotion-value">
              {discountType === 'percentage' ? 'Percent off' : 'Dollars off'}
            </Label>
            <Input
              id="promotion-value"
              type="number"
              min={discountType === 'percentage' ? 1 : 0.01}
              max={discountType === 'percentage' ? 99 : undefined}
              step={discountType === 'percentage' ? 1 : 0.01}
              value={discountValue}
              onChange={(event) => setDiscountValue(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="promotion-start">Starts</Label>
            <Input
              id="promotion-start"
              type="date"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promotion-end">Ends</Label>
            <Input
              id="promotion-end"
              type="date"
              value={endsOn}
              onChange={(event) => setEndsOn(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="promotion-cap">Redemption limit (optional)</Label>
          <Input
            id="promotion-cap"
            type="number"
            min={1}
            step={1}
            value={maxRedemptions}
            onChange={(event) => setMaxRedemptions(event.target.value)}
            disabled={promotion !== null}
          />
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save Discount Code'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
