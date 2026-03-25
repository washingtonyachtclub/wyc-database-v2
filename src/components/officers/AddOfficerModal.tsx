import { useQuery } from '@tanstack/react-query'
import type { OfficerInsert } from '../../db/officer-schema'
import { officerInsertSchema } from '../../db/officer-schema'
import { useAppForm } from '../../hooks/form'
import {
  getOfficerPagePositionsQueryOptions,
  useCreateOfficerMutation,
} from '../../lib/officers-query-options'
import { Button } from '../ui/button'
import { MemberCombobox } from '../ui/MemberCombobox'
import { Modal } from '../ui/Modal'

const emptyDefaults: OfficerInsert = {
  member: 0,
  position: 0,
}

type AddOfficerModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export function AddOfficerModal({ onClose, onSuccess }: AddOfficerModalProps) {
  const { data: positions = [] } = useQuery(getOfficerPagePositionsQueryOptions())

  const createMutation = useCreateOfficerMutation({ onSuccess, onClose })

  const form = useAppForm({
    defaultValues: emptyDefaults,
    validators: {
      onSubmit: officerInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({ data: value })
    },
  })

  const mutationError = createMutation.error?.message

  const positionOptions = positions.map((p) => ({
    value: p.index,
    label: p.name,
  }))

  return (
    <Modal onClose={onClose} title="Add Record">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        {mutationError && (
          <div className="rounded-md bg-destructive/10 p-4 border border-destructive">
            <div className="text-sm text-destructive">{mutationError}</div>
          </div>
        )}

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
                label="Position"
                required
                placeholder="Select position"
                options={positionOptions}
              />
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Add Record" submittingLabel="Adding..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
