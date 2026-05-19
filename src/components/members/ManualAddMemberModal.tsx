import { useQuery } from '@tanstack/react-query'
import { useAppForm } from '@/hooks/form'
import { CreateMemberSchema } from '@/domains/members/schema'
import type { MemberProfileUpdate } from '@/domains/members/schema'
import { getCategoriesQueryOptions } from '@/domains/members/query-options'
import { getQuartersQueryOptions } from '@/domains/quarters/query-options'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'

type ManualAddMemberModalProps = {
  onClose: () => void
  onSubmit: (member: MemberProfileUpdate) => void
}

const emptyDefaults: MemberProfileUpdate = {
  first: '',
  last: '',
  email: '',
  streetAddress: '',
  city: '',
  state: '',
  zipCode: '',
  phone1: '',
  phone2: '',
  categoryId: null,
  expireQtrIndex: 0,
  studentId: null,
  outToSea: false,
}

export function ManualAddMemberModal({ onClose, onSubmit }: ManualAddMemberModalProps) {
  const { data: categories = [] } = useQuery(getCategoriesQueryOptions())
  const { data: quartersData = [] } = useQuery(getQuartersQueryOptions())

  const form = useAppForm({
    defaultValues: emptyDefaults,
    validators: {
      onSubmit: CreateMemberSchema.refine((data) => data.expireQtrIndex > 0, {
        message: 'Expiration quarter is required',
        path: ['expireQtrIndex'],
      }),
    },
    onSubmit: async ({ value }) => {
      onSubmit(value)
      onClose()
    },
  })

  const categoryOptions = categories.map((c) => ({
    value: c.index,
    label: c.text || `Category ${c.index}`,
  }))

  const quarterOptions = quartersData.map((q) => ({
    value: q.index,
    label: q.school || q.text || `Quarter ${q.index}`,
  }))

  return (
    <Modal onClose={onClose} title="Add Member Manually">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
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
            children={(field) => <field.TextField label="Email" required type="email" />}
          />
          <form.AppField name="phone1" children={(field) => <field.TextField label="Phone 1" />} />
          <form.AppField name="phone2" children={(field) => <field.TextField label="Phone 2" />} />
          <form.AppField
            name="streetAddress"
            children={(field) => <field.TextField label="Address" />}
          />
          <form.AppField name="city" children={(field) => <field.TextField label="City" />} />
          <form.AppField name="state" children={(field) => <field.TextField label="State" />} />
          <form.AppField
            name="zipCode"
            children={(field) => <field.TextField label="Zip Code" />}
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
                label="Expiration Quarter"
                placeholder="Select quarter"
                options={quarterOptions}
              />
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Create Member" submittingLabel="Creating..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
