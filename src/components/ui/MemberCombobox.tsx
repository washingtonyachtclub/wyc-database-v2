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

export type MemberLite = { wycNumber: number; first: string | null; last: string | null }

type MemberComboboxProps = {
  value: number | null
  onChange: (wycNumber: number | null) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  members?: MemberLite[]
  showWycNumbers?: boolean
  exactWycNumberSearch?: boolean
}

export function MemberCombobox({
  value,
  onChange,
  label,
  placeholder = 'Search for a member...',
  disabled = false,
  required = false,
  error,
  members: membersProp,
  showWycNumbers = true,
  exactWycNumberSearch = false,
}: MemberComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: fetched = [] } = useQuery({
    ...getAllMembersLiteQueryOptions(),
    enabled: membersProp === undefined,
  })
  const members = membersProp ?? fetched

  const selectedMember = value != null ? members.find((m) => m.wycNumber === value) : null
  const selectedLabel = selectedMember
    ? `${selectedMember.first ?? ''} ${selectedMember.last ?? ''}`.trim()
    : null

  const MIN_SEARCH_LENGTH = 2
  const MAX_RESULTS = 50

  const trimmedSearch = search.trim()
  const searchTokens = trimmedSearch.toLowerCase().split(/\s+/)
  const isWycNumberSearch = exactWycNumberSearch && /^\d+$/.test(trimmedSearch)
  const filteredMembers =
    trimmedSearch.length < MIN_SEARCH_LENGTH
      ? []
      : members.filter((m) => {
          if (isWycNumberSearch) return String(m.wycNumber) === trimmedSearch
          const fullName = `${m.first ?? ''} ${m.last ?? ''}`.toLowerCase()
          const searchable = exactWycNumberSearch ? fullName : `${fullName} ${m.wycNumber}`
          return searchTokens.every((token) => searchable.includes(token))
        })

  const displayedMembers = filteredMembers.slice(0, MAX_RESULTS)
  const hasMore = filteredMembers.length > MAX_RESULTS

  return (
    <div>
      {label && (
        <Label className="mb-1">
          {label}
          {required && ' *'}
        </Label>
      )}
      <Popover modal open={open} onOpenChange={setOpen}>
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
            <CommandInput
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder={placeholder}
            />
            <CommandList
              className="max-h-60 touch-pan-y overscroll-contain overflow-y-auto"
              onWheel={(event) => event.stopPropagation()}
            >
              {trimmedSearch.length < MIN_SEARCH_LENGTH ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Type at least {MIN_SEARCH_LENGTH} characters to search...
                </div>
              ) : (
                <>
                  <CommandEmpty>No members found.</CommandEmpty>

                  {displayedMembers.map((member) => {
                    const isSelected = member.wycNumber === value
                    const displayName = `${member.first ?? ''} ${member.last ?? ''}`.trim()
                    const displayWycNumber =
                      showWycNumbers ||
                      (isWycNumberSearch && trimmedSearch === String(member.wycNumber))
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
                          {displayName}
                          {displayWycNumber && (
                            <span className="text-muted-foreground"> ({member.wycNumber})</span>
                          )}
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
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
