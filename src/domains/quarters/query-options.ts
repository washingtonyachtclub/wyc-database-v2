import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { createQuarter, deleteQuarter, getAllQuarters } from './server-fns'

export const getQuartersQueryOptions = () =>
  queryOptions({
    queryKey: ['quarters', 'all'],
    queryFn: getAllQuarters,
  })

export function useCreateQuarterMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createQuarter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarters'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useDeleteQuarterMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteQuarter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarters'] })
    },
  })
}
