import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppForm } from '@/hooks/form'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { reservationDetailsSchema, type Reservation } from '@/domains/keelboat-calendar/schema'
import { editReservation } from '@/domains/keelboat-calendar/server-fns'

export function EditReservationForm({
  reservation,
  onClose,
}: {
  reservation: Reservation
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: editReservation,
    onSuccess: (result) => {
      if (!result.success) return
      void queryClient.invalidateQueries({ queryKey: ['keelboat-calendar'] })
      onClose()
    },
  })
  const form = useAppForm({
    defaultValues: {
      id: reservation.id,
      title: reservation.title,
      destination: reservation.destination,
      numberOfCrew: reservation.numberOfCrew,
      phone: reservation.phone,
    },
    validators: { onSubmit: reservationDetailsSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ data: value }).catch(() => {})
    },
  })
  return (
    <form
      className="space-y-4 rounded-md border p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <ErrorAlert error={mutation.error?.message} action="Updating reservation" />
      {mutation.data?.success === false && (
        <p role="alert" className="text-sm">
          {mutation.data.message}
        </p>
      )}
      {reservation.kind === 'admin' && (
        <form.AppField
          name="title"
          children={(field) => <field.TextField label="Title (public)" />}
        />
      )}
      <form.AppField
        name="destination"
        children={(field) => <field.TextField label="Destination" />}
      />
      {reservation.kind === 'personal' && (
        <>
          <form.AppField
            name="numberOfCrew"
            children={(field) => <field.NumberField label="Number of crew" />}
          />
          <form.AppField
            name="phone"
            children={(field) => <field.TextField label="Contact phone" required />}
          />
        </>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <form.AppForm>
          <form.SubmitButton label="Save changes" submittingLabel="Saving…" />
        </form.AppForm>
      </div>
    </form>
  )
}
