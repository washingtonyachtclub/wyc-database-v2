import { ratingTypeEditSchema, type RatingType } from '@/domains/rating-types/schema'
import { useUpdateRatingTypeMutation } from '@/domains/rating-types/query-options'
import { useAppForm } from '@/hooks/form'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Modal } from '@/components/ui/Modal'

export function EditRatingTypeModal({ item, onClose }: { item: RatingType; onClose: () => void }) {
  const update = useUpdateRatingTypeMutation()
  const form = useAppForm({
    defaultValues: { text: item.text, degree: item.degree },
    validators: { onSubmit: ratingTypeEditSchema },
    onSubmit: async ({ value }) => {
      try {
        await update.mutateAsync({ data: { index: item.index, ...value } })
      } catch {
        return
      }
      onClose()
    },
  })

  return (
    <Modal title="Edit Rating Type" onClose={onClose}>
      <form
        className="p-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <ErrorAlert error={update.error?.message} action="Updating rating type" />
        <form.AppField
          name="text"
          children={(field) => <field.TextField label="Title" required />}
        />
        <form.AppField
          name="degree"
          children={(field) => <field.NumberField label="Degree" min={0} required />}
        />
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Save Rating Type" submittingLabel="Saving..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
