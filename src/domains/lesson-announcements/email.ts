import { escapeHtml } from '@/lib/emails/html'
import { PUBLIC_APP_ORIGIN } from '@/lib/urls'
import { lessonScheduleEmailLines } from '@/lib/emails/lessons'
import type { RichLesson } from '@/domains/lessons/schema'
import { lessonAnnouncementMarkdownToHtml } from './markdown'

export function lessonPageUrl(lessonId: number): string {
  return `${PUBLIC_APP_ORIGIN}/lessons/${lessonId}`
}

export async function lessonAnnouncementEmail(
  lesson: RichLesson,
  subject: string,
  bodyMarkdown: string,
) {
  const url = lessonPageUrl(lesson.index)
  const lessonTitle = `${lesson.type} - ${lesson.subtype}`
  const details = [lessonTitle, ...lessonScheduleEmailLines(lesson.sessions, 'text')].join('\n')
  const detailsHtml = [
    escapeHtml(lessonTitle),
    ...lessonScheduleEmailLines(lesson.sessions, 'html'),
  ].join('\n')
  const bodyHtml = await lessonAnnouncementMarkdownToHtml(bodyMarkdown)

  return {
    text: `${details}\n\n${bodyMarkdown}\n\nView this announcement on the lesson page:\n${url}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:680px;margin:0 auto">
  <h1 style="font-size:22px;margin-bottom:8px">${escapeHtml(subject)}</h1>
  <p style="color:#4b5563;margin-top:0;white-space:pre-line">${detailsHtml}</p>
  <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0" />
  <div>${bodyHtml}</div>
  <p style="margin-top:24px"><a href="${url}">View this announcement on the lesson page</a></p>
</div>`,
  }
}
