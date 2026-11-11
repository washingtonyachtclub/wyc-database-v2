import { TBD_WYC_NUMBER } from '@/db/constants'
import { hasPrivilege, type Privilege } from './permissions'

type Actor = { userId?: number; privileges?: readonly Privilege[] }
type LessonInstructors = { instructor1: number | null; instructor2: number | null }
type RatingOwnership = { examiner: number | null; enteredBy: number | null }

export function canManageLesson(actor: Actor, lesson: LessonInstructors): boolean {
  if (!actor.userId) return false
  return (
    hasPrivilege(actor.privileges ?? [], ['db']) ||
    (actor.userId !== TBD_WYC_NUMBER &&
      (lesson.instructor1 === actor.userId || lesson.instructor2 === actor.userId))
  )
}

export function canManageRating(actor: Actor, rating: RatingOwnership): boolean {
  if (!actor.userId) return false
  return (
    hasPrivilege(actor.privileges ?? [], ['db']) ||
    rating.examiner === actor.userId ||
    rating.enteredBy === actor.userId
  )
}
