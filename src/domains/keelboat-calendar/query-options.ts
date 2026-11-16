import { queryOptions } from '@tanstack/react-query'
import { getCalendar, getCalendarNames, getCalendarPermissions, getReservation } from './server-fns'

export const calendarQueryOptions = (month: string) =>
  queryOptions({
    queryKey: ['keelboat-calendar', 'month', month],
    queryFn: () => getCalendar({ data: month }),
    staleTime: 15_000,
    refetchInterval: 60_000,
  })

export const calendarPermissionsQueryOptions = (memberId: number, privileges: readonly string[]) =>
  queryOptions({
    queryKey: ['keelboat-calendar', 'permissions', memberId, ...privileges],
    queryFn: () => getCalendarPermissions(),
  })

export const reservationQueryOptions = (id: number, memberId: number) =>
  queryOptions({
    queryKey: ['keelboat-calendar', 'reservation', id, memberId],
    queryFn: () => getReservation({ data: { id } }),
    enabled: memberId > 0,
  })

export const calendarNamesQueryOptions = (month: string, memberId: number) =>
  queryOptions({
    queryKey: ['keelboat-calendar', 'names', month, memberId],
    queryFn: () => getCalendarNames({ data: month }),
    enabled: memberId > 0,
    refetchInterval: 60_000,
  })
