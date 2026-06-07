import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createQuarter,
  deleteQuarter,
  getAllQuarters,
  getQuarterChangeImpact,
  getQuarterHealth,
  updateCurrentQuarter,
  updateQuarter,
} from './server-fns'

export const getQuartersQueryOptions = () =>
  queryOptions({
    queryKey: ['quarters', 'all'],
    queryFn: getAllQuarters,
  })

export const getQuarterHealthQueryOptions = () =>
  queryOptions({
    queryKey: ['quarters', 'health'],
    queryFn: getQuarterHealth,
  })

export function useCreateQuarterMutation(opts?: { onSuccess?: () => void; onClose?: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createQuarter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarters'] })
      opts?.onSuccess?.()
      opts?.onClose?.()
    },
  })
}

export function useUpdateQuarterMutation(opts?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateQuarter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarters'] })
      opts?.onSuccess?.()
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

export const getQuarterChangeImpactQueryOptions = (newQuarter: number) =>
  queryOptions({
    queryKey: ['quarters', 'impact', newQuarter],
    queryFn: () => getQuarterChangeImpact({ data: { newQuarter } }),
    enabled: newQuarter > 0,
  })

export function useUpdateCurrentQuarterMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateCurrentQuarter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarters'] })
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}
