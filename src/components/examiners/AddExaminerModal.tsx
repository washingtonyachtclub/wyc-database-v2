import { examinerInsertSchema } from '@/domains/examiners/schema'
import { ErrorAlert } from '../ui/ErrorAlert'
import type { ExaminerInsertData } from '@/domains/examiners/schema'
import { useAppForm } from '../../hooks/form'
import { useCreateExaminerMutation } from '@/domains/examiners/query-options'
import { Button } from '../ui/button'
import { MemberCombobox } from '../ui/MemberCombobox'
import { Modal } from '../ui/Modal'

const emptyDefaults: ExaminerInsertData = {
  member: 0,
}

type AddExaminerModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export function AddExaminerModal({ onClose, onSuccess }: AddExaminerModalProps) {
  const createMutation = useCreateExaminerMutation({ onSuccess, onClose })

  const form = useAppForm({
    defaultValues: emptyDefaults,
    validators: {
      onSubmit: examinerInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value.member)
    },
  })

  const mutationError = createMutation.error?.message

  return (
    <Modal onClose={onClose} title="New Ratings Examiner">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        <ErrorAlert error={mutationError} action="Adding ratings examiner" />

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
