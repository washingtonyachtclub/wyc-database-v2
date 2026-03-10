import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { createLesson, getAllLessons, getClassTypes, getQuarterLessons, updateLesson } from './lessons-server-fns'

export const getQuarterLessonsQueryOptions = () =>
  queryOptions({
    queryKey: ['lessons', 'quarter'],
    queryFn: getQuarterLessons,
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
