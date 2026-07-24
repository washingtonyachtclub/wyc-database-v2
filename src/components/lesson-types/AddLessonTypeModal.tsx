import { ErrorAlert } from '../ui/ErrorAlert'
import { lessonTypeInsertSchema } from '@/domains/lesson-types/schema'
import { useAppForm } from '../../hooks/form'
import { useCreateLessonTypeMutation } from '@/domains/lesson-types/query-options'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'

type AddLessonTypeModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export function AddLessonTypeModal({ onClose, onSuccess }: AddLessonTypeModalProps) {
  const createMutation = useCreateLessonTypeMutation({ onSuccess, onClose })

  const form = useAppForm({
    defaultValues: { text: '' },
    validators: {
      onSubmit: lessonTypeInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({ data: value })
    },
  })

  const mutationError = createMutation.error?.message

  return (
    <Modal onClose={onClose} title="New Lesson Type">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        <ErrorAlert error={mutationError} action="Adding lesson type" />

        <form.AppField
          name="text"
          children={(field) => <field.TextField label="Lesson Type Name" required />}
        />

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Save Lesson Type" submittingLabel="Saving..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
