import { useQuery } from '@tanstack/react-query'
import { privilegeInsertSchema } from '../../db/privilege-schema'
import { ErrorAlert } from '../ui/ErrorAlert'
import type { PrivilegeInsertData } from '../../db/privilege-schema'
import { useAppForm } from '../../hooks/form'
import {
  getPrivilegeTypesQueryOptions,
  useCreatePrivilegeMutation,
} from '../../lib/privileges-query-options'
import { Button } from '../ui/button'
import { MemberCombobox } from '../ui/MemberCombobox'
import { Modal } from '../ui/Modal'

const emptyDefaults: PrivilegeInsertData = {
  member: 0,
  position: 0,
}

type AddPrivilegeModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export function AddPrivilegeModal({ onClose, onSuccess }: AddPrivilegeModalProps) {
  const { data: privilegeTypes = [] } = useQuery(getPrivilegeTypesQueryOptions())

  const createMutation = useCreatePrivilegeMutation({ onSuccess, onClose })

  const form = useAppForm({
    defaultValues: emptyDefaults,
    validators: {
      onSubmit: privilegeInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({ data: value })
    },
  })

  const mutationError = createMutation.error?.message

  const privilegeTypeOptions = privilegeTypes.map((pt) => ({
    value: pt.index,
    label: pt.name || `Position ${pt.index}`,
  }))

  return (
    <Modal onClose={onClose} title="New Privilege">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        <ErrorAlert error={mutationError} action="Adding privilege" />

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
                label="Role"
                placeholder="Select role"
                options={privilegeTypeOptions}
              />
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Save Privilege" submittingLabel="Saving..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
