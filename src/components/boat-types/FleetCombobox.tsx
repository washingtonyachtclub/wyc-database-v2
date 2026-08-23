import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type FleetComboboxProps = {
  value: string
  onChange: (value: string) => void
  existingFleets: string[]
  label?: string
  triggerClassName?: string
}

export function FleetCombobox({
  value,
  onChange,
  existingFleets,
  label,
  triggerClassName,
}: FleetComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const trimmedSearch = search.trim()
  const normalizedSearch = trimmedSearch.toLowerCase()
  const filtered = normalizedSearch
    ? existingFleets.filter((fleet) => fleet.toLowerCase().includes(normalizedSearch))
    : existingFleets
  const showCreateOption =
    normalizedSearch.length > 0 &&
    !existingFleets.some((fleet) => fleet.toLowerCase() === normalizedSearch)

  return (
    <div>
      {label && <Label className="mb-1">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            aria-label={label ?? 'Fleet'}
            className={cn(
              'w-full justify-between font-normal',
              !value && 'text-muted-foreground',
              triggerClassName,
            )}
          >
            <span className="truncate">{value || 'Select or type a new fleet...'}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search or type new..."
            />
            <CommandList className="max-h-60">
              <CommandEmpty>No matching fleets.</CommandEmpty>

              {filtered.map((fleet) => (
                <CommandItem
                  key={fleet}
                  value={fleet}
                  onSelect={() => {
                    onChange(fleet)
                    setSearch('')
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      value === fleet ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {fleet}
                </CommandItem>
              ))}

              {showCreateOption && (
                <CommandItem
                  value={`__create__${trimmedSearch}`}
                  onSelect={() => {
                    onChange(trimmedSearch)
                    setSearch('')
                    setOpen(false)
                  }}
                >
                  Create &quot;{trimmedSearch}&quot;
                </CommandItem>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
