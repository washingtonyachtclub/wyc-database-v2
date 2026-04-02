import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { ratingUpdateSchema } from '@/domains/ratings/schema'
import { useAppForm } from '@/hooks/form'
import { getExpiryInfo } from '@/lib/rating-expiry'
import {
  getRatingByIdQueryOptions,
  useDeleteRatingMutation,
  useUpdateRatingMutation,
} from '@/domains/ratings/query-options'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { requirePrivilegeForRoute } from '../lib/route-guards'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/ratings_/$ratingIndex')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/ratings/$ratingIndex')
  },
  loader: ({ context, params: { ratingIndex } }) => {
    return context.queryClient.ensureQueryData(getRatingByIdQueryOptions(Number(ratingIndex)))
  },
  component: RatingDetailPage,
})

function RatingDetailPage() {
  const { ratingIndex } = Route.useParams()
  const { data: rating } = useSuspenseQuery(getRatingByIdQueryOptions(Number(ratingIndex)))
  const navigate = useNavigate()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const deleteMutation = useDeleteRatingMutation()

  if (!rating) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">Rating not found.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-8">
      <h1 className="text-2xl font-bold">{`${rating.memberName} - ${rating.ratingText}`}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoField label="Index" value={String(rating.index)} />
        <InfoField label="Rating Type" value={rating.ratingText} />
        <InfoField label="Degree" value={String(rating.ratingDegree)} />
        <InfoField label="Date" value={rating.date} />
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Member</dt>
          <dd className="text-sm">
            <Link
              to="/members/$wycNumber"
              params={{ wycNumber: String(rating.member) }}
              className="underline"
            >
              {rating.memberName}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Examiner</dt>
          <dd className="text-sm">
            <Link
              to="/members/$wycNumber"
              params={{ wycNumber: String(rating.examiner) }}
              className="underline"
            >
              {rating.examinerName}
            </Link>
          </dd>
        </div>
      </div>

      {(() => {
        const expiryInfo = getExpiryInfo(rating)
        if (!expiryInfo) return null
        return (
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Expiry Status</dt>
            <dd
              className={`text-sm ${expiryInfo.startsWith('Expired') ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {expiryInfo}
            </dd>
          </div>
        )
      })()}

      <RatingEditForm ratingIndex={rating.index} defaultComments={rating.comments} />

      <div className="pt-4 border-t">
        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
          Delete Rating
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rating</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the <strong>{rating.ratingText}</strong> rating for{' '}
              <strong>{rating.memberName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteMutation.mutate(
                  { data: { index: rating.index } },
                  {
                    onSuccess: () => navigate({ to: '/ratings', search: {} as any }),
                  },
                )
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || '—'}</dd>
    </div>
  )
}

function RatingEditForm({
  ratingIndex,
  defaultComments,
}: {
  ratingIndex: number
  defaultComments: string
}) {
  const [saveMessage, setSaveMessage] = useState('')

  const updateMutation = useUpdateRatingMutation({
    onSuccess: () => setSaveMessage('Comments saved.'),
  })

  const form = useAppForm({
    defaultValues: { comments: defaultComments },
    validators: {
      onSubmit: ratingUpdateSchema,
    },
    onSubmit: async ({ value }) => {
      setSaveMessage('')
      await updateMutation.mutateAsync({ data: { index: ratingIndex, ...value } })
    },
  })

  const mutationError = updateMutation.error?.message

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      <ErrorAlert error={mutationError} action="Updating rating" />

      {saveMessage && (
        <div className="rounded-md bg-green-500/10 p-4 border border-green-500">
          <div className="text-sm text-green-700">{saveMessage}</div>
        </div>
      )}

      <form.AppField
        name="comments"
        children={(field) => <field.TextAreaField label="Comments" />}
      />

      <div className="flex justify-start gap-2 pt-4 border-t">
        <form.AppForm>
          <form.SubmitButton label="Save Comments" submittingLabel="Saving..." />
        </form.AppForm>
      </div>
    </form>
  )
}
