import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createRatingType,
  getAllRatingTypes,
  getDistinctRatingTypeNames,
} from './server-fns'

export const getRatingTypesAllQueryOptions = () =>
  queryOptions({
    queryKey: ['rating-types', 'all'],
    queryFn: getAllRatingTypes,
  })

export const getDistinctTypeNamesQueryOptions = () =>
  queryOptions({
    queryKey: ['rating-types', 'distinct-names'],
    queryFn: getDistinctRatingTypeNames,
  })

export function useCreateRatingTypeMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRatingType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rating-types'] })
      queryClient.invalidateQueries({ queryKey: ['ratings', 'types'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}
