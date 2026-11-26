import { LESSON_LOCATION_PRESETS, WINDSURFING_TYPE_ID } from '@/db/constants'
import {
  sameLessonLocation,
  type LessonInsert,
  type LessonLocation,
} from '@/domains/lessons/schema'
import { withForm } from '@/hooks/form'
import { useId, useRef } from 'react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const OTHER = 'Other'
const presets = LESSON_LOCATION_PRESETS.map(({ name, url }) => ({
  location: name,
  locationUrl: url,
}))

export function lessonTypeLocation(typeId: number): LessonLocation {
  return presets.find((p) => p.location === (typeId === WINDSURFING_TYPE_ID ? 'SSP' : 'WAC'))!
}

function changeSessionLocation(
  sessions: LessonInsert['sessions'],
  index: number,
  location: Partial<LessonLocation>,
  copyToAll: boolean,
): LessonInsert['sessions'] {
  return sessions.map((session, i) =>
    i === index || copyToAll ? { ...session, ...location } : session,
  )
}

function allShareFirstLocation(sessions: LessonInsert['sessions']): boolean {
  return sessions.every((session) => sameLessonLocation(sessions[0], session))
}

export function sessionsForLessonType(sessions: LessonInsert['sessions'], typeId: number) {
  const first = sessions[0]
  if (!first || !presets.some((preset) => sameLessonLocation(preset, first))) return sessions
  return changeSessionLocation(
    sessions,
    0,
    lessonTypeLocation(typeId),
    allShareFirstLocation(sessions),
  )
}

const locationFieldDefaults: LessonInsert = {
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

export const LessonLocationField = withForm({
  defaultValues: locationFieldDefaults,
  props: { index: 0 },
  render: function LessonLocationRender({ form, index }) {
    const id = useId()
    const canCopyCustomLocation = useRef(true)
    const update = (location: Partial<LessonLocation>, isPreset = false) => {
      const sessions = form.getFieldValue('sessions')
      const copyToAll =
        index === 0 && canCopyCustomLocation.current && allShareFirstLocation(sessions)
      // Clearing a preset to enter a custom venue can briefly match another session's blank value.
      canCopyCustomLocation.current = isPreset || copyToAll
      form.setFieldValue('sessions', changeSessionLocation(sessions, index, location, copyToAll))
    }

    return (
      <form.Subscribe selector={(state) => state.values.sessions[index]}>
        {(session) => {
          if (!session) return null
          const preset = presets.find((p) => sameLessonLocation(p, session))
          const selectValue = preset?.location ?? OTHER

          return (
            <div className="mt-2">
              <Label htmlFor={id} className="mb-1">
                Location
              </Label>
              <Select
                value={selectValue}
                onValueChange={(value) => {
                  const next = presets.find((p) => p.location === value)
                  update(next ?? { location: '', locationUrl: '' }, Boolean(next))
                }}
              >
                <SelectTrigger id={id}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presets.map(({ location }) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>

              {selectValue === OTHER && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1" htmlFor={`${id}-name`}>
                      Location name
                    </Label>
                    <Input
                      id={`${id}-name`}
                      value={session.location}
                      maxLength={80}
                      onChange={(event) => update({ location: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="mb-1" htmlFor={`${id}-url`}>
                      URL (optional)
                    </Label>
                    <Input
                      id={`${id}-url`}
                      value={session.locationUrl}
                      maxLength={255}
                      onChange={(event) => update({ locationUrl: event.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        }}
      </form.Subscribe>
    )
  },
})
