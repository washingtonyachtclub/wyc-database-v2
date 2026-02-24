import { queryOptions } from '@tanstack/react-query'
import { getAllLessons, getQuarterLessons } from './lessons-server-fns'

export const getQuarterLessonsQueryOptions = () =>
  queryOptions({
    queryKey: ['lessons', 'quarter'],
    queryFn: getQuarterLessons,
  })

export const getAllLessonsQueryOptions = (
  pageIndex: number,
  pageSize: number,
  sorting?: { id: string; desc: boolean },
) =>
  queryOptions({
    queryKey: ['lessons', 'all', pageIndex, pageSize, sorting],
    queryFn: async () => {
      return await getAllLessons({
        data: { pageIndex, pageSize, sorting },
      })
    },
  })
