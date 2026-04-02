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
    <div style={styles.container}>
      {sections.map((section, i) => (
        <div key={section.label}>
          {i > 0 && <hr style={styles.hr} />}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>{section.label}</h2>
            {SECTION_DESCRIPTIONS[section.label] && (
              <p style={styles.sectionDesc}>{SECTION_DESCRIPTIONS[section.label]}</p>
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
    <div style={styles.card}>
      <table style={styles.cardTable}>
        <tbody>
          <tr>
            {/* Left column: title, day/dates, time */}
            <td style={{ ...styles.cardCell, width: '35%' }}>
              <div style={styles.className}>{lesson.subtype}</div>
              <div style={styles.classInfo}>
                {lesson.day} {lesson.dates}
              </div>
              {lesson.time && <div style={styles.classInfo}>{lesson.time}</div>}
            </td>

            {/* Instructor column */}
            <td style={{ ...styles.cardCell, width: '20%' }}>
              <div style={styles.classInfo}>
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
            </td>

            {/* Size / enrolled column */}
            <td style={{ ...styles.cardCell, width: '20%' }}>
              <div style={styles.classInfo}>
                {lesson.size > 0 && (
                  <>
                    Class size: {lesson.size}
                    <br />
                  </>
                )}
                Enrolled: {enrolledCount}
              </div>
            </td>

            {/* Enroll button column */}
            <td style={{ ...styles.cardCell, width: '25%', textAlign: 'center' }}>
              <EnrollAction lessonIndex={lesson.index} isFull={isFull} />
            </td>
          </tr>
        </tbody>
      </table>
      {lesson.comments && <div style={styles.comments}>{lesson.comments}</div>}
    </div>
  )
}

function EnrollAction({ lessonIndex, isFull }: { lessonIndex: number; isFull: boolean }) {
  const href = `/signup/${lessonIndex}`

  if (isFull) {
    return (
      <div style={styles.classInfo}>
        <span>Class Full</span>
        <br />
        <a href={href} target="_blank" rel="noopener noreferrer" style={styles.link}>
          Join Waitlist
        </a>
      </div>
    )
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <span style={styles.enrollButton}>Enroll</span>
    </a>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'Verdana, Geneva, sans-serif',
    maxWidth: 900,
    margin: '0 auto',
    padding: '10px 16px',
    color: '#444',
    fontSize: 14,
  },
  empty: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  hr: {
    border: 'none',
    borderTop: '1px solid #b0c4d8',
    margin: '24px 0',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3c0f53',
    margin: '0 0 8px 0',
    fontFamily: 'Verdana, Geneva, sans-serif',
  },
  sectionDesc: {
    fontSize: 14,
    color: '#444',
    margin: '0 0 16px 0',
    lineHeight: 1.5,
  },
  card: {
    backgroundColor: '#E8F6FB',
    border: '1px solid #C0C0C0',
    borderRadius: 2,
    marginBottom: 16,
    padding: 0,
  },
  cardTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  cardCell: {
    padding: '10px 12px',
    verticalAlign: 'top',
  },
  className: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#444',
    marginBottom: 4,
  },
  classInfo: {
    fontSize: 13,
    color: '#444',
    lineHeight: 1.5,
  },
  comments: {
    fontSize: 13,
    color: '#444',
    padding: '4px 20px 10px 20px',
    lineHeight: 1.5,
  },
  link: {
    color: '#00859b',
    textDecoration: 'underline',
  },
  enrollButton: {
    display: 'inline-block',
    padding: '6px 20px',
    border: '2px solid #00859b',
    borderRadius: 4,
    color: '#00859b',
    fontWeight: 'bold',
    fontSize: 14,
    cursor: 'pointer',
  },
}
