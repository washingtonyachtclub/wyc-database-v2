import { createFileRoute } from '@tanstack/react-router'
import { MapPin } from 'lucide-react'
import { useState } from 'react'
import { LESSON_CATEGORIES } from '../db/constants'
import { formatSession } from '@/domains/lessons/format-sessions'
import { dateOf, type RichLesson } from '@/domains/lessons/schema'
import { getPublicLessons } from '@/domains/lessons/server-fns'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RichText } from '@/components/ui/RichText'
import { getNowPacificDateTimeString } from '@/lib/date-utils'

export const Route = createFileRoute('/lesson-list')({
  loader: () => getPublicLessons(),
  component: LessonListPage,
})

type PublicLesson = {
  lesson: RichLesson
  enrolledCount: number
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  'Novice Dinghy':
    'A novice lesson teaches novice skills for our Beginner boats. Please read through the Sailing Guide on the website and finish Novice Written Test before class begins (though it is not required).',
  Advanced:
    'Advanced dinghy and catamaran lessons! Please check to make sure you have the required rating before enrolling.',
  Keelboat: 'Keelboat clinics and classes for learning to sail our keelboat fleet.',
  Specialty:
    'These lessons focus on miscellaneous sailing skills. Pay attention to the class requirements and prerequisites.',
  Windsurfing: 'Windsurfing lessons at Sail Sand Point in Magnuson Park',
  'Dinghy Sailing': 'Sign up for all of our Dinghy Sailing events.',
  'Work Parties': 'Work parties help maintain our fleet and facilities.',
  'Social Events': 'Events and gatherings for WYC members.',
}

function isLessonFull(entry: PublicLesson) {
  return entry.lesson.size > 0 && entry.enrolledCount >= entry.lesson.size
}

function LessonListPage() {
  const lessons = Route.useLoaderData()

  const lessonsByType = new Map<number, PublicLesson[]>()
  for (const entry of lessons) {
    const typeId = entry.lesson.classTypeId
    const arr = lessonsByType.get(typeId) ?? []
    arr.push(entry)
    lessonsByType.set(typeId, arr)
  }

  const allSections = LESSON_CATEGORIES.map((cat) => {
    const catLessons = cat.typeIds
      .flatMap((id) => lessonsByType.get(id) ?? [])
      .sort((a, b) => a.lesson.calendarDate.localeCompare(b.lesson.calendarDate))
    return { label: cat.label, lessons: catLessons }
  })

  const hasOpen = (s: { lessons: PublicLesson[] }) => s.lessons.some((e) => !isLessonFull(e))
  const sections = [
    ...allSections.filter((s) => s.lessons.length > 0 && hasOpen(s)),
    ...allSections.filter((s) => s.lessons.length > 0 && !hasOpen(s)),
    ...allSections.filter((s) => s.lessons.length === 0),
  ]

  return (
    <div className="mx-auto max-w-[900px] px-4 py-2.5 font-[Verdana,Geneva,sans-serif] text-sm text-[#444]">
      {sections.map((section, i) => {
        const openLessons = section.lessons.filter((e) => !isLessonFull(e))
        const fullLessons = section.lessons.filter(isLessonFull)

        return (
          <div key={section.label}>
            {i > 0 && <hr className="my-6 border-t border-[#b0c4d8]" />}
            <div className="mb-2">
              <h2 className="mb-2 font-[Verdana,Geneva,sans-serif] text-2xl font-bold text-[#3c0f53]">
                {section.label}
              </h2>
              {SECTION_DESCRIPTIONS[section.label] && (
                <p className="mb-4 text-sm leading-relaxed text-[#444]">
                  {SECTION_DESCRIPTIONS[section.label]}
                </p>
              )}

              {openLessons.map((entry) => (
                <LessonCard key={entry.lesson.index} entry={entry} />
              ))}
              {fullLessons.map((entry) => (
                <LessonCard key={entry.lesson.index} entry={entry} muted />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LessonCard({ entry, muted }: { entry: PublicLesson; muted?: boolean }) {
  const { lesson, enrolledCount } = entry
  const isFull = isLessonFull(entry)
  const hasTwo = !!lesson.instructor2Name
  const [showAllSessions, setShowAllSessions] = useState(false)
  const orderedSessions = [...lesson.sessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const hasLongSchedule = orderedSessions.length > 3
  const now = getNowPacificDateTimeString()
  const upcomingSessions = orderedSessions.filter((session) =>
    session.allDay ? dateOf(session.endsAt) >= dateOf(now) : session.endsAt >= now,
  )
  const compactSessions = hasLongSchedule ? upcomingSessions.slice(0, 2) : orderedSessions
  const scheduleId = `lesson-sessions-${lesson.index}`

  return (
    <div
      className={cn(
        'mb-4 rounded-sm border border-[#C0C0C0] bg-[#E8F6FB]',
        muted && 'border-[#d8d8d8] bg-[#f2f2f2] opacity-80',
      )}
    >
      {/* Desktop: single row, Mobile: stacked */}
      <div className="flex flex-col md:flex-row md:items-start">
        {/* Title, day/dates, time */}
        <div className="px-3 pt-2.5 pb-1 md:w-[35%] md:py-2.5">
          <div className="mb-1 text-base font-bold text-[#444]">{lesson.subtype}</div>
          {!showAllSessions && (
            <>
              {compactSessions.length > 0 ? (
                compactSessions.map((session) => (
                  <div key={session.index} className="text-[13px] leading-relaxed text-[#444]">
                    {formatSession(session)}
                  </div>
                ))
              ) : (
                <div className="text-[13px] leading-relaxed text-[#444]">No upcoming sessions</div>
              )}
              {hasLongSchedule && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-[13px] font-bold text-[#00859b]"
                  aria-expanded={false}
                  aria-controls={scheduleId}
                  onClick={() => setShowAllSessions(true)}
                >
                  View all {orderedSessions.length} dates
                </Button>
              )}
            </>
          )}
        </div>

        {/* Instructor + Location + Size: side by side on mobile, separate columns on desktop */}
        <div className="flex flex-row md:w-[40%] md:flex-row">
          <div className="flex-1 px-3 pt-1 pb-1 md:py-2.5">
            <div className="text-[13px] leading-relaxed text-[#444]">
              {hasTwo ? 'Instructors:' : 'Instructor:'}
              <br />
              {lesson.instructor1Name}
              {hasTwo && (
                <>
                  <br />
                  {lesson.instructor2Name}
                </>
              )}
            </div>
          </div>

          {lesson.location && (
            <div className="flex-1 px-3 pt-1 pb-1 md:py-2.5">
              <div className="flex items-start gap-1 text-[13px] leading-relaxed text-[#444]">
                <MapPin className="mt-[3px] h-3.5 w-3.5 shrink-0" />
                {lesson.locationUrl ? (
                  <a
                    href={lesson.locationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#00859b] underline"
                  >
                    {lesson.location}
                  </a>
                ) : (
                  <span>{lesson.location}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 px-3 pt-1 pb-1 md:py-2.5">
            <div className="text-[13px] leading-relaxed text-[#444]">
              {lesson.size > 0 && (
                <>
                  Class size: {lesson.size}
                  <br />
                </>
              )}
              Enrolled: {enrolledCount}
            </div>
          </div>
        </div>

        {/* Enroll button */}
        <div className="px-3 pt-1 pb-2.5 md:flex md:w-[25%] md:items-center md:justify-center md:py-2.5">
          <EnrollAction lessonIndex={lesson.index} isFull={isFull} />
        </div>
      </div>

      {showAllSessions && (
        <div
          id={scheduleId}
          className="grid grid-cols-1 gap-x-6 gap-y-0.5 border-t border-[#C0C0C0] px-3 py-2.5 sm:grid-cols-2 md:grid-cols-4"
        >
          {orderedSessions.map((session) => (
            <div key={session.index} className="text-[13px] leading-relaxed text-[#444]">
              {formatSession(session)}
            </div>
          ))}
        </div>
      )}

      {lesson.description && (
        <div className="px-5 pt-1 pb-2.5 text-[13px] leading-relaxed text-[#444]">
          <RichText text={lesson.description} />
        </div>
      )}

      {lesson.requirements && (
        <div className="px-5 pt-2 pb-2.5 text-[13px] leading-relaxed text-[#444]">
          <span className="font-bold">Requirements: </span>
          {lesson.requirements}
        </div>
      )}
    </div>
  )
}

function EnrollAction({ lessonIndex, isFull }: { lessonIndex: number; isFull: boolean }) {
  const href = `https://database.washingtonyachtclub.org/signup/${lessonIndex}`

  if (isFull) {
    return (
      <div className="text-[13px] leading-relaxed text-[#444]">
        <span>Class Full</span>
        <br />
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#00859b] underline"
        >
          Join Waitlist
        </a>
      </div>
    )
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="no-underline">
      <span className="inline-block cursor-pointer rounded border-2 border-[#00859b] px-5 py-1.5 text-sm font-bold text-[#00859b]">
        Enroll
      </span>
    </a>
  )
}
