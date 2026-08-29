import type { CheckoutFilters } from '@/domains/checkouts/filter-types'
import { boatTypeGroups, fleetOptions } from '@/domains/boat-types/order'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { DatePicker } from '../ui/DatePicker'
import { Label } from '../ui/label'
import { MemberCombobox } from '../ui/MemberCombobox'
import { SearchableSelect } from '../ui/SearchableSelect'

const ALL = '__all__'

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
  boatTypes: Array<{
    index: number
    type: string | null
    fleet: string
    active: number
  }>
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
  const boatGroups = boatTypeGroups(boatTypes, true).map((group) => ({
    label: group.label,
    options: group.options.map((option) => ({
      value: String(option.value),
      label: option.label,
    })),
  }))
  const fleets = fleetOptions(boatTypes)

  return (
    <div className="mb-4 p-4 border-2 rounded-lg bg-muted/50">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-48">
          <Label className="mb-1 block">Boat</Label>
          <SearchableSelect
            value={boatId !== undefined ? String(boatId) : ALL}
            onValueChange={(value) =>
              onFilterChange({ boatId: value === ALL ? undefined : Number(value) })
            }
            className={cn('border-2', boatId !== undefined ? activeClass : inactiveClass)}
            searchPlaceholder="Search boats..."
            options={[{ value: ALL, label: 'All Boats' }]}
            groups={boatGroups}
          />
        </div>

        <div className="w-40">
          <Label className="mb-1 block">Fleet</Label>
          <SearchableSelect
            value={fleet ?? ALL}
            onValueChange={(value) => onFilterChange({ fleet: value === ALL ? undefined : value })}
            className={cn('border-2', fleet !== undefined ? activeClass : inactiveClass)}
            searchPlaceholder="Search fleets..."
            options={[{ value: ALL, label: 'All Fleets' }, ...fleets]}
          />
        </div>

        <div className="w-64">
          <MemberCombobox
            label="Member"
            value={memberWycNumber ?? null}
            onChange={(wycNumber) => onFilterChange({ memberWycNumber: wycNumber ?? undefined })}
            placeholder="Filter by member..."
          />
        </div>

        <DatePicker
          label="From"
          value={since}
          onChange={(value) => onFilterChange({ since: value })}
          className={cn('border-2 w-40', since ? activeClass : inactiveClass)}
        />

        <DatePicker
          label="Until"
          value={until}
          onChange={(value) => onFilterChange({ until: value })}
          className={cn('border-2 w-40', until ? activeClass : inactiveClass)}
        />

        {hasFilters && (
          <Button variant="destructive" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  )
}
