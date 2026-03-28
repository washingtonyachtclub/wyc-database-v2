import type { ReactNode } from 'react'
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
  action,
}: {
  title: string
  queryOptions: LessonQueryOptions
  action?: ReactNode
}) {
  const { data: lessons } = useSuspenseQuery(queryOptions)

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {action}
      </div>
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
