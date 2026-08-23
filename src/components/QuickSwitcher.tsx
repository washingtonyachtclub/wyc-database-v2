import { getIsExemptionApproverQueryOptions } from '@/domains/renewals/query-options'
import { useCurrentUser } from '@/lib/auth/auth-query-options'
import { hasPrivilege, routePermissions } from '@/lib/permissions'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { ArrowRight, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  path: string
  label: string
}

export function QuickSwitcher() {
  const [open, setOpen] = useState(false)
  const [shortcut, setShortcut] = useState('Ctrl K')
  const router = useRouter()
  const { user, privileges } = useCurrentUser()
  const { data: approver } = useQuery({
    ...getIsExemptionApproverQueryOptions(),
    enabled: Boolean(user),
  })

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
    items.filter((item) => {
      const required = routePermissions[item.path as keyof typeof routePermissions]
      return required ? hasPrivilege(privileges, required) : true
    })

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
      items: [
        ...visible(toolsItems),
        ...(approver?.isApprover
          ? [{ path: '/approve-exemptions', label: 'Dues Exemptions' }]
          : []),
      ],
    },
    { label: 'People Management', items: visible(peopleManagementItems) },
    { label: 'Support Tables', items: visible(supportTableItems) },
  ].filter((group) => group.items.length > 0)

  const goTo = (path: string) => {
    setOpen(false)
    void router.navigate({ to: path })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Quick switcher</DialogTitle>
          <DialogDescription className="sr-only">
            Search the database navigation and press Enter to open a page.
          </DialogDescription>
          <Command>
            <CommandInput autoFocus className="pr-8" placeholder="Where do you want to go?" />
            <CommandList className="max-h-[min(420px,70vh)] p-1">
              <CommandEmpty>No pages found.</CommandEmpty>
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
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
