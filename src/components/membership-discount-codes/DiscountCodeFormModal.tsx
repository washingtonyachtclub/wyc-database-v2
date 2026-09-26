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
  useCreateMembershipDiscountCodeMutation,
  useUpdateMembershipDiscountCodeMutation,
} from '@/domains/membership-discount-codes/query-options'
import type { listMembershipDiscountCodes } from '@/domains/membership-discount-codes/server-fns'
import type { DiscountCodeAudience } from '@/domains/membership-discount-codes/schema'
import { getTodayPacificDateString, pacificDatePlusDays } from '@/lib/date-utils'
import { useState } from 'react'

type MembershipDiscountCode = Awaited<ReturnType<typeof listMembershipDiscountCodes>>[number]
type DiscountType = 'percentage' | 'fixed'

export function DiscountCodeFormModal({
  onClose,
  discountCode,
}: {
  onClose: () => void
  discountCode: MembershipDiscountCode | null
}) {
  const create = useCreateMembershipDiscountCodeMutation()
  const update = useUpdateMembershipDiscountCodeMutation()
  const [name, setName] = useState(discountCode?.name ?? '')
  const [code, setCode] = useState(discountCode?.code ?? '')
  const [audience, setAudience] = useState<DiscountCodeAudience>(
    (discountCode?.audience as DiscountCodeAudience) ?? 'both',
  )
  const [discountType, setDiscountType] = useState<DiscountType>(
    discountCode?.percentageOff !== null ? 'percentage' : 'fixed',
  )
  const [discountValue, setDiscountValue] = useState(
    discountCode
      ? String(discountCode.percentageOff ?? (discountCode.amountOffCents ?? 0) / 100)
      : '20',
  )
  const [startsOn, setStartsOn] = useState(discountCode?.startsOn ?? getTodayPacificDateString())
  const [endsOn, setEndsOn] = useState(discountCode?.endsOn ?? pacificDatePlusDays(30))
  const [maxRedemptions, setMaxRedemptions] = useState(
    discountCode?.maxRedemptions == null ? '' : String(discountCode.maxRedemptions),
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
      if (discountCode) {
        await update.mutateAsync({
          audience,
          discount,
          endsOn,
          index: discountCode.index,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
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
    <Modal onClose={onClose} title={discountCode ? 'Edit Discount Code' : 'New Discount Code'}>
      <form onSubmit={submit} className="space-y-5 p-6">
        <ErrorAlert error={error} action="Save discount code" />

        <div className="space-y-2">
          <Label htmlFor="discount-code-name">Name</Label>
          <Input
            id="discount-code-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount-code-code">Code</Label>
          <Input
            id="discount-code-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={50}
            disabled={discountCode !== null}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Applies to</Label>
          <Select
            value={audience}
            onValueChange={(value) => setAudience(value as DiscountCodeAudience)}
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
            <Label htmlFor="discount-code-value">
              {discountType === 'percentage' ? 'Percent off' : 'Dollars off'}
            </Label>
            <Input
              id="discount-code-value"
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
            <Label htmlFor="discount-code-start">Starts</Label>
            <Input
              id="discount-code-start"
              type="date"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discount-code-end">Ends</Label>
            <Input
              id="discount-code-end"
              type="date"
              value={endsOn}
              onChange={(event) => setEndsOn(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount-code-cap">
            Redemption limit
            {discountCode && discountCode.redemptionCount > 0
              ? ` (minimum ${discountCode.redemptionCount})`
              : ' (optional)'}
          </Label>
          <Input
            id="discount-code-cap"
            type="number"
            min={Math.max(1, discountCode?.redemptionCount ?? 0)}
            step={1}
            value={maxRedemptions}
            onChange={(event) => setMaxRedemptions(event.target.value)}
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
