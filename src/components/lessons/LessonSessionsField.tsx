import { Plus, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import type { LessonInsert } from '@/domains/lessons/schema'
import { emptySessionInput } from '@/domains/lessons/schema'
import { withForm } from '@/hooks/form'

const lessonSessionsDefaults: LessonInsert = {
  classTypeId: 1,
  subtype: '',
  sessions: [],
  instructor1: 0,
  instructor2: null,
  comments: '',
  location: '',
  locationUrl: '',
  size: 0,
  expire: 0,
  display: true,
}

export const LessonSessionsField = withForm({
  defaultValues: lessonSessionsDefaults,
  render: function LessonSessionsRender({ form }) {
    return (
      <form.AppField name="sessions" mode="array">
        {(sessionsField) => (
          <div className="md:col-span-2">
            <Label className="mb-1">Sessions *</Label>
            <div className="space-y-2">
              {sessionsField.state.value.map((_, i) => (
                <div key={i} className="rounded-md border p-3">
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
                      <div className="flex items-start gap-2">
                        <form.AppField name={`sessions[${i}].date`}>
                          {(field) => (
                            <field.TextField
                              label={multiDay ? 'Start date' : 'Date'}
                              type="date"
                              className="flex-1"
                            />
                          )}
                        </form.AppField>

                        {multiDay && (
                          <form.AppField name={`sessions[${i}].endDate`}>
                            {(field) => (
                              <field.TextField label="End date" type="date" className="flex-1" />
                            )}
                          </form.AppField>
                        )}

                        {!allDay && (
                          <>
                            <form.AppField name={`sessions[${i}].startTime`}>
                              {(field) => (
                                <field.TextField label="Start" type="time" className="flex-1" />
                              )}
                            </form.AppField>
                            <form.AppField name={`sessions[${i}].endTime`}>
                              {(field) => (
                                <field.TextField label="End" type="time" className="flex-1" />
                              )}
                            </form.AppField>
                          </>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="Remove session"
                          className="mt-6 h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
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
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => sessionsField.pushValue({ ...emptySessionInput })}
            >
              <Plus className="h-4 w-4" />
              Add day
            </Button>

            {sessionsField.state.meta.errors[0] && (
              <p className="text-sm text-destructive mt-1">{sessionsField.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      </form.AppField>
    )
  },
})
