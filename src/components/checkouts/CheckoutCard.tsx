import { useState } from 'react'
import type { CheckoutCard as CheckoutCardType } from '@/domains/checkouts/schema'
import { useCheckInMutation } from '@/domains/checkouts/query-options'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
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
  const checkIn = useCheckInMutation({ onSuccess: onCheckedIn })

  return (
    <article className="rounded-xl border bg-card p-5 shadow-sm">
      <CheckoutDetails checkout={checkout} />

      {checkout.canCheckIn && (
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setConfirmOpen(true)} disabled={checkIn.isPending}>
            {checkIn.isPending ? 'Checking in...' : 'Check In'}
          </Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="p-8 sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              Check in the {checkout.boatName || 'boat'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Submit a{' '}
              <a
                href="https://damage.washingtonyachtclub.org"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-2"
              >
                damage report
              </a>{' '}
              if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 px-6 text-base">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 px-6 text-base"
              onClick={() => checkIn.mutate({ data: { index: checkout.index } })}
            >
              Check In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}
