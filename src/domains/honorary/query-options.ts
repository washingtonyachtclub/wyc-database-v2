import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { HonoraryFilters } from '@/domains/honorary/queries'
import { createOfficer } from '@/domains/officers/server-fns'
import { deleteHonorary, getHonoraryTable } from './server-fns'

const HONORARY_POSITION = 1030

export const getHonoraryQueryOptions = (filters?: HonoraryFilters) =>
  queryOptions({
    queryKey: ['honorary', filters],
    queryFn: () => getHonoraryTable({ data: { filters } }),
  })

export function useCreateHonoraryMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (member: number) =>
      createOfficer({ data: { member, position: HONORARY_POSITION } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['honorary'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useDeleteHonoraryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteHonorary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['honorary'] })
    },
  })
}
