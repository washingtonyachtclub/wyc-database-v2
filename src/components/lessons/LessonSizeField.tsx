import type { LessonInsert } from '@/domains/lessons/schema'
import { withForm } from '@/hooks/form'

const lessonSizeDefaults: LessonInsert = {
  classTypeId: 1,
  subtype: '',
  sessions: [],
  instructor1: 0,
  instructor2: null,
  description: '',
  requirements: '',
  location: '',
  locationUrl: '',
  size: 1,
  unlimitedSize: false,
  expire: 0,
}

export const LessonSizeField = withForm({
  defaultValues: lessonSizeDefaults,
  render: function LessonSizeRender({ form }) {
    return (
      <div className="space-y-3">
        <form.AppField
          name="unlimitedSize"
          listeners={{
            onChange: ({ value }) => {
              const size = form.getFieldValue('size')
              if (value && (!Number.isInteger(size) || size < 1)) form.setFieldValue('size', 1)
            },
          }}
          children={(field) => <field.CheckboxField label="Unlimited size" />}
        />
        <form.Subscribe selector={(state) => state.values.unlimitedSize}>
          {(unlimited) =>
            !unlimited && (
              <form.AppField
                name="size"
                children={(field) => <field.NumberField label="Size" min={1} required />}
              />
            )
          }
        </form.Subscribe>
      </div>
    )
  },
})
