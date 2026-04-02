import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createOfficer,
  getAllOfficers,
  getMemberPositions,
  getOfficerPageOfficers,
  getPositionsForOfficerPage,
  setOfficerActive,
} from './server-fns'

export const getAllOfficersQueryOptions = () =>
  queryOptions({
    queryKey: ['officers'],
    queryFn: getAllOfficers,
  })

export const getOfficerPageQueryOptions = () =>
  queryOptions({
    queryKey: ['officers', 'page'],
    queryFn: getOfficerPageOfficers,
  })

export const getOfficerPagePositionsQueryOptions = () =>
  queryOptions({
    queryKey: ['officers', 'positions'],
    queryFn: getPositionsForOfficerPage,
  })

export function useCreateOfficerMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOfficer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officers'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useSetOfficerActiveMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setOfficerActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officers'] })
    },
  })
}

export const getMemberPositionsQueryOptions = (wycNumber: number) =>
  queryOptions({
    queryKey: ['officers', 'byMember', wycNumber],
    queryFn: () => getMemberPositions({ data: { wycNumber } }),
  })
