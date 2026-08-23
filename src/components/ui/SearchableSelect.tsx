import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { useDesktopSelectControl } from '@/hooks/use-desktop-select-control'
import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command'
import { NativeSelect } from './native-select'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export type SearchableSelectOption = {
  value: string
  label: string
  keywords?: string
}

export type SearchableSelectGroup = {
  label: string
  options: SearchableSelectOption[]
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  groups,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search options...',
  emptyMessage = 'No options found.',
  className,
  disabled,
  onBlur,
}: {
  value: string | null
  onValueChange: (value: string) => void
  options?: SearchableSelectOption[]
  groups?: SearchableSelectGroup[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  onBlur?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const desktopControl = useDesktopSelectControl()
  const allOptions = options ?? groups?.flatMap((group) => group.options) ?? []
  const selected = allOptions.find((option) => option.value === value)

  const choose = (nextValue: string) => {
    onValueChange(nextValue)
    setSearch('')
    setOpen(false)
  }

  const renderOption = (option: SearchableSelectOption) => (
    <CommandItem
      key={option.value}
      value={`${option.label} ${option.keywords ?? ''} ${option.value}`}
      onSelect={() => choose(option.value)}
    >
      <Check className={cn('h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
      <span className="truncate">{option.label}</span>
    </CommandItem>
  )

  return desktopControl ? (
    <Popover
      modal
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          onBlur={onBlur}
          className={cn(
            'w-full justify-between font-normal',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0"
        align="start"
        sideOffset={-36}
      >
        <Command>
          <CommandInput
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder={searchPlaceholder}
            className="h-9"
          />
          <CommandList
            className="max-h-64 touch-pan-y overscroll-contain overflow-y-auto"
            onWheel={(event) => event.stopPropagation()}
          >
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {groups
              ? groups.map((group) => (
                  <CommandGroup key={group.label} heading={group.label}>
                    {group.options.map(renderOption)}
                  </CommandGroup>
                ))
              : options?.map(renderOption)}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  ) : (
    <NativeSelect
      value={value ?? ''}
      onChange={(event) => onValueChange(event.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      className={className}
      aria-label={placeholder}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {groups
        ? groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))
        : options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
    </NativeSelect>
  )
}
