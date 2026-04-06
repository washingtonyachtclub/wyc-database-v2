import { useQuery } from '@tanstack/react-query'
import { ErrorAlert } from '../ui/ErrorAlert'
import { positionInsertSchema } from '@/domains/positions/schema'
import { useAppForm } from '../../hooks/form'
import {
  getPosTypesAllQueryOptions,
  useCreatePositionMutation,
} from '@/domains/positions/query-options'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'

type AddPositionModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export function AddPositionModal({ onClose, onSuccess }: AddPositionModalProps) {
  const { data: posTypes = [] } = useQuery(getPosTypesAllQueryOptions())

  const createMutation = useCreatePositionMutation({ onSuccess, onClose })

  const form = useAppForm({
    defaultValues: { name: '', type: 0 },
    validators: {
      onSubmit: positionInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({ data: value })
    },
  })

  const mutationError = createMutation.error?.message

  const typeOptions = posTypes.map((pt) => ({
    value: pt.index,
    label: pt.text,
  }))

  return (
    <Modal onClose={onClose} title="New Position">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        <ErrorAlert error={mutationError} action="Adding position" />

        <form.AppField
          name="name"
          children={(field) => <field.TextField label="Name" required />}
        />

        <form.AppField
          name="type"
          children={(field) => (
            <field.SelectField
              label="Type"
              required
              placeholder="Select type"
              options={typeOptions}
            />
          )}
        />

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Save Position" submittingLabel="Saving..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
