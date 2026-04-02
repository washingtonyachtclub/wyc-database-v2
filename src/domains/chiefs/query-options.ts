import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ChiefFilters } from 'src/db/chief-queries'
import { deleteChief, getChiefsTable, getChiefTypes } from './chiefs-server-fns'
import { createOfficer } from './officers-server-fns'

export const getChiefsQueryOptions = (filters?: ChiefFilters) =>
  queryOptions({
    queryKey: ['chiefs', filters],
    queryFn: () => getChiefsTable({ data: { filters } }),
  })

export const getChiefTypesQueryOptions = () =>
  queryOptions({
    queryKey: ['chiefs', 'types'],
    queryFn: getChiefTypes,
  })

export function useCreateChiefMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOfficer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chiefs'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useDeleteChiefMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteChief,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chiefs'] })
    },
  })
}
