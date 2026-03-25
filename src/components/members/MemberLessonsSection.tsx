import {
  getMemberLessonsSignedUpQueryOptions,
  getMemberLessonsTaughtQueryOptions,
} from '@/lib/members-query-options'
import { useSuspenseQuery } from '@tanstack/react-query'

type LessonQueryOptions =
  | ReturnType<typeof getMemberLessonsTaughtQueryOptions>
  | ReturnType<typeof getMemberLessonsSignedUpQueryOptions>

export function MemberLessonsSection({
  title,
  queryOptions,
}: {
  title: string
  queryOptions: LessonQueryOptions
}) {
  const { data: lessons } = useSuspenseQuery(queryOptions)

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {lessons.length === 0 ? (
        <p className="text-muted-foreground">None found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Class</th>
              <th className="text-left py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => (
              <tr key={lesson.index} className="border-b">
                <td className="py-2">{lesson.subtype || lesson.type}</td>
                <td className="py-2">{lesson.calendarDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
