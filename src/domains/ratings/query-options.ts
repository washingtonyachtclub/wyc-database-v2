import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { RatingFilters } from '@/domains/ratings/filter-types'
import {
  createRating,
  deleteRating,
  getAllRatings,
  getRatingById,
  getRatingTypes,
  updateRatingComments,
} from './server-fns'

export const getAllRatingsQueryOptions = (
  pageIndex: number,
  pageSize: number,
  filters?: RatingFilters,
  sorting?: { id: string; desc: boolean },
) =>
  queryOptions({
    queryKey: ['ratings', 'all', pageIndex, pageSize, filters, sorting],
    queryFn: () => getAllRatings({ data: { pageIndex, pageSize, filters, sorting } }),
  })

export const getRatingByIdQueryOptions = (index: number) =>
  queryOptions({
    queryKey: ['ratings', 'byId', index],
    queryFn: () => getRatingById({ data: { index } }),
  })

export const getRatingTypesQueryOptions = () =>
  queryOptions({
    queryKey: ['ratings', 'types'],
    queryFn: getRatingTypes,
  })

export function useCreateRatingMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRating,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useUpdateRatingMutation(opts: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateRatingComments,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] })
      opts.onSuccess()
    },
  })
}

export function useDeleteRatingMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteRating,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] })
    },
  })
}
