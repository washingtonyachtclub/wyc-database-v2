import { lessonErrorMessage } from '@/components/lessons/lesson-error-message'
import { revalidateLogic } from '@tanstack/react-form'
import { LessonSizeField } from '@/components/lessons/LessonSizeField'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { LESSON_CATEGORIES, TBD_WYC_NUMBER } from '../../db/constants'
import { lessonTypeLocation, sessionsForLessonType } from './LessonLocationField'
import { LessonSessionsField } from './LessonSessionsField'
import { ErrorAlert } from '../ui/ErrorAlert'
import type { LessonInsert } from '@/domains/lessons/schema'
import { emptySessionInput, lessonInsertSchemaForQuarters } from '@/domains/lessons/schema'
import { useMemo } from 'react'
import { useAppForm } from '../../hooks/form'
import { getLessonTypesQueryOptions } from '@/domains/lesson-types/query-options'
import { useCreateLessonMutation } from '@/domains/lessons/query-options'
import { getQuartersQueryOptions } from '@/domains/quarters/query-options'
import { Button } from '../ui/button'
import { MemberCombobox } from '../ui/MemberCombobox'
import { Modal } from '../ui/Modal'

const emptyDefaults = (): LessonInsert => ({
  classTypeId: 1,
  subtype: '',
  sessions: [{ ...emptySessionInput, ...lessonTypeLocation(1) }],
  instructor1: TBD_WYC_NUMBER,
  instructor2: null,
  description: '',
  requirements: '',
  size: 1,
  unlimitedSize: false,
})

type LessonFormModalProps = {
  onClose: () => void
  onSuccess?: () => void
}

export function LessonFormModal({ onClose, onSuccess }: LessonFormModalProps) {
  const { data: quarters } = useSuspenseQuery(getQuartersQueryOptions())
  const { data: classTypes = [] } = useQuery(getLessonTypesQueryOptions())

  const createLessonMutation = useCreateLessonMutation({ onSuccess, onClose })

  const lessonSchema = useMemo(() => lessonInsertSchemaForQuarters(quarters), [quarters])

  const form = useAppForm({
    defaultValues: emptyDefaults(),
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: lessonSchema,
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

  return (
    <Modal onClose={onClose} title="New Lesson">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        <ErrorAlert error={lessonErrorMessage(mutationError)} action="Saving lesson" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form.AppField
            name="classTypeId"
            listeners={{
              onChange: ({ value }) => {
                form.setFieldValue('sessions', (sessions) => sessionsForLessonType(sessions, value))
              },
            }}
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

          <LessonSessionsField form={form} quarters={quarters} />

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
            name="description"
            children={(field) => (
              <field.TextAreaField
                label="Description"
                className="md:col-span-2"
                tooltip="Supports [links](https://example.com), **bold**, *italics*, and ~~strikethrough~~"
              />
            )}
          />

          <form.AppField
            name="requirements"
            children={(field) => <field.TextField label="Requirements (optional)" />}
          />
          <LessonSizeField form={form} />
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
