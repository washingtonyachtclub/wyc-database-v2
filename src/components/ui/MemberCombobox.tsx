'use client'

import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAllMembersLiteQueryOptions } from '@/domains/members/query-options'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './command'
import { Label } from './label'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

type MemberComboboxProps = {
  value: number | null
  onChange: (wycNumber: number | null) => void
  label?: string
  placeholder?: string
  disabled?: boolean
}

export function MemberCombobox({
  value,
  onChange,
  label,
  placeholder = 'Search for a member...',
  disabled = false,
}: MemberComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: members = [] } = useQuery(getAllMembersLiteQueryOptions())

  const selectedMember = value != null ? members.find((m) => m.wycNumber === value) : null
  const selectedLabel = selectedMember
    ? `${selectedMember.first} ${selectedMember.last}`.trim()
    : null

  const MIN_SEARCH_LENGTH = 2
  const MAX_RESULTS = 50

  const trimmedSearch = search.trim()
  const filteredMembers =
    trimmedSearch.length < MIN_SEARCH_LENGTH
      ? []
      : members.filter((m) => {
          const full = `${m.first} ${m.last} ${m.wycNumber}`.toLowerCase()
          return full.includes(trimmedSearch.toLowerCase())
        })

  const displayedMembers = filteredMembers.slice(0, MAX_RESULTS)
  const hasMore = filteredMembers.length > MAX_RESULTS

  return (
    <div>
      {label && <Label className="mb-1">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !selectedLabel && 'text-muted-foreground',
            )}
          >
            <span className="truncate">{selectedLabel ?? placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={search} onValueChange={setSearch} placeholder={placeholder} />
            <CommandList className="max-h-60">
              {trimmedSearch.length < MIN_SEARCH_LENGTH ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Type at least {MIN_SEARCH_LENGTH} characters to search...
                </div>
              ) : (
                <>
                  <CommandEmpty>No members found.</CommandEmpty>

                  {displayedMembers.map((member) => {
                    const isSelected = member.wycNumber === value
                    const displayName = `${member.first} ${member.last}`.trim()
                    return (
                      <CommandItem
                        key={member.wycNumber}
                        value={String(member.wycNumber)}
                        onSelect={() => {
                          onChange(member.wycNumber)
                          setSearch('')
                          setOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isSelected ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span>
                          {displayName}{' '}
                          <span className="text-muted-foreground">({member.wycNumber})</span>
                        </span>
                      </CommandItem>
                    )
                  })}

                  {hasMore && (
                    <div className="px-2 py-2 text-xs text-muted-foreground text-center border-t mt-1">
                      {filteredMembers.length - MAX_RESULTS} more — keep typing to narrow down
                    </div>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
