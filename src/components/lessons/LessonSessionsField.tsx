import { lessonErrorMessage } from '@/components/lessons/lesson-error-message'
import { Plus, X } from 'lucide-react'
import { LessonLocationField, lessonTypeLocation } from './LessonLocationField'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import type { LessonInsert } from '@/domains/lessons/schema'
import { resolveLessonQuarter, type QuarterDates } from '@/domains/lessons/quarter-rules'
import { lastSessionDate, emptySessionInput } from '@/domains/lessons/schema'
import { withForm } from '@/hooks/form'

const lessonSessionsDefaults: LessonInsert = {
  classTypeId: 1,
  subtype: '',
  sessions: [],
  instructor1: 0,
  instructor2: null,
  description: '',
  requirements: '',
  size: 1,
  unlimitedSize: false,
}

export const LessonSessionsField = withForm({
  defaultValues: lessonSessionsDefaults,
  props: { quarters: [] as QuarterDates[] },
  render: function LessonSessionsRender({ form, quarters }) {
    return (
      <form.AppField name="sessions" mode="array">
        {(sessionsField) => (
          <div className="md:col-span-2">
            <Label className="mb-1">Sessions *</Label>
            <div className="space-y-2">
              {sessionsField.state.value.map((_, i) => (
                <div key={i} className="relative rounded-md border p-3">
                  {/*
                    An array field only subscribes to the array's length, so it won't
                    re-render when a checkbox in one of its rows flips. Which inputs a
                    row shows has to come off the store directly.
                  */}
                  <form.Subscribe
                    selector={(state) => ({
                      allDay: state.values.sessions[i]?.allDay ?? false,
                      multiDay: state.values.sessions[i]?.multiDay ?? false,
                    })}
                  >
                    {({ allDay, multiDay }) => (
                      <div className="grid grid-cols-1 gap-2 pr-10 sm:grid-cols-2">
                        <form.AppField name={`sessions[${i}].date`}>
                          {(field) => (
                            <field.TextField
                              label={multiDay ? 'Start date' : 'Date'}
                              type="date"
                              className={multiDay ? undefined : 'sm:col-span-2'}
                            />
                          )}
                        </form.AppField>

                        {multiDay && (
                          <form.AppField name={`sessions[${i}].endDate`}>
                            {(field) => <field.TextField label="End date" type="date" />}
                          </form.AppField>
                        )}

                        {!allDay && (
                          <>
                            <form.AppField name={`sessions[${i}].startTime`}>
                              {(field) => <field.TextField label="Start" type="time" />}
                            </form.AppField>
                            <form.AppField name={`sessions[${i}].endTime`}>
                              {(field) => <field.TextField label="End" type="time" />}
                            </form.AppField>
                          </>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="Remove session"
                          className="absolute right-3 top-3 h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => sessionsField.removeValue(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </form.Subscribe>

                  <div className="flex gap-4 mt-2">
                    <form.AppField name={`sessions[${i}].allDay`}>
                      {(field) => <field.CheckboxField label="All day" />}
                    </form.AppField>
                    <form.AppField
                      name={`sessions[${i}].multiDay`}
                      listeners={{
                        // Seed the revealed input so it doesn't open on a required-field error.
                        onChange: ({ value }) => {
                          if (!value) return
                          const start = form.getFieldValue(`sessions[${i}].date`)
                          const end = form.getFieldValue(`sessions[${i}].endDate`)
                          if (!end || end < start) {
                            form.setFieldValue(`sessions[${i}].endDate`, start)
                          }
                        },
                      }}
                    >
                      {(field) => <field.CheckboxField label="Ends on another day" />}
                    </form.AppField>
                  </div>
                  <LessonLocationField form={form} index={i} />
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                const first = form.getFieldValue('sessions')[0]
                const { location, locationUrl } =
                  first ?? lessonTypeLocation(form.getFieldValue('classTypeId'))
                sessionsField.pushValue({ ...emptySessionInput, location, locationUrl })
              }}
            >
              <Plus className="h-4 w-4" />
              Add day
            </Button>

            <form.Subscribe selector={(state) => lastSessionDate(state.values.sessions)}>
              {(day) => {
                if (!day) return null
                const { quarter, error } = resolveLessonQuarter(day, quarters)
                return (
                  <p
                    aria-live="polite"
                    className={
                      error ? 'mt-2 text-sm text-destructive' : 'mt-2 text-sm text-muted-foreground'
                    }
                  >
                    {quarter ? `Membership quarter · ${quarter.school}` : lessonErrorMessage(error)}
                  </p>
                )
              }}
            </form.Subscribe>
            {sessionsField.state.value.length === 0 &&
              sessionsField.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive mt-1">At least one session is required</p>
              )}
          </div>
        )}
      </form.AppField>
    )
  },
})
