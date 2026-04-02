import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createBoatType,
  getAllBoatTypes,
  getDistinctBoatFleetNames,
} from './boat-types-server-fns'

export const getBoatTypesAllQueryOptions = () =>
  queryOptions({
    queryKey: ['boat-types', 'all'],
    queryFn: getAllBoatTypes,
  })

export const getDistinctFleetNamesQueryOptions = () =>
  queryOptions({
    queryKey: ['boat-types', 'distinct-fleets'],
    queryFn: getDistinctBoatFleetNames,
  })

export function useCreateBoatTypeMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBoatType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boat-types'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}
