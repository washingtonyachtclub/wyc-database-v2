import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateRenewalQuarterMutation } from '@/domains/quarters/query-options'
import type { Quarter } from '@/domains/quarters/schema'

export function RenewalQuarterSection({
  current,
  renewal,
  quarters,
}: {
  current: number
  renewal: number
  quarters: Quarter[]
}) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [selection, setSelection] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const mutation = useUpdateRenewalQuarterMutation()
  const choices = quarters
    .filter((q) => q.index === current || q.index === current + 1)
    .sort((a, b) => a.index - b.index)
  const label = (index: number) =>
    quarters.find((q) => q.index === index)?.school || `Quarter ${index}`
  const selected = selection ?? renewal
  const valid = choices.some((q) => q.index === selected)
  const changed = valid && selected !== renewal

  useEffect(() => {
    setConfirming(false)
  }, [current, renewal])

  function save() {
    setConfirming(false)
    mutation.mutate(
      { data: { newQuarter: selected, previousQuarter: renewal } },
      {
        onSuccess: () => setSelection(null),
      },
    )
  }

  return (
    <section
      id="renewal-quarter"
      aria-labelledby="renewal-quarter-heading"
      className="scroll-mt-4 space-y-4 border-t pt-6"
    >
      <h2 id="renewal-quarter-heading" className="text-2xl font-bold">
        Set renewal quarter
      </h2>
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Renewal quarter</p>
        <p className="text-xl font-semibold">{label(renewal)}</p>
      </div>
      <p className="text-sm">
        This is the quarter that new members sign up for and current members expiring this quarter
        or earlier renew to. This can be used to open next quarter sign-ups / renewals early
      </p>
      <div className="flex items-center gap-2">
        <Checkbox
          id="renewal-acknowledge"
          checked={acknowledged}
          disabled={mutation.isPending}
          onCheckedChange={(value) => {
            setAcknowledged(value === true)
            setSelection(null)
            mutation.reset()
          }}
        />
        <Label htmlFor="renewal-acknowledge">I have read the renewal quarter explanation</Label>
      </div>
      {acknowledged && (
        <>
          <div className="space-y-2">
            <Label htmlFor="renewal-choice">Select renewal quarter</Label>
            <Select
              value={valid ? String(selected) : ''}
              disabled={mutation.isPending}
              onValueChange={(value) => {
                setSelection(Number(value))
                mutation.reset()
              }}
            >
              <SelectTrigger id="renewal-choice" className="w-64">
                <SelectValue placeholder="Choose a quarter" />
              </SelectTrigger>
              <SelectContent>
                {choices.map((q) => (
                  <SelectItem key={q.index} value={String(q.index)}>
                    {label(q.index)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!choices.some((q) => q.index === current + 1) && (
              <p className="text-sm text-muted-foreground">
                The next quarter hasn’t been defined.{' '}
                <Link className="underline" to="/quarters">
                  Manage quarters
                </Link>
              </p>
            )}
          </div>
          {changed && (
            <Button
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => setConfirming(true)}
            >
              {mutation.isPending ? 'Saving…' : 'Change renewal quarter'}
            </Button>
          )}
          {mutation.isSuccess && mutation.data.updated && (
            <p role="status" className="text-sm font-medium">
              Renewal quarter set to {label(mutation.variables.data.newQuarter)}.
            </p>
          )}
          {mutation.isSuccess && !mutation.data.updated && (
            <p role="alert" className="text-sm text-destructive">
              The quarter settings changed. Review the current values and try again.
            </p>
          )}
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              Couldn’t save the renewal quarter. Please try again.
            </p>
          )}
        </>
      )}
      <ConfirmDialog
        open={confirming && changed}
        onClose={() => setConfirming(false)}
        onConfirm={save}
        title="Confirm renewal quarter change"
        confirmLabel="Change renewal quarter"
        description={
          <p>
            Change the renewal quarter from <strong>{label(renewal)}</strong> to{' '}
            <strong>{label(selected)}</strong>?
          </p>
        }
        confirmLabels={[
          'I understand this applies to new memberships and renewals.',
          'I want to set the renewal quarter to ' + label(selected) + '.',
        ]}
      />
    </section>
  )
}
