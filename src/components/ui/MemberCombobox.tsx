'use client'

import { Check, ChevronsUpDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAllMembersLiteQueryOptions } from '@/domains/members/query-options'
import { useDesktopSelectControl } from '@/hooks/use-desktop-select-control'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './command'
import { Input } from './input'
import { Label } from './label'
import { Modal } from './Modal'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export type MemberLite = { wycNumber: number; first: string | null; last: string | null }

type MemberComboboxProps = {
  value: number | null
  onChange: (wycNumber: number | null) => void
  onSelectMember?: (member: MemberLite) => void
  searchAllMembers?: (query: string) => Promise<MemberLite[]>
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  members?: MemberLite[]
  showWycNumbers?: boolean
  exactWycNumberSearch?: boolean
}

const MIN_SEARCH_LENGTH = 2
const MAX_RESULTS = 50

export function MemberCombobox({
  value,
  onChange,
  onSelectMember,
  searchAllMembers,
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [searchingAllMembers, setSearchingAllMembers] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)
  const desktopControl = useDesktopSelectControl()

  const { data: fetched = [] } = useQuery({
    ...getAllMembersLiteQueryOptions(),
    enabled: membersProp === undefined,
  })
  const members = membersProp ?? fetched

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [search])

  const trimmedSearch = search.trim()
  const selectedMember = value != null ? members.find((member) => member.wycNumber === value) : null
  const selectedLabel = selectedMember
    ? `${selectedMember.first ?? ''} ${selectedMember.last ?? ''}`.trim()
    : null
  const searchTokens = trimmedSearch.toLowerCase().split(/\s+/)
  const isWycNumberSearch = exactWycNumberSearch && /^\d+$/.test(trimmedSearch)
  const localMatches =
    trimmedSearch.length < MIN_SEARCH_LENGTH
      ? []
      : members.filter((member) => {
          if (isWycNumberSearch) return String(member.wycNumber) === trimmedSearch
          const fullName = `${member.first ?? ''} ${member.last ?? ''}`.toLowerCase()
          const searchable = exactWycNumberSearch ? fullName : `${fullName} ${member.wycNumber}`
          return searchTokens.every((token) => searchable.includes(token))
        })
  const remoteSearchEnabled =
    searchAllMembers !== undefined &&
    debouncedSearch.length >= MIN_SEARCH_LENGTH &&
    debouncedSearch === trimmedSearch &&
    (searchingAllMembers || localMatches.length === 0) &&
    (open || mobileSearchOpen)
  const {
    data: remoteMembers = [],
    isFetching: remoteSearchFetching,
    isError: remoteSearchFailed,
  } = useQuery({
    queryKey: ['checkout-member-search', debouncedSearch],
    queryFn: () => searchAllMembers!(debouncedSearch),
    enabled: remoteSearchEnabled,
    staleTime: 60_000,
  })
  const currentRemoteMembers = remoteSearchEnabled ? remoteMembers : []
  const matchingMembers = useMemo(() => {
    const seen = new Set<number>()
    return [...localMatches, ...currentRemoteMembers].filter((member) => {
      if (seen.has(member.wycNumber)) return false
      seen.add(member.wycNumber)
      return true
    })
  }, [currentRemoteMembers, localMatches])
  const displayedMembers = matchingMembers.slice(0, MAX_RESULTS)
  const hasMore = matchingMembers.length > MAX_RESULTS
  const waitingForRemoteSearch =
    searchAllMembers !== undefined &&
    trimmedSearch.length >= MIN_SEARCH_LENGTH &&
    (debouncedSearch !== trimmedSearch || (remoteSearchEnabled && remoteSearchFetching))

  const chooseMember = (member: MemberLite) => {
    onSelectMember?.(member)
    onChange(member.wycNumber)
    setSearch('')
    setSearchingAllMembers(false)
    setOpen(false)
    setMobileSearchOpen(false)
  }

  const memberResult = (member: MemberLite) => {
    const isSelected = member.wycNumber === value
    const displayName = `${member.first ?? ''} ${member.last ?? ''}`.trim()
    const displayWycNumber =
      showWycNumbers || (isWycNumberSearch && trimmedSearch === String(member.wycNumber))
    return (
      <CommandItem
        key={member.wycNumber}
        value={String(member.wycNumber)}
        onSelect={() => chooseMember(member)}
        className={cn(
          !desktopControl &&
            'min-h-12 rounded-md border bg-background px-3 py-3 text-base shadow-sm',
        )}
      >
        <Check className={cn('h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
        <span>
          {displayName}
          {displayWycNumber && <span className="text-muted-foreground"> ({member.wycNumber})</span>}
        </span>
      </CommandItem>
    )
  }

  const resultList = (
    <>
      {displayedMembers.length === 0 && !waitingForRemoteSearch && !remoteSearchFailed && (
        <CommandEmpty>No members found.</CommandEmpty>
      )}
      {displayedMembers.map(memberResult)}
      {waitingForRemoteSearch && (
        <div className="px-3 py-3 text-center text-sm text-muted-foreground">
          Searching all members...
        </div>
      )}
      {remoteSearchFailed && (
        <div className="px-3 py-3 text-center text-sm text-destructive">
          Could not search all members.
        </div>
      )}
      {searchAllMembers &&
        trimmedSearch.length >= MIN_SEARCH_LENGTH &&
        localMatches.length > 0 &&
        !searchingAllMembers && (
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full justify-center rounded-none border-t text-sm"
            onClick={() => setSearchingAllMembers(true)}
          >
            Search all members
          </Button>
        )}
      {hasMore && (
        <div className="mt-1 border-t px-2 py-2 text-center text-xs text-muted-foreground">
          {matchingMembers.length - MAX_RESULTS} more — keep typing to narrow down
        </div>
      )}
    </>
  )

  return (
    <div>
      {label && (
        <Label className="mb-1">
          {label}
          {required && ' *'}
        </Label>
      )}

      {desktopControl ? (
        <Popover
          modal
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen)
            if (!nextOpen) {
              setSearch('')
              setSearchingAllMembers(false)
            }
          }}
        >
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
                  resultList
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <>
          <Button
            variant="outline"
            type="button"
            disabled={disabled}
            className={cn(
              'h-11 w-full justify-between font-normal',
              !selectedLabel && 'text-muted-foreground',
            )}
            onClick={() => setMobileSearchOpen(true)}
          >
            <span className="truncate">{selectedLabel ?? placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
          {mobileSearchOpen && (
            <Modal
              title="Search members"
              contentClassName="h-[min(32rem,calc(100dvh-2rem))] max-w-[calc(100%-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-5 duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none sm:max-w-md"
              overlayClassName="duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none"
              onOpenAutoFocus={(event) => {
                event.preventDefault()
                mobileSearchInputRef.current?.focus({ preventScroll: true })
              }}
              onCloseAutoFocus={(event) => event.preventDefault()}
              onClose={() => {
                setMobileSearchOpen(false)
                setSearch('')
                setSearchingAllMembers(false)
              }}
            >
              <div className="flex min-h-0 flex-col gap-3">
                <Input
                  ref={mobileSearchInputRef}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name or WYC number"
                  className="h-11 shrink-0 text-base"
                />
                <Command shouldFilter={false} className="min-h-0 flex-1 border">
                  <CommandList className="max-h-none flex-1 touch-pan-y space-y-2 overscroll-contain overflow-y-auto p-2">
                    {trimmedSearch.length < MIN_SEARCH_LENGTH ? (
                      <div className="py-8 text-center text-base text-muted-foreground">
                        Type at least {MIN_SEARCH_LENGTH} characters to search...
                      </div>
                    ) : (
                      resultList
                    )}
                  </CommandList>
                </Command>
              </div>
            </Modal>
          )}
        </>
      )}

      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
