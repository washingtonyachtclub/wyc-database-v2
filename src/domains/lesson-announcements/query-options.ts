import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteLessonAnnouncement,
  getLessonAnnouncements,
  getMemberLessonPage,
  postLessonAnnouncement,
} from './server-fns'

export const getLessonAnnouncementsQueryOptions = (lessonId: number) =>
  queryOptions({
    queryKey: ['lesson-announcements', lessonId],
    queryFn: () => getLessonAnnouncements({ data: { lessonId } }),
  })

export const getMemberLessonPageQueryOptions = (lessonId: number) =>
  queryOptions({
    queryKey: ['lessons', 'member-page', lessonId],
    queryFn: () => getMemberLessonPage({ data: { lessonId } }),
  })

export function usePostLessonAnnouncementMutation(lessonId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: postLessonAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-announcements', lessonId] })
      queryClient.invalidateQueries({ queryKey: ['lessons', 'member-page', lessonId] })
    },
  })
}

export function useDeleteLessonAnnouncementMutation(lessonId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteLessonAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-announcements', lessonId] })
      queryClient.invalidateQueries({ queryKey: ['lessons', 'member-page', lessonId] })
    },
  })
}
