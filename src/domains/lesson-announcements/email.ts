import { formatSessions } from '@/domains/lessons/format-sessions'
import type { RichLesson } from '@/domains/lessons/schema'
import { lessonAnnouncementMarkdownToHtml } from './markdown'

const APP_ORIGIN = 'https://database.washingtonyachtclub.org'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function lessonPageUrl(lessonId: number): string {
  return `${APP_ORIGIN}/lessons/${lessonId}`
}

export async function lessonAnnouncementEmail(
  lesson: RichLesson,
  subject: string,
  bodyMarkdown: string,
) {
  const url = lessonPageUrl(lesson.index)
  const sessions = formatSessions(lesson.sessions)
  const lessonTitle = `${lesson.type} - ${lesson.subtype}`
  const details = [lessonTitle, ...sessions, lesson.location].filter(Boolean).join('\n')
  const bodyHtml = await lessonAnnouncementMarkdownToHtml(bodyMarkdown)

  return {
    text: `${details}\n\n${bodyMarkdown}\n\nView this announcement on the lesson page:\n${url}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:680px;margin:0 auto">
  <h1 style="font-size:22px;margin-bottom:8px">${escapeHtml(subject)}</h1>
  <p style="color:#4b5563;margin-top:0;white-space:pre-line">${escapeHtml(details)}</p>
  <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0" />
  <div>${bodyHtml}</div>
  <p style="margin-top:24px"><a href="${url}">View this announcement on the lesson page</a></p>
</div>`,
  }
}
