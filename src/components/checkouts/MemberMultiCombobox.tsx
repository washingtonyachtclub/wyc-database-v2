import { X } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MemberCombobox, type MemberLite } from '@/components/ui/MemberCombobox'

type MemberMultiComboboxProps = {
  value: number[]
  onChange: (value: number[]) => void
  members: MemberLite[]
  exclude?: number[]
  searchAllMembers?: (query: string) => Promise<MemberLite[]>
  onSelectMember?: (member: MemberLite) => void
  error?: string
  showWycNumbers?: boolean
}

export function MemberMultiCombobox({
  value,
  onChange,
  members,
  exclude = [],
  searchAllMembers,
  onSelectMember,
  error,
  showWycNumbers = true,
}: MemberMultiComboboxProps) {
  const unavailable = useMemo(() => new Set([...value, ...exclude]), [exclude, value])
  const availableMembers = useMemo(
    () => members.filter((member) => !unavailable.has(member.wycNumber)),
    [members, unavailable],
  )

  return (
    <div>
      <Label className="mb-1">Crew</Label>
      <MemberCombobox
        value={null}
        onChange={(wycNumber) => {
          if (wycNumber && !unavailable.has(wycNumber)) onChange([...value, wycNumber])
        }}
        members={availableMembers}
        searchAllMembers={searchAllMembers}
        onSelectMember={onSelectMember}
        placeholder="Add a crew member..."
        showWycNumbers={showWycNumbers}
        exactWycNumberSearch={!showWycNumbers}
      />
      {value.length > 0 && (
        <div className="mt-2 space-y-2">
          {value.map((wycNumber) => {
            const member = members.find((candidate) => candidate.wycNumber === wycNumber)
            const name = member ? `${member.first ?? ''} ${member.last ?? ''}`.trim() : ''
            return (
              <div
                key={wycNumber}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  {name || 'Unknown member'}
                  {showWycNumbers && <span className="text-muted-foreground"> ({wycNumber})</span>}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${name || `member ${wycNumber}`}`}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(value.filter((id) => id !== wycNumber))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
