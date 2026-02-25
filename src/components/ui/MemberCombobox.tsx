'use client'

import { Command } from 'cmdk'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAllMembersLiteQueryOptions } from '../../lib/members-query-options'
import { cn } from '../../lib/utils'

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
      {label && (
        <label className="block text-sm font-medium mb-1">{label}</label>
      )}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 border rounded text-sm',
              'bg-background hover:bg-accent transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              !selectedLabel && 'text-muted-foreground',
            )}
          >
            <span className="truncate">
              {selectedLabel ?? placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="z-50 w-[var(--radix-popover-trigger-width)] rounded-md border bg-background shadow-md outline-none"
            sideOffset={4}
            align="start"
          >
            <Command shouldFilter={false}>
              <div className="border-b px-3 py-2">
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder={placeholder}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Command.List className="max-h-60 overflow-y-auto p-1">
                {trimmedSearch.length < MIN_SEARCH_LENGTH ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Type at least {MIN_SEARCH_LENGTH} characters to search...
                  </div>
                ) : (
                  <>
                    <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                      No members found.
                    </Command.Empty>

                    {displayedMembers.map((member) => {
                      const isSelected = member.wycNumber === value
                      const displayName = `${member.first} ${member.last}`.trim()
                      return (
                        <Command.Item
                          key={member.wycNumber}
                          value={String(member.wycNumber)}
                          onSelect={() => {
                            onChange(member.wycNumber)
                            setSearch('')
                            setOpen(false)
                          }}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer',
                            'hover:bg-accent hover:text-foreground',
                            'data-[selected=true]:bg-accent data-[selected=true]:text-foreground',
                          )}
                        >
                          <Check
                            className={cn(
                              'h-4 w-4 shrink-0',
                              isSelected ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <span>
                            {displayName}{' '}
                            <span className="text-muted-foreground">
                              ({member.wycNumber})
                            </span>
                          </span>
                        </Command.Item>
                      )
                    })}

                    {hasMore && (
                      <div className="px-2 py-2 text-xs text-muted-foreground text-center border-t mt-1">
                        {filteredMembers.length - MAX_RESULTS} more — keep typing to narrow down
                      </div>
                    )}
                  </>
                )}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
