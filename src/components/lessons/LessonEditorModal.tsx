import { useQuery } from '@tanstack/react-query'
import { LESSON_CATEGORIES, TBD_WYC_NUMBER } from '../../db/constants'
import { ErrorAlert } from '../ui/ErrorAlert'
import type { LessonInsert } from '@/domains/lessons/schema'
import { lessonInsertSchema } from '@/domains/lessons/schema'
import { useAppForm } from '../../hooks/form'
import { getClassTypesQueryOptions } from '@/domains/class-types/query-options'
import { useCreateLessonMutation } from '@/domains/lessons/query-options'
import { getQuartersQueryOptions } from '@/domains/quarters/query-options'
import { Button } from '../ui/button'
import { MemberCombobox } from '../ui/MemberCombobox'
import { Modal } from '../ui/Modal'

const emptyDefaults = (expireDefault: number): LessonInsert => ({
  classTypeId: 1,
  subtype: '',
  day: '',
  time: '',
  dates: '',
  calendarDate: '',
  instructor1: TBD_WYC_NUMBER,
  instructor2: null,
  comments: '',
  size: 0,
  expire: expireDefault,
  display: true,
})

type LessonFormModalProps = {
  onClose: () => void
  currentQuarter: number
  onSuccess: () => void
}

export function LessonFormModal({ onClose, currentQuarter, onSuccess }: LessonFormModalProps) {
  const { data: quarters = [] } = useQuery(getQuartersQueryOptions())
  const { data: classTypes = [] } = useQuery(getClassTypesQueryOptions())

  const defaultQuarter = quarters.find((q) => q.index === currentQuarter) ?? quarters[0]

  const createLessonMutation = useCreateLessonMutation({ onSuccess, onClose })

  const form = useAppForm({
    defaultValues: emptyDefaults(defaultQuarter?.index ?? 0),
    validators: {
      onSubmit: lessonInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await createLessonMutation.mutateAsync({ data: value })
    },
  })

  const mutationError = createLessonMutation.error?.message

  const classTypeMap = new Map(classTypes.map((ct) => [ct.index, ct.text ?? `Type ${ct.index}`]))
  const classTypeGroups = LESSON_CATEGORIES.map((cat) => ({
    label: cat.label,
    options: cat.typeIds
      .filter((id) => classTypeMap.has(id))
      .map((id) => ({ value: id, label: classTypeMap.get(id)! })),
  })).filter((g) => g.options.length > 0)

  const quarterOptions = quarters.map((q) => ({
    value: q.index,
    label: q.school || q.text || `Quarter ${q.index}`,
  }))

  return (
    <Modal onClose={onClose} title="New Lesson">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        <ErrorAlert error={mutationError} action="Saving lesson" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form.AppField
            name="classTypeId"
            children={(field) => (
              <field.GroupedSelectField
                label="Type"
                placeholder="Select type"
                groups={classTypeGroups}
                tooltip="Group headers match sections on the public lesson list"
              />
            )}
          />

          <form.AppField
            name="subtype"
            children={(field) => <field.TextField label="Title" required />}
          />

          <form.AppField
            name="day"
            children={(field) => <field.TextField label="Day of week" required />}
          />

          <form.AppField
            name="time"
            children={(field) => <field.TextField label="Time" required />}
          />

          <form.AppField
            name="dates"
            children={(field) => (
              <field.TextField
                label="Dates"
                required
                placeholder="March 7th, March 14th"
                className="md:col-span-2"
              />
            )}
          />

          <form.AppField
            name="calendarDate"
            children={(field) => (
              <field.TextField
                label="Calendar Date (Earliest Date if Multi-day)"
                required
                type="date"
              />
            )}
          />

          <form.AppField
            name="instructor1"
            children={(field) => (
              <div>
                <MemberCombobox
                  label="Instructor 1"
                  value={field.state.value}
                  onChange={(wycNumber) => field.handleChange(wycNumber ?? TBD_WYC_NUMBER)}
                />
              </div>
            )}
          />

          <form.AppField
            name="instructor2"
            children={(field) => (
              <div>
                <MemberCombobox
                  label="Instructor 2"
                  value={field.state.value}
                  onChange={(wycNumber) => field.handleChange(wycNumber)}
                />
              </div>
            )}
          />

          <form.AppField
            name="comments"
            children={(field) => <field.TextAreaField label="Comments" className="md:col-span-2" />}
          />

          <form.AppField
            name="size"
            children={(field) => <field.NumberField label="Size" required />}
          />

          <form.AppField
            name="expire"
            children={(field) => (
              <field.SelectField
                label="Expire"
                required
                placeholder="Select quarter"
                options={quarterOptions}
              />
            )}
          />

          <form.AppField
            name="display"
            children={(field) => <field.BooleanSelectField label="Display (show on website)" />}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Save Lesson" submittingLabel="Saving..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
