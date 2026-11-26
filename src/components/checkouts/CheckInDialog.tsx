import { useState } from 'react'
import type { CheckoutCard as CheckoutCardType } from '@/domains/checkouts/schema'
import { useCheckInMutation } from '@/domains/checkouts/query-options'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTodayPacificDateString } from '@/lib/date-utils'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function CheckInDialog({
  checkout,
  onClose,
  onCheckedIn,
}: {
  checkout: CheckoutCardType
  onClose: () => void
  onCheckedIn?: () => void | Promise<void>
}) {
  const [finishing, setFinishing] = useState(false)
  const [editingReturnTime, setEditingReturnTime] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const checkIn = useCheckInMutation()

  const finishCheckIn = async () => {
    if (finishing) return
    setFinishing(true)
    await onCheckedIn?.()
    onClose()
  }

  const handleOpenChange = (open: boolean) => {
    if (open || checkIn.isPending || finishing) return
    if (checkIn.isSuccess) {
      void finishCheckIn()
      return
    }
    onClose()
  }

  return (
    <AlertDialog open onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-[calc(100%_-_2rem)] rounded-lg p-5 sm:max-w-xl sm:p-8">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">
            {checkIn.isSuccess
              ? `${checkout.boatName || 'Boat'} checked in`
              : `Check in the ${checkout.boatName || 'boat'}?`}
          </AlertDialogTitle>
          {checkIn.isSuccess && (
            <AlertDialogDescription className="text-base">
              Submit a damage report if anything needs attention.
            </AlertDialogDescription>
          )}
          {!checkIn.isSuccess && (
            <AlertDialogDescription className="sr-only">
              Choose the actual return time and confirm check-in.
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <ErrorAlert error={checkIn.error?.message} action="Checking in boat" />
        {checkIn.isSuccess ? (
          <AlertDialogFooter className="gap-2">
            <Button asChild variant="outline" className="h-11 px-6 text-base">
              <a
                href="https://damage.washingtonyachtclub.org"
                target="_blank"
                rel="noreferrer"
                onClick={() => void finishCheckIn()}
              >
                Submit Damage Report
              </a>
            </Button>
            <Button
              className="h-11 px-6 text-base"
              disabled={finishing}
              onClick={() => void finishCheckIn()}
            >
              Done
            </Button>
          </AlertDialogFooter>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (checkIn.isPending) return
              checkIn.mutate({
                data: {
                  index: checkout.index,
                  actualReturn: editingReturnTime ? `${date}T${time}` : undefined,
                },
              })
            }}
          >
            <div className="space-y-2 rounded-lg border bg-muted/40 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Return time</p>
                  <p className="font-semibold" hidden={editingReturnTime}>
                    Now
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={checkIn.isPending}
                  aria-expanded={editingReturnTime}
                  aria-controls="check-in-return-fields"
                  onClick={() => {
                    if (!editingReturnTime && !date) setDate(getTodayPacificDateString())
                    setEditingReturnTime(!editingReturnTime)
                    checkIn.reset()
                  }}
                >
                  {editingReturnTime ? 'Use now' : 'Change'}
                </Button>
              </div>
              <fieldset
                id="check-in-return-fields"
                hidden={!editingReturnTime}
                disabled={!editingReturnTime || checkIn.isPending}
              >
                <div className="grid gap-3 min-[400px]:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="check-in-date">Return date</Label>
                    <Input
                      id="check-in-date"
                      className="bg-background"
                      type="date"
                      required
                      value={date}
                      min={checkout.timeDeparture.slice(0, 10)}
                      max={getTodayPacificDateString()}
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="check-in-time">Time</Label>
                    <Input
                      id="check-in-time"
                      className="bg-background"
                      type="time"
                      required
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                    />
                  </div>
                </div>
              </fieldset>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                type="button"
                className="h-11 px-6 text-base"
                disabled={checkIn.isPending}
              >
                Cancel
              </AlertDialogCancel>
              <Button type="submit" className="h-11 px-6 text-base" disabled={checkIn.isPending}>
                {checkIn.isPending ? 'Checking in...' : 'Check In'}
              </Button>
            </AlertDialogFooter>
          </form>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
