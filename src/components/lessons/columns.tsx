import { createColumnHelper } from '@tanstack/react-table'
import type { LessonRow } from '../../lib/lessons-server-fns'

const columnHelper = createColumnHelper<LessonRow>()

export const columns = [
  columnHelper.accessor('type', {
    header: 'Type',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('subtype', {
    header: 'Subtype',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('day', {
    header: 'Day',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('time', {
    header: 'Time',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('dates', {
    header: 'Dates',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('instructor1Name', {
    header: 'Instructor 1',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('instructor2Name', {
    header: 'Instructor 2',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('comments', {
    header: 'Comments',
    cell: (info) => {
      const val = info.getValue()
      if (!val) return '—'
      return val.length > 60 ? `${val.slice(0, 60)}...` : val
    },
    enableSorting: false,
  }),
  columnHelper.accessor('size', {
    header: 'Size',
    cell: (info) => info.getValue() ?? '—',
    enableSorting: false,
  }),
  columnHelper.accessor('expire', {
    header: 'Expire',
    cell: (info) => info.getValue() ?? '—',
    enableSorting: false,
  }),
  columnHelper.accessor('display', {
    header: 'Display',
    cell: (info) => (info.getValue() ? 'Yes' : 'No'),
    enableSorting: false,
  }),
]
