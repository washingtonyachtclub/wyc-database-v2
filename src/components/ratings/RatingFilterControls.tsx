import { useEffect, useState } from 'react'
import type { RatingFilters } from '../../db/rating-filter-types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { cn } from '@/lib/utils'

const ALL = '__all__'

export function RatingFilterControls({
  name,
  ratingIndex,
  ratingTypes,
  onFilterChange,
  onClearFilters,
}: {
  name?: string
  ratingIndex?: number
  ratingTypes: Array<{ index: number; text: string | null }>
  onFilterChange: (changes: Partial<RatingFilters>) => void
  onClearFilters: () => void
}) {
  const [localName, setLocalName] = useState(name || '')

  useEffect(() => {
    setLocalName(name || '')
  }, [name])

  const hasFilters = name || ratingIndex !== undefined

  const handleSearch = () => {
    const trimmed = localName.trim()
    onFilterChange({ name: trimmed || undefined })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleClear = () => {
    setLocalName('')
    onClearFilters()
  }

  const activeClass = 'bg-primary/10 border-primary'
  const inactiveClass = 'bg-background border-border'

  return (
    <div className="mb-4 p-4 border-2 rounded-lg bg-muted/50">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label htmlFor="filter-name" className="mb-1">
            Member Name
          </Label>
          <Input
            id="filter-name"
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name"
            className={cn('w-48 border-2', name ? activeClass : inactiveClass)}
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

        <div>
          <Button onClick={handleSearch}>Search</Button>
        </div>

        {hasFilters && (
          <Button variant="destructive" onClick={handleClear}>
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  )
}
