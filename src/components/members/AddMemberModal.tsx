import { useQuery } from '@tanstack/react-query'
import { AddMemberFormSchema } from '../../db/member-schema'
import type { MemberInsert } from '../../db/types'
import { useAppForm } from '../../hooks/form'
import {
  getCategoriesQueryOptions,
  getQuartersQueryOptions,
  useCreateMemberMutation,
} from '../../lib/members-query-options'
import { Modal } from '../ui/Modal'

const emptyDefaults = (expireDefault: number): MemberInsert => ({
  last: '',
  first: '',
  streetAddress: '',
  city: '',
  state: '',
  zipCode: '',
  phone1: '',
  phone2: '',
  email: '',
  categoryId: 1,
  expireQtrIndex: expireDefault,
  studentId: null,
  outToSea: false,
})

type AddMemberModalProps = {
  onClose: () => void
  currentQuarter: number
  onSuccess: () => void
}

export function AddMemberModal({
  onClose,
  currentQuarter,
  onSuccess,
}: AddMemberModalProps) {
  const { data: quarters = [] } = useQuery(getQuartersQueryOptions())
  const { data: categories = [] } = useQuery(getCategoriesQueryOptions())
  const createMemberMutation = useCreateMemberMutation({ onSuccess, onClose })

  console.log('currentQuarter', currentQuarter)

  const form = useAppForm({
    defaultValues: emptyDefaults(currentQuarter),
    validators: {
      onSubmit: AddMemberFormSchema,
    },
    onSubmit: async ({ value }) => {
      console.log('submittingvalue', value)
      await createMemberMutation.mutateAsync({ data: value })
    },
  })

  const categoryOptions = categories.map((c) => ({
    value: c.index,
    label: c.text ?? `Category ${c.index}`,
  }))

  const quarterOptions = quarters.map((q) => ({
    value: q.index,
    label: q.school || q.text || `Quarter ${q.index}`,
  }))

  return (
    <Modal onClose={onClose} title="Add Member">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        {createMemberMutation.error && (
          <div className="rounded-md bg-destructive/10 p-4 border border-destructive">
            <div className="text-sm text-destructive">
              {createMemberMutation.error.message}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form.AppField
            name="first"
            children={(field) => <field.TextField label="First Name" required />}
          />

          <form.AppField
            name="last"
            children={(field) => <field.TextField label="Last Name" required />}
          />

          <form.AppField
            name="email"
            children={(field) => (
              <field.TextField label="Email" type="email" className="md:col-span-2" />
            )}
          />

          <form.AppField
            name="streetAddress"
            children={(field) => (
              <field.TextField label="Street Address" className="md:col-span-2" />
            )}
          />

          <form.AppField
            name="city"
            children={(field) => <field.TextField label="City" />}
          />

          <form.AppField
            name="state"
            children={(field) => <field.TextField label="State" />}
          />

          <form.AppField
            name="zipCode"
            children={(field) => <field.TextField label="Zip Code" />}
          />

          <form.AppField
            name="phone1"
            children={(field) => <field.TextField label="Phone 1" />}
          />

          <form.AppField
            name="phone2"
            children={(field) => <field.TextField label="Phone 2" />}
          />

          <form.AppField
            name="categoryId"
            children={(field) => (
              <field.SelectField
                label="Category"
                placeholder="Select category"
                options={categoryOptions}
              />
            )}
          />

          <form.AppField
            name="expireQtrIndex"
            children={(field) => (
              <field.SelectField
                label="Expire Quarter"
                required
                placeholder="Select quarter"
                options={quarterOptions}
              />
            )}
          />

          <form.AppField
            name="studentId"
            children={(field) => (
              <field.NumberField label="Student ID" />
            )}
          />

          <form.AppField
            name="outToSea"
            children={(field) => (
              <field.BooleanSelectField label="Out to Sea" />
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm"
          >
            Cancel
          </button>
          <form.AppForm>
            <form.SubmitButton label="Add Member" submittingLabel="Adding..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
