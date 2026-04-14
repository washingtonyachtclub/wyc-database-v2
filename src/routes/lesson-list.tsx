import { createFileRoute } from '@tanstack/react-router'
import { LESSON_CATEGORIES } from '../db/constants'
import type { RichLesson } from '@/domains/lessons/schema'
import { getPublicLessons } from '@/domains/lessons/server-fns'

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
    const catLessons = cat.typeIds.flatMap((id) => lessonsByType.get(id) ?? [])
    return { label: cat.label, lessons: catLessons }
  })

  // Active categories first (in definition order), then empty (in definition order)
  const sections = [
    ...allSections.filter((s) => s.lessons.length > 0),
    ...allSections.filter((s) => s.lessons.length === 0),
  ]

  return (
    <div className="mx-auto max-w-[900px] px-4 py-2.5 font-[Verdana,Geneva,sans-serif] text-sm text-[#444]">
      {sections.map((section, i) => (
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
            {section.lessons.map((entry) => (
              <LessonCard key={entry.lesson.index} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
function LessonCard({ entry }: { entry: PublicLesson }) {
  const { lesson, enrolledCount } = entry
  const isFull = lesson.size > 0 && enrolledCount >= lesson.size
  const hasTwo = !!lesson.instructor2Name

  return (
    <div className="mb-4 rounded-sm border border-[#C0C0C0] bg-[#E8F6FB]">
      {/* Desktop: single row, Mobile: stacked */}
      <div className="flex flex-col md:flex-row md:items-start">
        {/* Title, day/dates, time */}
        <div className="px-3 pt-2.5 pb-1 md:w-[35%] md:py-2.5">
          <div className="mb-1 text-base font-bold text-[#444]">{lesson.subtype}</div>
          <div className="text-[13px] leading-relaxed text-[#444]">
            {lesson.day} {lesson.dates}
          </div>
          {lesson.time && (
            <div className="text-[13px] leading-relaxed text-[#444]">{lesson.time}</div>
          )}
        </div>

        {/* Instructor + Size: side by side on mobile, separate columns on desktop */}
        <div className="flex flex-row md:w-[40%] md:flex-row">
          <div className="w-1/2 px-3 pt-1 pb-1 md:w-1/2 md:py-2.5">
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

          <div className="w-1/2 px-3 pt-1 pb-1 md:w-1/2 md:py-2.5">
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

      {lesson.comments && (
        <div className="px-5 pt-1 pb-2.5 text-[13px] leading-relaxed text-[#444]">
          {lesson.comments}
        </div>
      )}
    </div>
  )
}

function EnrollAction({ lessonIndex, isFull }: { lessonIndex: number; isFull: boolean }) {
  const href = `/signup/${lessonIndex}`

  if (isFull) {
    return (
      <div className="text-[13px] leading-relaxed text-[#444]">
        <span>Class Full</span>
        <br />
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00859b] underline"
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
