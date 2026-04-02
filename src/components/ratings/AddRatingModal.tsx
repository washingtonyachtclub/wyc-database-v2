import { useQuery } from '@tanstack/react-query'
import type { RatingInsertData } from '@/domains/ratings/schema'
import { ErrorAlert } from '../ui/ErrorAlert'
import { ratingInsertSchema } from '@/domains/ratings/schema'
import { useAppForm } from '../../hooks/form'
import {
  getRatingTypesQueryOptions,
  useCreateRatingMutation,
} from '@/domains/ratings/query-options'
import { Button } from '../ui/button'
import { MemberCombobox } from '../ui/MemberCombobox'
import { Modal } from '../ui/Modal'

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const emptyDefaults = (examinerDefault: number): RatingInsertData => ({
  member: 0,
  rating: 0,
  date: todayString(),
  examiner: examinerDefault,
  comments: '',
})

type AddRatingModalProps = {
  onClose: () => void
  onSuccess: () => void
  currentUserWycNumber: number
}

export function AddRatingModal({
  onClose,
  onSuccess,
  currentUserWycNumber,
}: AddRatingModalProps) {
  const { data: ratingTypes = [] } = useQuery(getRatingTypesQueryOptions())

  const createMutation = useCreateRatingMutation({ onSuccess, onClose })

  const form = useAppForm({
    defaultValues: emptyDefaults(currentUserWycNumber),
    validators: {
      onSubmit: ratingInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({ data: value })
    },
  })

  const mutationError = createMutation.error?.message

  const ratingTypeOptions = ratingTypes.map((rt) => ({
    value: rt.index,
    label: rt.text ?? `Rating ${rt.index}`,
  }))

  return (
    <Modal onClose={onClose} title="New Rating">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        <ErrorAlert error={mutationError} action="Adding rating" />

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
            name="rating"
            children={(field) => (
              <field.SelectField
                label="Rating Type"
                placeholder="Select rating"
                options={ratingTypeOptions}
              />
            )}
          />

          <form.AppField
            name="date"
            children={(field) => (
              <field.TextField label="Date" required type="date" />
            )}
          />

          <form.AppField
            name="examiner"
            children={(field) => (
              <div>
                <MemberCombobox
                  label="Examiner"
                  value={field.state.value || null}
                  onChange={(wycNumber) => field.handleChange(wycNumber ?? 0)}
                />
              </div>
            )}
          />

          <form.AppField
            name="comments"
            children={(field) => (
              <field.TextAreaField label="Comments" className="md:col-span-2" />
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Save Rating" submittingLabel="Saving..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
