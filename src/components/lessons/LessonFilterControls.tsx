import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  EXPIRE_QTR_MODES,
  parseExpireQtrMode,
  type ExpireQtrFilter,
} from '@/domains/members/filter-types'
import type { LessonFilters } from '@/domains/lessons/filter-types'
import { Button } from '../ui/button'
import { Command, CommandItem, CommandList } from '../ui/command'
import { Label } from '../ui/label'
import { MemberCombobox } from '../ui/MemberCombobox'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
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
  classTypes,
  quarters,
  onFilterChange,
  onClearFilters,
}: {
  classTypeId?: number
  instructor?: number
  expireQtrFilter?: ExpireQtrFilter
  display?: boolean
  classTypes: Array<{ index: number; text: string | null }>
  quarters: Array<{ index: number; text: string | null; school: string | null }>
  onFilterChange: (changes: Partial<LessonFilters>) => void
  onClearFilters: () => void
}) {
  const hasFilters =
    classTypeId !== undefined || instructor !== undefined || expireQtrFilter || display === true

  const activeClass = 'bg-primary/10 border-primary'
  const inactiveClass = 'bg-background border-border'

  return (
    <div className="mb-4 p-4 border-2 rounded-lg bg-muted/50">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="mb-1">Type</Label>
          <Select
            value={classTypeId !== undefined ? String(classTypeId) : ALL}
            onValueChange={(value) =>
              onFilterChange({
                classTypeId: value === ALL ? undefined : Number(value),
              })
            }
          >
            <SelectTrigger
              className={cn('border-2', classTypeId !== undefined ? activeClass : inactiveClass)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Types</SelectItem>
              {classTypes.map((ct) => (
                <SelectItem key={ct.index} value={String(ct.index)}>
                  {ct.text || `Type ${ct.index}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1">Instructor</Label>
          <MemberCombobox
            value={instructor ?? null}
            onChange={(wycNumber) =>
              onFilterChange({ instructor: wycNumber ?? undefined })
            }
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

        <div className="flex items-center gap-2 pb-1">
          <input
            id="filter-display"
            type="checkbox"
            checked={display === true}
            onChange={(e) => onFilterChange({ display: e.target.checked || undefined })}
            className="h-4 w-4 accent-primary"
          />
          <Label htmlFor="filter-display" className="cursor-pointer">Display?</Label>
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
  const [open, setOpen] = useState(false)

  const selectedLabel =
    value != null
      ? quarters.find((q) => q.index === value)?.school ||
        quarters.find((q) => q.index === value)?.text ||
        `Quarter ${value}`
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
                  className={cn(
                    'h-4 w-4 shrink-0',
                    value === qtr.index ? 'opacity-100' : 'opacity-0',
                  )}
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
