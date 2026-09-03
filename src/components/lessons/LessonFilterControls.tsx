import { useEffect, useState } from 'react'
import {
  EXPIRE_QTR_MODES,
  parseExpireQtrMode,
  type ExpireQtrFilter,
} from '@/domains/members/filter-types'
import type { LessonFilters } from '@/domains/lessons/filter-types'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { MemberCombobox } from '../ui/MemberCombobox'
import { SearchableSelect } from '../ui/SearchableSelect'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { cn } from '@/lib/utils'

const expireQtrModeLabels = {
  exactly: 'Exactly',
  atLeast: 'At least',
} as const

const ALL = '__all__'

export function LessonFilterControls({
  classTypeId,
  instructor,
  expireQtrFilter,
  display,
  search,
  classTypes,
  quarters,
  onFilterChange,
  onClearFilters,
}: {
  classTypeId?: number
  instructor?: number
  expireQtrFilter?: ExpireQtrFilter
  display?: boolean
  search?: string
  classTypes: Array<{ index: number; text: string | null }>
  quarters: Array<{ index: number; text: string | null; school: string | null }>
  onFilterChange: (changes: Partial<LessonFilters>) => void
  onClearFilters: () => void
}) {
  const [searchInput, setSearchInput] = useState(search ?? '')
  useEffect(() => {
    setSearchInput(search ?? '')
  }, [search])

  const hasFilters =
    classTypeId !== undefined ||
    instructor !== undefined ||
    expireQtrFilter ||
    display === true ||
    !!search

  const activeClass = 'bg-primary/10 border-primary'
  const inactiveClass = 'bg-background border-border'

  return (
    <div className="mb-4 p-4 border-2 rounded-lg bg-muted/50">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="mb-1">Type</Label>
          <SearchableSelect
            value={classTypeId !== undefined ? String(classTypeId) : ALL}
            onValueChange={(value) =>
              onFilterChange({
                classTypeId: value === ALL ? undefined : Number(value),
              })
            }
            className={cn(
              'min-w-48 border-2',
              classTypeId !== undefined ? activeClass : inactiveClass,
            )}
            searchPlaceholder="Search lesson types..."
            options={[
              { value: ALL, label: 'All Types' },
              ...classTypes.map((classType) => ({
                value: String(classType.index),
                label: classType.text || `Type ${classType.index}`,
              })),
            ]}
          />
        </div>

        <div>
          <Label className="mb-1">Instructor</Label>
          <MemberCombobox
            value={instructor ?? null}
            onChange={(wycNumber) => onFilterChange({ instructor: wycNumber ?? undefined })}
            placeholder="Any instructor"
          />
        </div>

        <div>
          <Label className="mb-1">Expire Quarter</Label>
          <div className="flex gap-2">
            <QuarterPicker
              value={expireQtrFilter?.quarter ?? null}
              quarters={quarters}
              isActive={!!expireQtrFilter}
              activeClass={activeClass}
              inactiveClass={inactiveClass}
              onChange={(quarter) =>
                onFilterChange({
                  expireQtrFilter:
                    quarter != null
                      ? {
                          quarter,
                          mode: expireQtrFilter?.mode ?? 'exactly',
                        }
                      : undefined,
                })
              }
            />
            {expireQtrFilter && (
              <Select
                value={expireQtrFilter.mode}
                onValueChange={(value) => {
                  const mode = parseExpireQtrMode(value)
                  if (mode) {
                    onFilterChange({
                      expireQtrFilter: { ...expireQtrFilter, mode },
                    })
                  }
                }}
              >
                <SelectTrigger className={cn('border-2', activeClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRE_QTR_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {expireQtrModeLabels[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div>
          <Label className="mb-1">Search</Label>
          <Input
            placeholder="Title or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onFilterChange({ search: searchInput.trim() || undefined })
              }
            }}
            className={cn('border-2 w-48', search ? activeClass : inactiveClass)}
          />
        </div>

        <div className="flex items-center gap-2 pb-1">
          <input
            id="filter-display"
            type="checkbox"
            checked={display === true}
            onChange={(e) => onFilterChange({ display: e.target.checked || undefined })}
            className="h-4 w-4 accent-primary"
          />
          <Label htmlFor="filter-display" className="cursor-pointer">
            Display?
          </Label>
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

function QuarterPicker({
  value,
  quarters,
  isActive,
  activeClass,
  inactiveClass,
  onChange,
}: {
  value: number | null
  quarters: Array<{ index: number; text: string | null; school: string | null }>
  isActive: boolean
  activeClass: string
  inactiveClass: string
  onChange: (quarter: number | null) => void
}) {
  return (
    <SearchableSelect
      value={value == null ? ALL : String(value)}
      onValueChange={(nextValue) => onChange(nextValue === ALL ? null : Number(nextValue))}
      className={cn('min-w-48 border-2', isActive ? activeClass : inactiveClass)}
      searchPlaceholder="Search quarters..."
      options={[
        { value: ALL, label: 'All Quarters' },
        ...quarters.map((quarter) => ({
          value: String(quarter.index),
          label: quarter.school || quarter.text || `Quarter ${quarter.index}`,
        })),
      ]}
    />
  )
}
