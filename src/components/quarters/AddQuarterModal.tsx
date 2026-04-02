import { useCreateQuarterMutation } from '@/domains/quarters/query-options'
import { quarterInsertSchema } from '@/domains/quarters/schema'
import { useAppForm } from '../../hooks/form'
import { Button } from '../ui/button'
import { ErrorAlert } from '../ui/ErrorAlert'
import { Modal } from '../ui/Modal'

type AddQuarterModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export function AddQuarterModal({ onClose, onSuccess }: AddQuarterModalProps) {
  const createMutation = useCreateQuarterMutation({ onSuccess, onClose })

  const form = useAppForm({
    defaultValues: { text: '', school: '', endDate: '' },
    validators: {
      onSubmit: quarterInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({ data: value })
    },
  })

  const mutationError = createMutation.error?.message

  return (
    <Modal onClose={onClose} title="New Quarter">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        <ErrorAlert error={mutationError} action="Adding quarter" />

        <form.AppField
          name="text"
          children={(field) => (
            <field.TextField label="Text" required placeholder="Jun 2026" />
          )}
        />

        <form.AppField
          name="school"
          children={(field) => (
            <field.TextField label="School" required placeholder="Spring 2026" />
          )}
        />

        <form.AppField
          name="endDate"
          children={(field) => <field.TextField label="End Date" required type="date" />}
        />

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Save Quarter" submittingLabel="Saving..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
