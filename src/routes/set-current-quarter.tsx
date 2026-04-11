import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getCurrentQuarterQueryOptions } from '@/domains/lessons/query-options'
import {
  getQuarterChangeImpactQueryOptions,
  getQuartersQueryOptions,
  useUpdateCurrentQuarterMutation,
} from '@/domains/quarters/query-options'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { requirePrivilegeForRoute } from '../lib/route-guards'

export const Route = createFileRoute('/set-current-quarter')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/set-current-quarter')
  },
  component: SetCurrentQuarterPage,
})

function SetCurrentQuarterPage() {
  const { data: currentQuarterIndex } = useQuery(getCurrentQuarterQueryOptions())
  const { data: allQuarters } = useQuery(getQuartersQueryOptions())

  const [readAbove, setReadAbove] = useState(false)
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const effectiveSelection = selectedQuarter ?? currentQuarterIndex ?? 0

  const currentQuarter = useMemo(
    () => allQuarters?.find((q) => q.index === currentQuarterIndex),
    [allQuarters, currentQuarterIndex],
  )

  const selectedQuarterObj = useMemo(
    () => allQuarters?.find((q) => q.index === effectiveSelection),
    [allQuarters, effectiveSelection],
  )

  // Filter dropdown to current-1 through latest available
  const selectableQuarters = useMemo(() => {
    if (!allQuarters || !currentQuarterIndex) return []
    return allQuarters.filter((q) => q.index >= currentQuarterIndex - 1)
  }, [allQuarters, currentQuarterIndex])

  const hasChange = currentQuarterIndex != null && effectiveSelection !== currentQuarterIndex

  const { data: impact } = useQuery({
    ...getQuarterChangeImpactQueryOptions(effectiveSelection),
    enabled: hasChange,
  })

  const mutation = useUpdateCurrentQuarterMutation()

  const handleConfirm = () => {
    setConfirmOpen(false)
    mutation.mutate(
      { data: { newQuarter: effectiveSelection } },
      {
        onSuccess: (result) => {
          const oldText =
            allQuarters?.find((q) => q.index === result.previousQuarter)?.school ??
            `Quarter ${result.previousQuarter}`
          const newText =
            allQuarters?.find((q) => q.index === result.newQuarter)?.school ??
            `Quarter ${result.newQuarter}`
          setSuccessMessage(`Quarter changed from ${oldText} to ${newText}.`)
          setSelectedQuarter(null)
        },
      },
    )
  }

  if (!currentQuarterIndex || !allQuarters) {
    return <div className="p-6 text-muted-foreground">Loading...</div>
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Set Current Quarter</h1>

      {/* Current quarter display */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Current Quarter</p>
        <p className="text-xl font-semibold">
          {currentQuarter?.school ?? `Quarter ${currentQuarterIndex}`}
        </p>
        {currentQuarter?.endDate && (
          <p className="text-sm text-muted-foreground">Ends: {currentQuarter.endDate}</p>
        )}
      </div>

      {/* Warning box */}
      <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-4 space-y-2 text-sm text-yellow-900">
        <p className="font-semibold">Changing the current quarter affects the entire system:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Membership status</strong> — Members are active when their expiration quarter{' '}
            &ge; the current quarter. Changing this determines who is considered active vs expired.
          </li>
          <li>
            <strong>Lesson visibility</strong> — The public lesson page only shows lessons matching
            the current quarter. Previous quarter lessons will no longer appear on the website.
          </li>
          <li>
            <strong>Instructor privileges</strong> — Instructors teaching current-quarter lessons
            receive the ratings privilege. Changing the quarter may revoke or grant this access.
          </li>
        </ul>
        <p className="pt-1 font-medium">
          Only change this when a new quarter is starting and other officers are aware.
        </p>
      </div>

      {/* Gate: must acknowledge before proceeding */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="read-above"
          checked={readAbove}
          onCheckedChange={(checked) => setReadAbove(checked === true)}
        />
        <Label htmlFor="read-above" className="cursor-pointer">
          I have read the above
        </Label>
      </div>

      {readAbove && (
        <>
          {/* Quarter selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select new quarter</label>
            <Select
              value={String(effectiveSelection)}
              onValueChange={(value) => {
                setSelectedQuarter(Number(value))
                setSuccessMessage(null)
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectableQuarters.map((q) => (
                  <SelectItem key={q.index} value={String(q.index)}>
                    {q.school || q.text || `Quarter ${q.index}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Impact preview */}
          {hasChange && impact && (
            <div
              className={cn(
                'rounded-lg border p-4 space-y-1 text-sm',
                impact.direction === 'backward'
                  ? 'border-orange-400 bg-orange-50 text-orange-900'
                  : 'border-blue-400 bg-blue-50 text-blue-900',
              )}
            >
              {impact.direction === 'forward' ? (
                <>
                  <p className="font-semibold">
                    Impact of advancing to {selectedQuarterObj?.school}:
                  </p>
                  <p>
                    {impact.membersAffected} member{impact.membersAffected !== 1 ? 's' : ''} will
                    become expired.
                  </p>
                  <p>
                    {impact.lessonsAffected} lesson{impact.lessonsAffected !== 1 ? 's' : ''} will be
                    hidden from the public page.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Going backward is unusual.</p>
                  <p>
                    {impact.membersAffected} member{impact.membersAffected !== 1 ? 's' : ''} will
                    become re-activated.
                  </p>
                  <p>
                    {impact.lessonsAffected} lesson{impact.lessonsAffected !== 1 ? 's' : ''} will
                    become visible again.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Change button */}
          {hasChange && (
            <Button
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Changing...' : 'Change Quarter'}
            </Button>
          )}

          {/* Success message */}
          {successMessage && (
            <div className="rounded-lg border border-green-400 bg-green-50 p-4 text-sm text-green-900">
              {successMessage}
            </div>
          )}

          {/* Error message */}
          {mutation.isError && (
            <div className="rounded-lg border border-red-400 bg-red-50 p-4 text-sm text-red-900">
              Failed to update the current quarter. Please try again.
            </div>
          )}
        </>
      )}

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Quarter Change"
        confirmLabel="Change Quarter"
        confirmLabels={['I understand', 'I actually really definitely understand']}
        description={
          <div className="space-y-2">
            <p>
              You are changing the current quarter from{' '}
              <strong>{currentQuarter?.school ?? `Quarter ${currentQuarterIndex}`}</strong> to{' '}
              <strong>{selectedQuarterObj?.school ?? `Quarter ${effectiveSelection}`}</strong>.
            </p>
            {impact && impact.direction === 'forward' && (
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  {impact.membersAffected} member{impact.membersAffected !== 1 ? 's' : ''} will
                  become expired.
                </li>
                <li>
                  {impact.lessonsAffected} lesson{impact.lessonsAffected !== 1 ? 's' : ''} will be
                  hidden from the public page.
                </li>
              </ul>
            )}
            {impact && impact.direction === 'backward' && (
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  {impact.membersAffected} member{impact.membersAffected !== 1 ? 's' : ''} will
                  become re-activated.
                </li>
                <li>
                  {impact.lessonsAffected} lesson{impact.lessonsAffected !== 1 ? 's' : ''} will
                  become visible again.
                </li>
              </ul>
            )}
          </div>
        }
      />
    </div>
  )
}
