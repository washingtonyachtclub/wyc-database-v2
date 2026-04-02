import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClassType, deleteClassType, getAllClassTypes } from './server-fns'

export const getClassTypesQueryOptions = () =>
  queryOptions({
    queryKey: ['class-types', 'all'],
    queryFn: getAllClassTypes,
  })

export function useCreateClassTypeMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createClassType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-types'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useDeleteClassTypeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteClassType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-types'] })
    },
  })
}
