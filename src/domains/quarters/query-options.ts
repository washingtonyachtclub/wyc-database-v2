import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createQuarter,
  deleteQuarter,
  getAllQuarters,
  getQuarterChangeImpact,
  getQuarterHealth,
  updateCurrentQuarter,
  updateRenewalQuarter,
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
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
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
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
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
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
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

export function useUpdateRenewalQuarterMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: updateRenewalQuarter,
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['quarters'] }),
        client.invalidateQueries({ queryKey: ['renewals', 'status'] }),
        client.invalidateQueries({ queryKey: ['membership-applications'] }),
      ])
    },
  })
}
