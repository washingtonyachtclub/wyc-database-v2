import type { RatingFilters } from '@/domains/ratings/filter-types'
import { Button } from '../ui/button'
import { DatePicker } from '../ui/DatePicker'
import { Label } from '../ui/label'
import { MemberCombobox } from '../ui/MemberCombobox'
import { SearchableSelect } from '../ui/SearchableSelect'
import { cn } from '@/lib/utils'

const ALL = '__all__'

export function RatingFilterControls({
  memberWycNumber,
  ratingIndex,
  since,
  until,
  ratingTypes,
  onFilterChange,
  onClearFilters,
}: {
  memberWycNumber?: number
  ratingIndex?: number
  since?: string
  until?: string
  ratingTypes: Array<{ index: number; text: string | null }>
  onFilterChange: (changes: Partial<RatingFilters>) => void
  onClearFilters: () => void
}) {
  const hasFilters =
    memberWycNumber !== undefined ||
    ratingIndex !== undefined ||
    since !== undefined ||
    until !== undefined

  const activeClass = 'bg-primary/10 border-primary'
  const inactiveClass = 'bg-background border-border'

  return (
    <div className="mb-4 p-4 border-2 rounded-lg bg-muted/50">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <MemberCombobox
            label="Member"
            value={memberWycNumber ?? null}
            onChange={(wycNumber) => onFilterChange({ memberWycNumber: wycNumber ?? undefined })}
            placeholder="Filter by member..."
          />
        </div>

        <div>
          <Label className="mb-1">Rating Type</Label>
          <SearchableSelect
            value={ratingIndex !== undefined ? String(ratingIndex) : ALL}
            onValueChange={(value) =>
              onFilterChange({
                ratingIndex: value === ALL ? undefined : Number(value),
              })
            }
            className={cn(
              'min-w-48 border-2',
              ratingIndex !== undefined ? activeClass : inactiveClass,
            )}
            searchPlaceholder="Search rating types..."
            options={[
              { value: ALL, label: 'All Ratings' },
              ...ratingTypes.map((ratingType) => ({
                value: String(ratingType.index),
                label: ratingType.text || `Rating ${ratingType.index}`,
              })),
            ]}
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
