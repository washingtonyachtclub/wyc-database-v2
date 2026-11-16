import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { useAppForm } from '@/hooks/form'
import { commentSchema } from '@/domains/keelboat-calendar/schema'
import { reservationQueryOptions } from '@/domains/keelboat-calendar/query-options'
import { addReservationComment, deleteReservation } from '@/domains/keelboat-calendar/server-fns'
import { slotLabel } from '@/domains/keelboat-calendar/calendar'

export function ReservationDetails({
  id,
  memberId,
  canManage,
  onClose,
}: {
  id: number
  memberId: number
  canManage: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { data, error, isPending } = useQuery(reservationQueryOptions(id, memberId))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const comment = useMutation({
    mutationFn: addReservationComment,
    onSuccess: (result) => {
      if (!result.success) return
      form.reset()
      void queryClient.invalidateQueries({ queryKey: ['keelboat-calendar', 'reservation', id] })
    },
  })
  const remove = useMutation({
    mutationFn: deleteReservation,
    onSuccess: (result) => {
      if (!result.success) return
      void queryClient.invalidateQueries({ queryKey: ['keelboat-calendar'] })
      onClose()
    },
  })
  const form = useAppForm({
    defaultValues: { id, comment: '' },
    validators: { onSubmit: commentSchema },
    onSubmit: async ({ value }) => {
      await comment.mutateAsync({ data: value }).catch(() => {})
    },
  })
  return (
    <Modal
      title={`${data?.kind === 'admin' ? 'Admin reservation' : 'Reservation'} #${id}`}
      onClose={() => {
        if (!remove.isPending) onClose()
      }}
      contentClassName="max-h-[90dvh] overflow-y-auto"
    >
      <ErrorAlert
        error={error?.message || comment.error?.message || remove.error?.message}
        action="Reservation"
      />
      {(comment.data?.success === false || remove.data?.success === false) && (
        <p role="alert" className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">
          {comment.data?.success === false
            ? comment.data.message
            : remove.data?.success === false
              ? remove.data.message
              : ''}
        </p>
      )}
      {isPending && <p role="status">Loading reservation…</p>}
      {data && (
        <div className="space-y-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Boat</dt>
            <dd>{data.boat}</dd>
            {data.kind === 'admin' ? (
              <>
                <dt className="text-muted-foreground">Title</dt>
                <dd>{data.title || 'Admin'}</dd>
              </>
            ) : (
              <>
                <dt className="text-muted-foreground">Member</dt>
                <dd>
                  {data.member} · #{data.memberId}
                </dd>
              </>
            )}
            {data.creatorId > 0 && (
              <>
                <dt className="text-muted-foreground">Created by</dt>
                <dd>
                  {data.creator} · #{data.creatorId}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">First slot</dt>
            <dd>{slotLabel(data.from)}</dd>
            <dt className="text-muted-foreground">Last slot</dt>
            <dd>{slotLabel(data.through)}</dd>
            {data.destination && (
              <>
                <dt className="text-muted-foreground">Destination</dt>
                <dd className="break-words">{data.destination}</dd>
              </>
            )}
            {data.kind === 'personal' && (
              <>
                <dt className="text-muted-foreground">Crew</dt>
                <dd>{data.numberOfCrew}</dd>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{data.phone}</dd>
              </>
            )}
          </dl>
          {data.comment && <p className="whitespace-pre-wrap text-sm">{data.comment}</p>}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Comments</h2>
            {data.comments.map((item, index) => (
              <div key={`${item.date}-${index}`} className="rounded-md bg-muted p-3 text-sm">
                <div className="mb-1 flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
                  <span>{item.author}</span>
                  <time>{item.date} Pacific</time>
                </div>
                <p className="whitespace-pre-wrap break-words">{item.text}</p>
              </div>
            ))}
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault()
                void form.handleSubmit()
              }}
            >
              <form.AppField
                name="comment"
                children={(field) => <field.TextAreaField label="New comment" rows={2} />}
              />
              <form.AppForm>
                <form.SubmitButton label="Post comment" submittingLabel="Posting…" />
              </form.AppForm>
            </form>
          </section>
          {canManage && (
            <div className="border-t pt-4">
              {confirmDelete ? (
                <div className="space-y-3">
                  <p className="text-sm">Permanently delete this reservation and its comments?</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={remove.isPending}
                      onClick={() => setConfirmDelete(false)}
                    >
                      Keep reservation
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate({ data: { id } })}
                    >
                      {remove.isPending ? 'Deleting…' : 'Delete reservation'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setConfirmDelete(true)}>
                  Delete reservation
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
