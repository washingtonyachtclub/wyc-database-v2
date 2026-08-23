import { useQuery } from '@tanstack/react-query'
import { ErrorAlert } from '../ui/ErrorAlert'
import { boatTypeInsertSchema } from '@/domains/boat-types/schema'
import { useAppForm } from '../../hooks/form'
import {
  getDistinctFleetNamesQueryOptions,
  useCreateBoatTypeMutation,
} from '@/domains/boat-types/query-options'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { FleetCombobox } from './FleetCombobox'

type AddBoatTypeModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export function AddBoatTypeModal({ onClose, onSuccess }: AddBoatTypeModalProps) {
  const { data: existingFleets = [] } = useQuery(getDistinctFleetNamesQueryOptions())

  const createMutation = useCreateBoatTypeMutation({ onSuccess, onClose })

  const form = useAppForm({
    defaultValues: { type: '', fleet: '', description: '' },
    validators: {
      onSubmit: boatTypeInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({ data: value })
    },
  })

  const mutationError = createMutation.error?.message

  return (
    <Modal onClose={onClose} title="New Boat Type">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        <ErrorAlert error={mutationError} action="Adding boat type" />

        <form.AppField
          name="type"
          children={(field) => <field.TextField label="Type" required />}
        />

        <form.AppField
          name="fleet"
          children={(field) => (
            <FleetCombobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              existingFleets={existingFleets}
              label="Fleet"
            />
          )}
        />

        <form.AppField
          name="description"
          children={(field) => <field.TextAreaField label="Description" />}
        />

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Save Boat Type" submittingLabel="Saving..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
