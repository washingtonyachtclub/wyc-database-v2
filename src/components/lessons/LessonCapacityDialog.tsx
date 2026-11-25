import type { LessonCapacityPreview } from '@/domains/lessons/capacity-change'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function LessonCapacityDialog({
  preview,
  saving,
  error,
  onBack,
  onSave,
}: {
  preview: LessonCapacityPreview | undefined
  saving: boolean
  error: string | undefined
  onBack: () => void
  onSave: (sendEmails: boolean) => void
}) {
  const changes = preview?.changes ?? []
  const count = changes.length
  const enrolling = changes[0]?.status === 'enrolled'
  const capacity = (size: number) => (size === 0 ? 'Unlimited' : size)

  return (
    <AlertDialog open={!!preview} onOpenChange={(open) => !open && !saving && onBack()}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
        {preview && (
          <>
            <AlertDialogHeader className="text-left">
              <AlertDialogTitle>Change lesson capacity?</AlertDialogTitle>
              <AlertDialogDescription>
                Capacity will change from {capacity(preview.currentSize)} to{' '}
                {capacity(preview.nextSize)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 text-sm">
              <p className="font-medium">
                {count} {count === 1 ? 'student' : 'students'} will{' '}
                {enrolling ? 'move off the waitlist and into the class' : 'move to the waitlist'}.
              </p>
              <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5">
                {changes.map(({ wycNumber, name }) => (
                  <li key={wycNumber}>{name}</li>
                ))}
              </ul>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:space-x-0">
              <AlertDialogCancel className="mt-0 sm:mr-auto" disabled={saving}>
                Back
              </AlertDialogCancel>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => onSave(false)}
              >
                Save without emailing
              </Button>
              <Button type="button" disabled={saving} onClick={() => onSave(true)}>
                Save and send emails
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
