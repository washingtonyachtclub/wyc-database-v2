import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createBoatType,
  deleteBoatType,
  getAllBoatTypes,
  getDistinctBoatFleetNames,
  setBoatTypeActive,
  updateBoatType,
} from './server-fns'

function invalidateBoatTypeQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['boat-types'] })
  queryClient.invalidateQueries({ queryKey: ['checkouts'] })
}

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

export function useDeleteBoatTypeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteBoatType,
    onSuccess: () => {
      invalidateBoatTypeQueries(queryClient)
    },
  })
}

export function useCreateBoatTypeMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBoatType,
    onSuccess: () => {
      invalidateBoatTypeQueries(queryClient)
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useUpdateBoatTypeMutation(opts?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateBoatType,
    onSuccess: () => {
      invalidateBoatTypeQueries(queryClient)
      opts?.onSuccess?.()
    },
  })
}

export function useSetBoatTypeActiveMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setBoatTypeActive,
    onSuccess: () => {
      invalidateBoatTypeQueries(queryClient)
    },
  })
}
