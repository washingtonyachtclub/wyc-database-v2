import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteChief, getChiefsTable, getChiefTypes } from './server-fns'
import { createOfficer } from '@/domains/officers/server-fns'

export const getChiefsQueryOptions = () =>
  queryOptions({
    queryKey: ['chiefs'],
    queryFn: () => getChiefsTable(),
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
