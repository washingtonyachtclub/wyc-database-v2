import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppForm } from '@/hooks/form'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import {
  reservationSchema,
  type CalendarBoat,
  type ReservationInput,
} from '@/domains/keelboat-calendar/schema'
import { createReservation } from '@/domains/keelboat-calendar/server-fns'
import { slotLabel, slotMarker } from '@/domains/keelboat-calendar/calendar'

const slots = [
  { value: 0, label: 'Morning' },
  { value: 1, label: 'Afternoon' },
]

export function ReservationForm({
  boats,
  initial,
  onClose,
  onCreated,
}: {
  boats: CalendarBoat[]
  initial: ReservationInput
  onClose: () => void
  onCreated: (id: number) => void
}) {
  const isAdmin = initial.kind === 'admin'
  const queryClient = useQueryClient()
  const [review, setReview] = useState<ReservationInput | null>(null)
  const mutation = useMutation({
    mutationFn: createReservation,
    onSuccess: (result) => {
      if (!result.success) return
      void queryClient.invalidateQueries({ queryKey: ['keelboat-calendar'] })
      onCreated(result.data.id)
    },
  })
  const form = useAppForm({
    defaultValues: initial,
    validators: { onSubmit: reservationSchema },
    onSubmit: ({ value }) => {
      mutation.reset()
      setReview(value)
    },
  })
  return (
    <Modal
      title={
        review
          ? isAdmin
            ? 'Confirm admin reservation'
            : 'Confirm reservation'
          : isAdmin
            ? 'New admin reservation'
            : 'New personal reservation'
      }
      onClose={() => {
        if (!mutation.isPending) onClose()
      }}
      contentClassName="max-h-[90dvh] overflow-y-auto"
    >
      <ErrorAlert error={mutation.error?.message} action="Saving reservation" />
      {mutation.data?.success === false && (
        <div role="alert" className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">
          <p>{mutation.data.message}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setReview(null)
              mutation.reset()
            }}
          >
            Edit reservation
          </Button>
        </div>
      )}
      {review ? (
        <div className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {isAdmin && (
              <>
                <dt className="text-muted-foreground">Title</dt>
                <dd>{review.title || 'Admin'}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Boat</dt>
            <dd>{boats.find((b) => b.id === review.boatId)?.name}</dd>
            <dt className="text-muted-foreground">First slot</dt>
            <dd>{slotLabel(slotMarker(review.fromDate, review.fromSlot))}</dd>
            <dt className="text-muted-foreground">Last slot</dt>
            <dd>{slotLabel(slotMarker(review.throughDate, review.throughSlot))}</dd>
            {review.destination && (
              <>
                <dt className="text-muted-foreground">Destination</dt>
                <dd>{review.destination}</dd>
              </>
            )}
            {!isAdmin && (
              <>
                <dt className="text-muted-foreground">Crew</dt>
                <dd>{review.numberOfCrew}</dd>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{review.phone}</dd>
              </>
            )}
          </dl>
          {review.comment && <p className="whitespace-pre-wrap text-sm">{review.comment}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={mutation.isPending} onClick={() => setReview(null)}>
              Back
            </Button>
            <Button disabled={mutation.isPending} onClick={() => mutation.mutate({ data: review })}>
              {mutation.isPending ? 'Reserving…' : 'Reserve'}
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          {isAdmin && (
            <form.AppField
              name="title"
              children={(field) => <field.TextField label="Title (public)" placeholder="Admin" />}
            />
          )}
          <form.AppField
            name="boatId"
            children={(field) => (
              <field.SelectField
                label="Boat"
                required
                options={boats.map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <form.AppField
              name="fromDate"
              children={(field) => <field.TextField label="First date" type="date" required />}
            />
            <form.AppField
              name="fromSlot"
              children={(field) => <field.SelectField label="First slot" options={slots} />}
            />
            <form.AppField
              name="throughDate"
              children={(field) => <field.TextField label="Last date" type="date" required />}
            />
            <form.AppField
              name="throughSlot"
              children={(field) => <field.SelectField label="Last slot" options={slots} />}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Morning: 3 a.m.–3 p.m. Afternoon: 3 p.m.–3 a.m. the next day.
          </p>
          <form.AppField
            name="destination"
            children={(field) => <field.TextField label="Destination" />}
          />
          {!isAdmin && (
            <div className="grid grid-cols-2 gap-3">
              <form.AppField
                name="numberOfCrew"
                children={(field) => <field.NumberField label="Number of crew" />}
              />
              <form.AppField
                name="phone"
                children={(field) => <field.TextField label="Contact phone" required />}
              />
            </div>
          )}
          <form.AppField
            name="comment"
            children={(field) => <field.TextAreaField label={isAdmin ? 'Notes' : 'Comment'} />}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <form.AppForm>
              <form.SubmitButton label="Review reservation" />
            </form.AppForm>
          </div>
        </form>
      )}
    </Modal>
  )
}
