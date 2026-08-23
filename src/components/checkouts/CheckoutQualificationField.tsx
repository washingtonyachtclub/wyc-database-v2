import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { GroupedSelect } from '@/components/ui/GroupedSelect'
import { Label } from '@/components/ui/label'
import { MemberCombobox, type MemberLite } from '@/components/ui/MemberCombobox'
import type { CheckoutQualification } from '@/domains/checkouts/schema'
import { cn } from '@/lib/utils'

type QualificationMode = 'supervised' | 'unsupervised' | null

type CheckoutQualificationFieldProps = {
  value: CheckoutQualification
  onChange: (value: CheckoutQualification) => void
  ratings: { index: number; text: string; type: string }[]
  members: MemberLite[]
  excludeSupervisor?: number[]
  searchAllMembers?: (query: string) => Promise<MemberLite[]>
  onSelectMember?: (member: MemberLite) => void
  error?: string
  showWycNumbers?: boolean
}

function initialMode(value: CheckoutQualification): QualificationMode {
  if (value.supervised) return 'supervised'
  return value.relevantRatingId > 0 ? 'unsupervised' : null
}

export function CheckoutQualificationField({
  value,
  onChange,
  ratings,
  members,
  excludeSupervisor = [],
  searchAllMembers,
  onSelectMember,
  error,
  showWycNumbers = true,
}: CheckoutQualificationFieldProps) {
  const [mode, setMode] = useState<QualificationMode>(() => initialMode(value))
  const supervisorMembers = useMemo(
    () => members.filter((member) => !excludeSupervisor.includes(member.wycNumber)),
    [excludeSupervisor, members],
  )
  const ratingGroups = Object.values(
    ratings.reduce<Record<string, { label: string; options: { value: number; label: string }[] }>>(
      (groups, rating) => {
        groups[rating.type] ??= { label: rating.type || '<No Type>', options: [] }
        groups[rating.type].options.push({ value: rating.index, label: rating.text })
        return groups
      },
      {},
    ),
  )

  const selectMode = (nextMode: Exclude<QualificationMode, null>) => {
    if (mode === nextMode) return
    setMode(nextMode)
    onChange(
      nextMode === 'supervised'
        ? { supervised: true, supervisorWycNumber: 0 }
        : { supervised: false, relevantRatingId: 0 },
    )
  }

  const displayedError = mode === null && error ? 'Choose a checkout type' : error

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Checkout type">
        <div
          className={cn(
            'relative rounded-lg border p-4 transition-colors',
            mode === 'supervised' ? 'border-primary bg-primary/5' : 'bg-muted/40',
          )}
        >
          {mode !== 'supervised' && (
            <Button
              type="button"
              variant="ghost"
              aria-label="Select supervised checkout"
              className="absolute inset-0 z-10 h-full w-full rounded-lg bg-transparent hover:bg-primary/5"
              onClick={() => selectMode('supervised')}
            />
          )}
          <Button
            type="button"
            variant="ghost"
            role="radio"
            aria-checked={mode === 'supervised'}
            className="h-auto w-full justify-start gap-3 px-0 py-0 text-base hover:bg-transparent"
            onClick={() => selectMode('supervised')}
          >
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full border-2',
                mode === 'supervised' ? 'border-primary' : 'border-muted-foreground',
              )}
            >
              {mode === 'supervised' && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
            </span>
            Supervised checkout
          </Button>

          <div className={cn('mt-4', mode !== 'supervised' && 'opacity-40')}>
            <MemberCombobox
              label="Supervisor name"
              disabled={mode !== 'supervised'}
              value={value.supervised ? value.supervisorWycNumber || null : null}
              onChange={(supervisorWycNumber) =>
                onChange({ supervised: true, supervisorWycNumber: supervisorWycNumber ?? 0 })
              }
              members={supervisorMembers}
              searchAllMembers={searchAllMembers}
              onSelectMember={onSelectMember}
              placeholder="Select a member"
              showWycNumbers={showWycNumbers}
              exactWycNumberSearch={!showWycNumbers}
            />
          </div>
        </div>

        <div
          className={cn(
            'relative rounded-lg border p-4 transition-colors',
            mode === 'unsupervised' ? 'border-primary bg-primary/5' : 'bg-muted/40',
          )}
        >
          {mode !== 'unsupervised' && (
            <Button
              type="button"
              variant="ghost"
              aria-label="Select unsupervised checkout"
              className="absolute inset-0 z-10 h-full w-full rounded-lg bg-transparent hover:bg-primary/5"
              onClick={() => selectMode('unsupervised')}
            />
          )}
          <Button
            type="button"
            variant="ghost"
            role="radio"
            aria-checked={mode === 'unsupervised'}
            className="h-auto w-full justify-start gap-3 px-0 py-0 text-base hover:bg-transparent"
            onClick={() => selectMode('unsupervised')}
          >
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full border-2',
                mode === 'unsupervised' ? 'border-primary' : 'border-muted-foreground',
              )}
            >
              {mode === 'unsupervised' && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
            </span>
            Unsupervised checkout
          </Button>

          <div className={cn('mt-4', mode !== 'unsupervised' && 'opacity-40')}>
            <Label className="mb-1">Relevant rating *</Label>
            <GroupedSelect
              disabled={mode !== 'unsupervised'}
              value={
                !value.supervised && value.relevantRatingId > 0 ? value.relevantRatingId : null
              }
              onValueChange={(rating) =>
                onChange({ supervised: false, relevantRatingId: rating ?? 0 })
              }
              groups={ratingGroups}
              triggerClassName="bg-background"
            />
          </div>
        </div>
      </div>

      {displayedError && <p className="text-sm text-destructive">{displayedError}</p>}
    </div>
  )
}
