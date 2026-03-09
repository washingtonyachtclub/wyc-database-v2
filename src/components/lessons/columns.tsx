import { createColumnHelper } from '@tanstack/react-table'
import type { LessonTableRow } from '../../db/types'

const columnHelper = createColumnHelper<LessonTableRow>()

export const columns = [
  columnHelper.accessor('type', {
    header: 'Type',
    enableSorting: false,
  }),
  columnHelper.accessor('subtype', {
    header: 'Subtype',
    enableSorting: false,
  }),
  columnHelper.accessor('day', {
    header: 'Day',
    enableSorting: false,
  }),
  columnHelper.accessor('time', {
    header: 'Time',
    enableSorting: false,
  }),
  columnHelper.accessor('dates', {
    header: 'Dates',
    enableSorting: false,
  }),
  columnHelper.accessor('instructor1Name', {
    header: 'Instructor 1',
    enableSorting: false,
  }),
  columnHelper.accessor('instructor2Name', {
    header: 'Instructor 2',
    enableSorting: false,
  }),
  columnHelper.accessor('description', {
    header: 'Comments',
    cell: (info) => {
      const val = info.getValue()
      return val.length > 60 ? `${val.slice(0, 60)}...` : val
    },
    enableSorting: false,
  }),
  columnHelper.accessor('size', {
    header: 'Size',
    enableSorting: false,
  }),
  columnHelper.accessor('expire', {
    header: 'Expire',
    enableSorting: false,
  }),
  columnHelper.accessor('display', {
    header: 'Display',
    cell: (info) => (info.getValue() ? 'Yes' : 'No'),
    enableSorting: false,
  }),
]
