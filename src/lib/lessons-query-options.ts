import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createLesson,
  deleteLesson,
  enrollInLesson,
  getAllLessons,
  getClassTypes,
  getCurrentQuarter,
  getLessonById,
  getLessonForSignup,
  getMyLessonsTaught,
  getMySignedUpLessons,
  getQuarterLessons,
  removeStudentFromLesson,
  updateLesson,
} from './lessons-server-fns'

export const getQuarterLessonsQueryOptions = () =>
  queryOptions({
    queryKey: ['lessons', 'quarter'],
    queryFn: getQuarterLessons,
  })

export const getLessonByIdQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['lessons', 'byId', id],
    queryFn: async () => {
      const result = await getLessonById({ data: { id } })
      return result
    },
  })

export const getClassTypesQueryOptions = () =>
  queryOptions({
    queryKey: ['lessonClassTypes'],
    queryFn: getClassTypes,
  })

export function useCreateLessonMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useUpdateLessonMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useRemoveStudentMutation(lessonId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentWycNumber: number) =>
      removeStudentFromLesson({ data: { lessonId, studentWycNumber } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', 'byId', lessonId] })
    },
  })
}

export function useDeleteLessonMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
    },
  })
}

export const getCurrentQuarterQueryOptions = () =>
  queryOptions({
    queryKey: ['lessons', 'currentQuarter'],
    queryFn: getCurrentQuarter,
  })

export const getMyLessonsTaughtQueryOptions = () =>
  queryOptions({
    queryKey: ['lessons', 'myTeaching'],
    queryFn: getMyLessonsTaught,
  })

export const getMySignedUpLessonsQueryOptions = () =>
  queryOptions({
    queryKey: ['lessons', 'mySignedUp'],
    queryFn: getMySignedUpLessons,
  })

export const getAllLessonsQueryOptions = (
  pageIndex: number,
  pageSize: number,
  sorting?: { id: string; desc: boolean },
) =>
  queryOptions({
    queryKey: ['lessons', 'all', pageIndex, pageSize, sorting],
    queryFn: async () => {
      return await getAllLessons({
        data: { pageIndex, pageSize, sorting },
      })
    },
  })

export const getLessonForSignupQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['lessons', 'signup', id],
    queryFn: async () => {
      return await getLessonForSignup({ data: { id } })
    },
  })

export function useEnrollInLessonMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: enrollInLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', 'signup'] })
      queryClient.invalidateQueries({ queryKey: ['lessons', 'mySignedUp'] })
    },
  })
}
