import { LESSON_LOCATION_PRESETS, WINDSURFING_TYPE_ID } from '@/db/constants'
import type { LessonInsert } from '@/domains/lessons/schema'
import { withForm } from '@/hooks/form'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const OTHER = 'Other'

const SSP = LESSON_LOCATION_PRESETS.find((p) => p.name === 'SSP')!
const WAC = LESSON_LOCATION_PRESETS.find((p) => p.name === 'WAC')!

/**
 * The preset a class type defaults to (SSP for windsurfing, WAC otherwise), but only while
 * the location is still an untouched preset — a custom location is left alone.
 */
export function typeLocationDefault(
  typeId: number,
  currentLocation: string,
): { name: string; url: string } | null {
  const isPreset = LESSON_LOCATION_PRESETS.some((p) => p.name === currentLocation)
  if (!isPreset) return null
  return typeId === WINDSURFING_TYPE_ID ? SSP : WAC
}

const locationFieldDefaults: LessonInsert = {
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

export const LessonLocationField = withForm({
  defaultValues: locationFieldDefaults,
  render: function LessonLocationRender({ form }) {
    return (
      <form.Subscribe selector={(state) => state.values.location}>
        {(location) => {
          const preset = LESSON_LOCATION_PRESETS.find((p) => p.name === location)
          const selectValue = preset ? preset.name : OTHER

          return (
            <div>
              <Label className="mb-1">Location</Label>
              <Select
                value={selectValue}
                onValueChange={(value) => {
                  const next = LESSON_LOCATION_PRESETS.find((p) => p.name === value)
                  form.setFieldValue('location', next?.name ?? '')
                  form.setFieldValue('locationUrl', next?.url ?? '')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LESSON_LOCATION_PRESETS.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>

              {selectValue === OTHER && (
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <form.AppField name="location">
                    {(field) => <field.TextField label="Location name" />}
                  </form.AppField>
                  <form.AppField name="locationUrl">
                    {(field) => <field.TextField label="URL (optional)" />}
                  </form.AppField>
                </div>
              )}
            </div>
          )
        }}
      </form.Subscribe>
    )
  },
})
