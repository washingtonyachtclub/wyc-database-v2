import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { setDevMemberServerFn, setDevPrivilegesServerFn } from '@/lib/auth/auth-server-fns'
import { useCurrentUser } from '@/lib/auth/auth-query-options'
import type { Privilege } from '../lib/permissions'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { MemberCombobox } from './ui/MemberCombobox'
import { Checkbox } from './ui/checkbox'
import { Button } from './ui/button'
import { Label } from './ui/label'

const ALL_PRIVILEGES: { value: Privilege; label: string }[] = [
  { value: 'db', label: 'db' },
  { value: 'rtgs', label: 'rtgs' },
]

export function DevPrivilegeEmulator() {
  const { user, privileges } = useCurrentUser()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [selected, setSelected] = useState<Privilege[]>(privileges)
  const [memberWycNumber, setMemberWycNumber] = useState<number | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [open, setOpen] = useState(false)

  const toggle = (priv: Privilege) => {
    setSelected((prev) =>
      prev.includes(priv) ? prev.filter((p) => p !== priv) : [...prev, priv],
    )
  }

  const invalidateAndClose = async () => {
    await queryClient.invalidateQueries({ queryKey: ['auth', 'currentUser'] })
    router.invalidate()
    setOpen(false)
  }

  const applyPrivileges = async () => {
    setIsPending(true)
    try {
      await setDevPrivilegesServerFn({ data: { privileges: selected } })
      await invalidateAndClose()
    } finally {
      setIsPending(false)
    }
  }

  const emulateMember = async () => {
    if (memberWycNumber === null) return
    setIsPending(true)
    try {
      const result = await setDevMemberServerFn({ data: { wycNumber: memberWycNumber } })
      setSelected(result.privileges)
      setMemberWycNumber(null)
      await invalidateAndClose()
    } finally {
      setIsPending(false)
    }
  }

  const resetAll = async () => {
    setIsPending(true)
    try {
      const result = await setDevMemberServerFn({ data: { wycNumber: null } })
      setSelected(result.privileges)
      setMemberWycNumber(null)
      await invalidateAndClose()
    } finally {
      setIsPending(false)
    }
  }

  const displayLabel = `${user?.first ?? ''} ${user?.last ?? ''}`.trim() || 'unknown'

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setSelected(privileges) }}>
      <PopoverTrigger asChild>
        <button className="rounded border border-dashed border-yellow-500 bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800 hover:bg-yellow-200">
          Emulate: {displayLabel} [{privileges.join(', ') || 'none'}]
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Emulate Member</p>
            <MemberCombobox
              value={memberWycNumber}
              onChange={setMemberWycNumber}
              placeholder="Search member..."
            />
            <Button
              size="sm"
              onClick={emulateMember}
              disabled={isPending || memberWycNumber === null}
              className="w-full mt-2"
            >
              Impersonate
            </Button>
          </div>

          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-2">Override Privileges</p>
            {ALL_PRIVILEGES.map((priv) => (
              <div key={priv.value} className="flex items-center gap-2">
                <Checkbox
                  id={`priv-${priv.value}`}
                  checked={selected.includes(priv.value)}
                  onCheckedChange={() => toggle(priv.value)}
                />
                <Label htmlFor={`priv-${priv.value}`} className="text-sm font-mono">
                  {priv.label}
                </Label>
              </div>
            ))}
            <Button
              size="sm"
              onClick={applyPrivileges}
              disabled={isPending}
              className="w-full mt-2"
            >
              Apply Privileges
            </Button>
          </div>

          <div className="border-t pt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={resetAll}
              disabled={isPending}
              className="w-full"
            >
              Reset All
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
