import { honoraryInsertSchema } from '../../db/honorary-schema'
import type { HonoraryInsertData } from '../../db/honorary-schema'
import { useAppForm } from '../../hooks/form'
import { useCreateHonoraryMutation } from '../../lib/honorary-query-options'
import { Button } from '../ui/button'
import { MemberCombobox } from '../ui/MemberCombobox'
import { Modal } from '../ui/Modal'

const emptyDefaults: HonoraryInsertData = {
  member: 0,
}

type AddHonoraryModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export function AddHonoraryModal({ onClose, onSuccess }: AddHonoraryModalProps) {
  const createMutation = useCreateHonoraryMutation({ onSuccess, onClose })

  const form = useAppForm({
    defaultValues: emptyDefaults,
    validators: {
      onSubmit: honoraryInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value.member)
    },
  })

  const mutationError = createMutation.error?.message

  return (
    <Modal onClose={onClose} title="New Honorary Member">
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

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Save" submittingLabel="Saving..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
