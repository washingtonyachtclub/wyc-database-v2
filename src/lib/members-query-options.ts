import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { MemberFilters } from '../db/member-filter-types'
import {
  getAllMembersLite,
  getCategories,
  getMemberById,
  getMemberLessonsSignedUp,
  getMemberLessonsTaught,
  getMemberRatings,
  getMemberRatingsGiven,
  getMembersTable,
  getNextWycNumber,
  getQuarters,
  updateMember,
  updateMemberProfile,
} from './members-server-fns'

export const getMembersQueryOptions = (
  pageIndex: number,
  pageSize: number,
  filters?: MemberFilters,
  sorting?: { id: string; desc: boolean },
) =>
  queryOptions({
    queryKey: ['members', pageIndex, pageSize, filters, sorting],
    queryFn: async () => {
      const result = await getMembersTable({
        data: { pageIndex, pageSize, filters, sorting },
      })
      return result
    },
  })

export const getNextWycNumberQueryOptions = () =>
  queryOptions({
    queryKey: ['nextWycNumber'],
    queryFn: getNextWycNumber,
  })

export const getCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

export const getQuartersQueryOptions = () =>
  queryOptions({
    queryKey: ['quarters'],
    queryFn: getQuarters,
  })

export const getMemberByIdQueryOptions = (wycNumber: number) =>
  queryOptions({
    queryKey: ['members', 'byId', wycNumber],
    queryFn: async () => {
      return await getMemberById({ data: { wycNumber } })
    },
  })

export const getMemberRatingsQueryOptions = (wycNumber: number) =>
  queryOptions({
    queryKey: ['members', 'ratings', wycNumber],
    queryFn: () => getMemberRatings({ data: { wycNumber } }),
  })

export const getMemberRatingsGivenQueryOptions = (wycNumber: number, since?: string) =>
  queryOptions({
    queryKey: ['members', 'ratingsGiven', wycNumber, since],
    queryFn: () => getMemberRatingsGiven({ data: { wycNumber, since } }),
  })

export const getMemberLessonsTaughtQueryOptions = (wycNumber: number, since?: string) =>
  queryOptions({
    queryKey: ['members', 'lessonsTaught', wycNumber, since],
    queryFn: () => getMemberLessonsTaught({ data: { wycNumber, since } }),
  })

export const getMemberLessonsSignedUpQueryOptions = (wycNumber: number, since?: string) =>
  queryOptions({
    queryKey: ['members', 'lessonsSignedUp', wycNumber, since],
    queryFn: () => getMemberLessonsSignedUp({ data: { wycNumber, since } }),
  })

export const getAllMembersLiteQueryOptions = () =>
  queryOptions({
    queryKey: ['members', 'lite'],
    queryFn: getAllMembersLite,
    staleTime: 5 * 60 * 1000,
  })

export const useUpdateMemberMutation = (opts: { onSuccess: () => void; onClose: () => void }) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useUpdateMemberProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateMemberProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}
