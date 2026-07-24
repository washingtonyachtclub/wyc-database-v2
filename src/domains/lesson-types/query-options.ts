import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { createLessonType, deleteLessonType, getAllLessonTypes } from './server-fns'

export const getLessonTypesQueryOptions = () =>
  queryOptions({
    queryKey: ['lesson-types', 'all'],
    queryFn: getAllLessonTypes,
  })

export function useCreateLessonTypeMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createLessonType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-types'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useDeleteLessonTypeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteLessonType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-types'] })
    },
  })
}
