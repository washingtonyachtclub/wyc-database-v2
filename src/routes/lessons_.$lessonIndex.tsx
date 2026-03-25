import { TBD_WYC_NUMBER } from '@/db/constants'
import type { LessonInsert, RichLesson } from '@/db/lesson-schema'
import { lessonInsertSchema } from '@/db/lesson-schema'
import { useAppForm } from '@/hooks/form'
import {
  getClassTypesQueryOptions,
  getLessonByIdQueryOptions,
  useUpdateLessonMutation,
} from '@/lib/lessons-query-options'
import { getQuartersQueryOptions } from '@/lib/members-query-options'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { Label } from '../components/ui/label'
import { MemberCombobox } from '../components/ui/MemberCombobox'

export const Route = createFileRoute('/lessons_/$lessonIndex')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: '/lessons' },
      })
    }
  },
  component: LessonDetailPage,
})

function lessonToDefaults(lesson: RichLesson): LessonInsert {
  return {
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
}

function LessonDetailPage() {
  const { lessonIndex } = Route.useParams()
  const { data: lessonDetails } = useSuspenseQuery(getLessonByIdQueryOptions(Number(lessonIndex)))

  if (!lessonDetails) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">Lesson not found.</p>
      </div>
    )
  }

  const { lesson, lessonStudents } = lessonDetails

  return (
    <div className="p-4 space-y-8">
      <h1 className="text-2xl font-bold">
        {lesson.type} — {lesson.subtype}
      </h1>

      <LessonEditForm lesson={lesson} />

      <section>
        <h2 className="text-lg font-semibold mb-2">
          Students ({lessonStudents.length})
        </h2>
        {lessonStudents.length === 0 ? (
          <p className="text-muted-foreground">No students enrolled.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-md border border-border p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Names</h3>
              <div className="space-y-1">
                {lessonStudents.map((student) => (
                  <div key={student.wycNumber} className="text-sm">
                    {student.first} {student.last}
                  </div>
                ))}
              </div>
            </div>

            <EmailCopyBox emails={lessonStudents.map((s) => s.email).filter(Boolean)} />
          </div>
        )}
      </section>
    </div>
  )
}

function LessonEditForm({ lesson }: { lesson: RichLesson }) {
  const { data: quarters = [] } = useQuery(getQuartersQueryOptions())
  const { data: classTypes = [] } = useQuery(getClassTypesQueryOptions())
  const [saveMessage, setSaveMessage] = useState('')

  const updateMutation = useUpdateLessonMutation({
    onSuccess: () => setSaveMessage('Lesson saved.'),
    onClose: () => {},
  })

  const form = useAppForm({
    defaultValues: lessonToDefaults(lesson),
    validators: {
      onSubmit: lessonInsertSchema,
    },
    onSubmit: async ({ value }) => {
      setSaveMessage('')
      await updateMutation.mutateAsync({ data: { index: lesson.index, ...value } })
    },
  })

  const mutationError = updateMutation.error?.message

  const classTypeOptions = classTypes.map((ct) => ({
    value: ct.index,
    label: ct.text ?? `Type ${ct.index}`,
  }))

  const quarterOptions = quarters.map((q) => ({
    value: q.index,
    label: q.school || q.text || `Quarter ${q.index}`,
  }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      {mutationError && (
        <div className="rounded-md bg-destructive/10 p-4 border border-destructive">
          <div className="text-sm text-destructive">{mutationError}</div>
        </div>
      )}

      {saveMessage && (
        <div className="rounded-md bg-green-500/10 p-4 border border-green-500">
          <div className="text-sm text-green-700">{saveMessage}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form.AppField
          name="classTypeId"
          children={(field) => (
            <field.SelectField label="Type" placeholder="Select type" options={classTypeOptions} />
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
            <field.TextField label="Dates" required placeholder="March 7th, March 14th" />
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

        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
            children={(field) => (
              <div className="flex items-center gap-2 h-9">
                <Checkbox
                  id="display"
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked === true)}
                />
                <Label htmlFor="display">Display (show on website)</Label>
              </div>
            )}
          />
        </div>
      </div>

      <div className="flex justify-start gap-2 pt-4 border-t">
        <form.AppForm>
          <form.SubmitButton label="Update Lesson" submittingLabel="Saving..." />
        </form.AppForm>
      </div>
    </form>
  )
}

function EmailCopyBox({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false)
  const emailText = emails.join('\n')

  function handleCopy() {
    navigator.clipboard.writeText(emailText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">Emails</h3>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy All'}
        </Button>
      </div>
      <pre className="text-sm whitespace-pre-wrap break-all">{emailText}</pre>
    </div>
  )
}
