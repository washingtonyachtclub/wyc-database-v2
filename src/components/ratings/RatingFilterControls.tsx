import type { RatingFilters } from '@/domains/ratings/filter-types'
import { Button } from '../ui/button'
import { DatePicker } from '../ui/DatePicker'
import { Label } from '../ui/label'
import { MemberCombobox } from '../ui/MemberCombobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
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
          <Select
            value={ratingIndex !== undefined ? String(ratingIndex) : ALL}
            onValueChange={(value) =>
              onFilterChange({
                ratingIndex: value === ALL ? undefined : Number(value),
              })
            }
          >
            <SelectTrigger
              className={cn('border-2', ratingIndex !== undefined ? activeClass : inactiveClass)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Ratings</SelectItem>
              {ratingTypes.map((rt) => (
                <SelectItem key={rt.index} value={String(rt.index)}>
                  {rt.text || `Rating ${rt.index}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
