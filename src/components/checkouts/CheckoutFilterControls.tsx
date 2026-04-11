import type { CheckoutFilters } from '@/domains/checkouts/filter-types'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { MemberCombobox } from '../ui/MemberCombobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const ALL = '__all__'

const FLEET_OPTIONS = [
  { value: 'SH', label: 'Single-Handed' },
  { value: 'DH', label: 'Double-Handed' },
  { value: 'KB', label: 'Keelboat' },
  { value: 'Cat', label: 'Catamaran' },
]

export function CheckoutFilterControls({
  boatId,
  fleet,
  memberWycNumber,
  since,
  until,
  boatTypes,
  onFilterChange,
  onClearFilters,
}: {
  boatId?: number
  fleet?: string
  memberWycNumber?: number
  since?: string
  until?: string
  boatTypes: Array<{ index: number; type: string | null; fleet: string }>
  onFilterChange: (changes: Partial<CheckoutFilters>) => void
  onClearFilters: () => void
}) {
  const hasFilters =
    boatId !== undefined ||
    fleet !== undefined ||
    memberWycNumber !== undefined ||
    since !== undefined ||
    until !== undefined

  const activeClass = 'bg-primary/10 border-primary'
  const inactiveClass = 'bg-background border-border'

  return (
    <div className="mb-4 p-4 border-2 rounded-lg bg-muted/50">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="mb-1">Boat</Label>
          <Select
            value={boatId !== undefined ? String(boatId) : ALL}
            onValueChange={(value) =>
              onFilterChange({ boatId: value === ALL ? undefined : Number(value) })
            }
          >
            <SelectTrigger
              className={cn('border-2 w-48', boatId !== undefined ? activeClass : inactiveClass)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Boats</SelectItem>
              {boatTypes.map((bt) => (
                <SelectItem key={bt.index} value={String(bt.index)}>
                  {bt.type || `Boat ${bt.index}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1">Fleet</Label>
          <Select
            value={fleet ?? ALL}
            onValueChange={(value) => onFilterChange({ fleet: value === ALL ? undefined : value })}
          >
            <SelectTrigger
              className={cn('border-2 w-40', fleet !== undefined ? activeClass : inactiveClass)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Fleets</SelectItem>
              {FLEET_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-64">
          <MemberCombobox
            label="Member"
            value={memberWycNumber ?? null}
            onChange={(wycNumber) => onFilterChange({ memberWycNumber: wycNumber ?? undefined })}
            placeholder="Filter by member..."
          />
        </div>

        <div>
          <Label className="mb-1">From</Label>
          <Input
            type="date"
            className={cn('border-2 w-40', since ? activeClass : inactiveClass)}
            value={since ?? ''}
            onChange={(e) => onFilterChange({ since: e.target.value || undefined })}
          />
        </div>

        <div>
          <Label className="mb-1">Until</Label>
          <Input
            type="date"
            className={cn('border-2 w-40', until ? activeClass : inactiveClass)}
            value={until ?? ''}
            onChange={(e) => onFilterChange({ until: e.target.value || undefined })}
          />
        </div>

        {hasFilters && (
          <Button variant="destructive" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  )
}
