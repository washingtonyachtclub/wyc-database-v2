import { formatLessonSchedule, NO_SESSION_LOCATION } from '@/domains/lessons/format-sessions'
import type { LessonLocation, LessonSession } from '@/domains/lessons/schema'
import { MapPin } from 'lucide-react'

export function LessonLocationName({
  venue,
  linkClassName = 'underline',
  linkLocations = true,
}: {
  venue: LessonLocation
  linkClassName?: string
  linkLocations?: boolean
}) {
  const { location, locationUrl } = venue
  if (!location) return NO_SESSION_LOCATION

  if (linkLocations && locationUrl) {
    return (
      <a
        href={locationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {location}
      </a>
    )
  }
  return location
}

export function LessonSchedule({
  sessions,
  dateClassName,
  linkLocations,
}: {
  sessions: LessonSession[]
  dateClassName?: string
  linkLocations?: boolean
}) {
  const { lines, sharedLocation } = formatLessonSchedule(sessions)

  return (
    <>
      {lines.map(({ date, venue }, index) => (
        <div key={index}>
          <span className={dateClassName}>{date}</span>
          {venue && (
            <>
              {' · '}
              <LessonLocationName venue={venue} linkLocations={linkLocations} />
            </>
          )}
        </div>
      ))}
      {sharedLocation?.location && (
        <div className="flex items-start gap-1">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-label="Location" />
          <LessonLocationName venue={sharedLocation} linkLocations={linkLocations} />
        </div>
      )}
    </>
  )
}
