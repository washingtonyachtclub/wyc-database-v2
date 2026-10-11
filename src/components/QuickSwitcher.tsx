import { useQuery } from '@tanstack/react-query'
import { getMemberSearchIndexQueryOptions } from '@/domains/members/query-options'
import { getCurrentQuarterQueryOptions } from '@/domains/lessons/query-options'
import { canSearchMembers, rankMembers, MAX_MEMBER_SEARCH_RESULTS } from '@/domains/members/search'
import { isMembershipActive } from '@/db/membership-utils'
import { fuzzyScore } from '@/lib/fuzzy-search'
import { useCurrentUser } from '@/lib/auth/auth-query-options'
import { hasRouteAccess, type ProtectedRoute } from '@/lib/permissions'
import { useRouter } from '@tanstack/react-router'
import { ArrowRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { adminItems, peopleManagementItems, supportTableItems, toolsItems } from './Sidebar'
import { Button } from './ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'

type Destination = {
  path: ProtectedRoute
  label: string
}

export function QuickSwitcher() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [shortcut, setShortcut] = useState('Ctrl K')
  const router = useRouter()
  const { user, privileges } = useCurrentUser()
  const canBrowseMembers =
    !!user && hasRouteAccess(user.wycNumber, privileges, '/members/$wycNumber')
  const memberSearch = useQuery({
    ...getMemberSearchIndexQueryOptions(),
    enabled: open && canBrowseMembers,
  })
  const quarter = useQuery({
    ...getCurrentQuarterQueryOptions(),
    enabled: open && canBrowseMembers,
  })
  const matchingMembers = useMemo(
    () => (canBrowseMembers ? rankMembers(memberSearch.data ?? [], search) : []),
    [canBrowseMembers, memberSearch.data, search],
  )
  const displayedMembers = matchingMembers.slice(0, MAX_MEMBER_SEARCH_RESULTS)
  const searchingMembers = canBrowseMembers && canSearchMembers(search)
  const changeOpen = (nextOpen: boolean) => {
    setOpen(nextOpen)
    setSearch('')
  }
  useEffect(() => {
    if (!open) setSearch('')
  }, [open])
  useEffect(() => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    if (isMac) setShortcut('⌘K')
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcutPressed = isMac ? event.metaKey : event.ctrlKey
      if (event.key.toLowerCase() === 'k' && shortcutPressed && !event.altKey && !event.shiftKey) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!user) return null

  const visible = (items: readonly Destination[]) =>
    items.filter((item) => hasRouteAccess(user.wycNumber, privileges, item.path))

  const groups = [
    {
      label: 'General',
      items: [
        { path: `/members/${user.wycNumber}`, label: 'My Profile' },
        { path: '/my-lessons', label: 'My Lessons' },
        { path: '/renew-membership', label: 'Renew Membership' },
        { path: '/door-codes', label: 'Door Codes' },
      ],
    },
    { label: 'Admin', items: visible(adminItems) },
    {
      label: 'Tools',
      items: visible(toolsItems),
    },
    { label: 'People Management', items: visible(peopleManagementItems) },
    { label: 'Support Tables', items: visible(supportTableItems) },
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => fuzzyScore(search, item.label + ' ' + group.label) !== null,
      ),
    }))
    .filter((group) => group.items.length > 0)

  const goTo = (path: string) => {
    changeOpen(false)
    void router.navigate({ to: path })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => changeOpen(true)}
        className="hidden md:flex w-44 justify-between text-muted-foreground font-normal"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search
        </span>
        <kbd className="inline-flex h-5 min-w-6 items-center justify-center rounded-md border border-border/60 bg-muted/70 px-1.5 font-mono text-[10px] font-medium leading-none text-muted-foreground shadow-sm">
          {shortcut}
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Quick switcher</DialogTitle>
          <DialogDescription className="sr-only">
            Search pages and member profiles and press Enter to open a result.
          </DialogDescription>
          <Command shouldFilter={false}>
            <CommandInput
              autoFocus
              className="pr-8"
              value={search}
              onValueChange={setSearch}
              placeholder={
                canBrowseMembers ? 'Search pages or members...' : 'Where do you want to go?'
              }
            />
            <CommandList className="max-h-[min(420px,70vh)] p-1">
              {groups.length === 0 &&
                displayedMembers.length === 0 &&
                !(searchingMembers && (memberSearch.isPending || memberSearch.isError)) && (
                  <CommandEmpty>No results found.</CommandEmpty>
                )}
              {groups.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item.path}
                      value={`${item.label} ${group.label}`}
                      onSelect={() => goTo(item.path)}
                      className="group py-2"
                    >
                      <span className="flex-1">{item.label}</span>
                      <ArrowRight className="opacity-0 group-data-[selected=true]:opacity-50" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              {displayedMembers.length > 0 && (
                <CommandGroup heading="Members">
                  {displayedMembers.map((member) => (
                    <CommandItem
                      key={member.wycNumber}
                      value={`member:${member.wycNumber}`}
                      onSelect={() => goTo(`/members/${member.wycNumber}`)}
                      className="group py-2"
                    >
                      <span className="flex-1">
                        {member.first} {member.last}
                        <span className="ml-2 text-muted-foreground">#{member.wycNumber}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {quarter.data != null
                          ? isMembershipActive(member.expireQtrIndex, quarter.data)
                            ? 'Active'
                            : 'Expired'
                          : quarter.isError
                            ? 'Status unavailable'
                            : '…'}
                      </span>
                      <ArrowRight className="opacity-0 group-data-[selected=true]:opacity-50" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {searchingMembers && memberSearch.isPending && (
                <div role="status" className="px-3 py-3 text-sm text-muted-foreground">
                  Loading members...
                </div>
              )}
              {searchingMembers && memberSearch.isError && (
                <div role="alert" className="px-3 py-3 text-sm text-destructive">
                  Could not load members.
                  <Button variant="ghost" size="sm" onClick={() => void memberSearch.refetch()}>
                    Retry
                  </Button>
                </div>
              )}
              {matchingMembers.length > MAX_MEMBER_SEARCH_RESULTS && (
                <div className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
                  {matchingMembers.length - MAX_MEMBER_SEARCH_RESULTS} more — keep typing to narrow
                  down
                </div>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
