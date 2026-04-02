import { useQuery } from '@tanstack/react-query'
import { chiefInsertSchema } from '@/domains/chiefs/schema'
import { ErrorAlert } from '../ui/ErrorAlert'
import type { ChiefInsertData } from '@/domains/chiefs/schema'
import { useAppForm } from '../../hooks/form'
import {
  getChiefTypesQueryOptions,
  useCreateChiefMutation,
} from '@/domains/chiefs/query-options'
import { Button } from '../ui/button'
import { MemberCombobox } from '../ui/MemberCombobox'
import { Modal } from '../ui/Modal'

const emptyDefaults: ChiefInsertData = {
  member: 0,
  position: 0,
}

type AddChiefModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export function AddChiefModal({ onClose, onSuccess }: AddChiefModalProps) {
  const { data: chiefTypes = [] } = useQuery(getChiefTypesQueryOptions())

  const createMutation = useCreateChiefMutation({ onSuccess, onClose })

  const form = useAppForm({
    defaultValues: emptyDefaults,
    validators: {
      onSubmit: chiefInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({ data: value })
    },
  })

  const mutationError = createMutation.error?.message

  const chiefTypeOptions = chiefTypes.map((ct) => ({
    value: ct.index,
    label: ct.name || `Position ${ct.index}`,
  }))

  return (
    <Modal onClose={onClose} title="New Chief">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        <ErrorAlert error={mutationError} action="Adding chief record" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form.AppField
            name="member"
            children={(field) => (
              <div>
                <MemberCombobox
                  label="Member"
                  value={field.state.value || null}
                  onChange={(wycNumber) => field.handleChange(wycNumber ?? 0)}
                />
              </div>
            )}
          />

          <form.AppField
            name="position"
            children={(field) => (
              <field.SelectField
                label="Chief Type"
                placeholder="Select chief type"
                options={chiefTypeOptions}
              />
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Save Chief" submittingLabel="Saving..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
