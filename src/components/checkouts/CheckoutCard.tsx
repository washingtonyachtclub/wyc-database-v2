import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { CheckoutDetails } from './CheckoutDetails'

export function CheckoutCard({
  checkout,
  onCheckedIn,
}: {
  checkout: CheckoutCardType
  onCheckedIn?: () => void | Promise<void>
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const queryClient = useQueryClient()
  const checkIn = useCheckInMutation({ invalidateOnSuccess: false })

  const finishCheckIn = async () => {
    if (finishing) return
    setFinishing(true)
    setConfirmOpen(false)
    await queryClient.invalidateQueries({ queryKey: ['checkouts'] })
    await onCheckedIn?.()
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      checkIn.reset()
      setFinishing(false)
      setConfirmOpen(true)
      return
    }
    if (checkIn.isSuccess) {
      void finishCheckIn()
      return
    }
    setConfirmOpen(false)
  }

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <CheckoutDetails checkout={checkout} />

      {checkout.canCheckIn && (
        <div className="mt-4 flex justify-end">
          <Button onClick={() => handleOpenChange(true)} disabled={checkIn.isPending}>
            {checkIn.isPending ? 'Checking in...' : 'Check In'}
          </Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={handleOpenChange}>
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
              <AlertDialogCancel className="h-11 px-6 text-base">Cancel</AlertDialogCancel>
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
    </article>
  )
}
