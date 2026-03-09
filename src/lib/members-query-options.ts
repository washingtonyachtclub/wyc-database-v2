import { queryOptions } from '@tanstack/react-query'
import {
  getAllMembersLite,
  getCategories,
  getMembersTable,
  getMostRecentWycNumber,
  getQuarters,
} from './members-server-fns'
import type { MemberFilters } from '../db/member-queries'

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

export const getMostRecentWycNumberQueryOptions = () =>
  queryOptions({
    queryKey: ['mostRecentWycNumber'],
    queryFn: getMostRecentWycNumber,
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

export const getAllMembersLiteQueryOptions = () =>
  queryOptions({
    queryKey: ['members', 'lite'],
    queryFn: getAllMembersLite,
    staleTime: 5 * 60 * 1000,
  })
