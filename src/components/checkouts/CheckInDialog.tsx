import { useState } from 'react'
import type { CheckoutCard as CheckoutCardType } from '@/domains/checkouts/schema'
import { useCheckInMutation } from '@/domains/checkouts/query-options'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
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
            <AlertDialogDescription className="sr-only">Confirm check-in.</AlertDialogDescription>
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
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 px-6 text-base" disabled={checkIn.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              className="h-11 px-6 text-base"
              disabled={checkIn.isPending}
              onClick={() => checkIn.mutate({ data: { index: checkout.index } })}
            >
              {checkIn.isPending ? 'Checking in...' : 'Check In'}
            </Button>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
