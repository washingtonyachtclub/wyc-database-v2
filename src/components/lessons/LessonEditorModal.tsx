import { useQuery } from '@tanstack/react-query'
import { Button } from '../ui/button'
import { TBD_WYC_NUMBER } from '../../db/constants'
import { lessonInsertSchema } from '../../db/lesson-schema'
import type { Lesson, LessonInsert } from '../../db/types'
import { useAppForm } from '../../hooks/form'
import { getClassTypesQueryOptions, useCreateLessonMutation, useUpdateLessonMutation } from '../../lib/lessons-query-options'
import { getQuartersQueryOptions } from '../../lib/members-query-options'
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
  lesson: Lesson | null
  currentQuarter: number
  onSuccess: () => void
}

export function LessonFormModal({
  onClose,
  lesson,
  currentQuarter,
  onSuccess,
}: LessonFormModalProps) {
  const { data: quarters = [] } = useQuery(getQuartersQueryOptions())
  const { data: classTypes = [] } = useQuery(getClassTypesQueryOptions())

  const defaultQuarter =
    quarters.find((q) => q.index === currentQuarter) ?? quarters[0]

  const createLessonMutation = useCreateLessonMutation({ onSuccess, onClose })
  const updateLessonMutation = useUpdateLessonMutation({ onSuccess, onClose })

  const isUpdate = !!lesson

  const defaultValues: LessonInsert = isUpdate
    ? {
        classTypeId: lesson.classTypeId,
        subtype: lesson.subtype,
        day: lesson.day,
        time: lesson.time,
        dates: lesson.dates,
        calendarDate: lesson.calendarDate,
        instructor1: lesson.instructor1,
        instructor2: lesson.instructor2,
        comments: lesson.comments,
        size: lesson.size,
        expire: lesson.expire,
        display: lesson.display,
      }
    : emptyDefaults(defaultQuarter?.index ?? 0)

  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: lessonInsertSchema,
    },
    onSubmit: async ({ value }) => {
      if (isUpdate) {
        await updateLessonMutation.mutateAsync({
          data: { index: lesson.index, ...value },
        })
      } else {
        await createLessonMutation.mutateAsync({ data: value })
      }
    },
  })

  const mutationError =
    createLessonMutation.error?.message || updateLessonMutation.error?.message

  const classTypeOptions = classTypes.map((ct) => ({
    value: ct.index,
    label: ct.text ?? `Type ${ct.index}`,
  }))

  const quarterOptions = quarters.map((q) => ({
    value: q.index,
    label: q.school || q.text || `Quarter ${q.index}`,
  }))

  return (
    <Modal onClose={onClose} title={isUpdate ? 'Edit Lesson' : 'New Lesson'}>
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
            name="classTypeId"
            children={(field) => (
              <field.SelectField
                label="Type"
                placeholder="Select type"
                options={classTypeOptions}
              />
            )}
          />

          <form.AppField
            name="subtype"
            children={(field) => <field.TextField label="Title" required />}
          />

          <form.AppField
            name="day"
            children={(field) => (
              <field.TextField label="Day of week" required />
            )}
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
                placeholder='March 7th, March 14th'
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
                  onChange={(wycNumber) =>
                    field.handleChange(wycNumber ?? TBD_WYC_NUMBER)
                  }
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
            children={(field) => (
              <field.TextAreaField label="Comments" className="md:col-span-2" />
            )}
          />

          <form.AppField
            name="size"
            children={(field) => (
              <field.NumberField label="Size" required />
            )}
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
            children={(field) => (
              <field.BooleanSelectField label="Display (show on website)" />
            )}
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
