import { useEffect, useState } from 'react'
import {
  EXPIRE_QTR_MODES,
  parseExpireQtrMode,
  type ExpireQtrFilter,
  type MemberFilters,
} from '@/domains/members/filter-types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { SearchableSelect } from '../ui/SearchableSelect'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { cn } from '@/lib/utils'

const expireQtrModeLabels = {
  exactly: 'Exactly',
  atLeast: 'At least',
} as const

const ALL = '__all__'

export function FilterControls({
  wycId,
  name,
  category,
  expireQtrFilter,
  categories,
  quarters,
  onFilterChange,
  onClearFilters,
}: {
  wycId?: string
  name?: string
  category?: number
  expireQtrFilter?: ExpireQtrFilter
  categories: Array<{ index: number; text: string | null }>
  quarters: Array<{ index: number; text: string | null; school: string | null }>
  onFilterChange: (changes: Partial<MemberFilters>) => void
  onClearFilters: () => void
}) {
  const [localName, setLocalName] = useState(name || '')
  const [localWycId, setLocalWycId] = useState(wycId || '')

  useEffect(() => {
    setLocalName(name || '')
    setLocalWycId(wycId || '')
  }, [name, wycId])

  const hasFilters = wycId || name || category !== undefined || expireQtrFilter

  const handleSearch = () => {
    const trimmedWycId = localWycId.trim()
    const trimmedName = localName.trim()
    onFilterChange({
      wycId: trimmedWycId || undefined,
      name: trimmedName || undefined,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleClear = () => {
    setLocalName('')
    setLocalWycId('')
    onClearFilters()
  }

  const activeClass = 'bg-primary/10 border-primary'
  const inactiveClass = 'bg-background border-border'

  return (
    <div className="mb-4 p-4 border-2 rounded-lg bg-muted/50">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label htmlFor="filter-name" className="mb-1">
            Name
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
          <Label htmlFor="filter-wyc-id" className="mb-1">
            WYC ID
          </Label>
          <Input
            id="filter-wyc-id"
            type="text"
            inputMode="numeric"
            value={localWycId}
            onChange={(e) => setLocalWycId(e.target.value.replace(/\D/g, ''))}
            onKeyDown={handleKeyDown}
            placeholder="Search by WYC ID"
            className={cn('w-32 border-2', wycId ? activeClass : inactiveClass)}
          />
        </div>

        <div>
          <Label className="mb-1">Category</Label>
          <SearchableSelect
            value={category !== undefined ? String(category) : ALL}
            onValueChange={(value) =>
              onFilterChange({
                category: value === ALL ? undefined : Number(value),
              })
            }
            className={cn(
              'min-w-48 border-2',
              category !== undefined ? activeClass : inactiveClass,
            )}
            searchPlaceholder="Search categories..."
            options={[
              { value: ALL, label: 'All Categories' },
              ...categories.map((categoryOption) => ({
                value: String(categoryOption.index),
                label: categoryOption.text || `Category ${categoryOption.index}`,
              })),
            ]}
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
