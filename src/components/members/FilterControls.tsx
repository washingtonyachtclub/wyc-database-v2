import { useEffect, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  EXPIRE_QTR_MODES,
  parseExpireQtrMode,
  type ExpireQtrFilter,
  type MemberFilters,
} from '../../db/member-filter-types'
import { Button } from '../ui/button'
import { Command, CommandItem, CommandList } from '../ui/command'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
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
            className={cn(
              'w-48 border-2',
              name ? activeClass : inactiveClass,
            )}
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
            className={cn(
              'w-32 border-2',
              wycId ? activeClass : inactiveClass,
            )}
          />
        </div>

        <div>
          <Label className="mb-1">Category</Label>
          <Select
            value={category !== undefined ? String(category) : ALL}
            onValueChange={(value) =>
              onFilterChange({
                category: value === ALL ? undefined : Number(value),
              })
            }
          >
            <SelectTrigger
              className={cn(
                'border-2',
                category !== undefined ? activeClass : inactiveClass,
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.index} value={String(cat.index)}>
                  {cat.text || `Category ${cat.index}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  expireQtrFilter: quarter != null
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
                <SelectTrigger
                  className={cn('border-2', activeClass)}
                >
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
  const [open, setOpen] = useState(false)

  const selectedLabel =
    value != null
      ? quarters.find((q) => q.index === value)?.school
        || quarters.find((q) => q.index === value)?.text
        || `Quarter ${value}`
      : 'All Quarters'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-between font-normal border-2',
            isActive ? activeClass : inactiveClass,
          )}
        >
          {selectedLabel}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandList className="max-h-60">
            <CommandItem
              onSelect={() => {
                onChange(null)
                setOpen(false)
              }}
            >
              <Check
                className={cn('h-4 w-4 shrink-0', value == null ? 'opacity-100' : 'opacity-0')}
              />
              All Quarters
            </CommandItem>
            {quarters.map((qtr) => (
              <CommandItem
                key={qtr.index}
                value={String(qtr.index)}
                onSelect={() => {
                  onChange(qtr.index)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn('h-4 w-4 shrink-0', value === qtr.index ? 'opacity-100' : 'opacity-0')}
                />
                {qtr.school || qtr.text || `Quarter ${qtr.index}`}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
