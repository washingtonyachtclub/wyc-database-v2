import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createPosition,
  deletePosition,
  getAllPositions,
  getAllPosTypes,
  setPositionActive,
} from './server-fns'

export const getPositionsAllQueryOptions = () =>
  queryOptions({
    queryKey: ['positions', 'all'],
    queryFn: getAllPositions,
  })

export const getPosTypesAllQueryOptions = () =>
  queryOptions({
    queryKey: ['pos-types', 'all'],
    queryFn: getAllPosTypes,
  })

export function useCreatePositionMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useSetPositionActiveMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setPositionActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
    },
  })
}

export function useDeletePositionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deletePosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
    },
  })
}
