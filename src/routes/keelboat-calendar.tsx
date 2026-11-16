import { startTransition, useState } from 'react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import {
  calendarNamesQueryOptions,
  calendarPermissionsQueryOptions,
  calendarQueryOptions,
} from '@/domains/keelboat-calendar/query-options'
import { type ReservationInput } from '@/domains/keelboat-calendar/schema'
import { monthDays, occupiesSlot, shiftMonth } from '@/domains/keelboat-calendar/calendar'
import { getTodayPacificDateString } from '@/lib/date-utils'
import { useCurrentUser } from '@/lib/auth/auth-query-options'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Modal } from '@/components/ui/Modal'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ReservationForm } from '@/components/keelboat-calendar/ReservationForm'
import { ReservationDetails } from '@/components/keelboat-calendar/ReservationDetails'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/keelboat-calendar')({
  validateSearch: (search: Record<string, unknown>) => ({
    reservation:
      Number.isSafeInteger(Number(search.reservation)) && Number(search.reservation) > 0
        ? Number(search.reservation)
        : undefined,
  }),
  beforeLoad: ({ location }) => {
    const search = new URLSearchParams(location.searchStr)
    if (search.has('month')) {
      search.delete('month')
      const query = search.toString()
      throw redirect({
        href: `${location.pathname}${query ? `?${query}` : ''}${location.hash ? `#${location.hash}` : ''}`,
        replace: true,
      })
    }
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      calendarQueryOptions(getTodayPacificDateString().slice(0, 7)),
    ),
  head: () => ({ meta: [{ title: 'Keelboat Calendar | WYC Database' }] }),
  component: KeelboatCalendar,
})

const boatColors: Record<number, string> = {
  3: 'bg-keelboat-charlotte',
  8: 'bg-keelboat-almond',
  5: 'bg-keelboat-deception',
  6: 'bg-keelboat-nightshade',
  7: 'bg-keelboat-talaria',
}

function KeelboatCalendar() {
  const [month, updateMonth] = useState(() => getTodayPacificDateString().slice(0, 7))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(() => Number(month.slice(0, 4)))
  const { reservation } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user, privileges } = useCurrentUser()
  const memberId = user?.wycNumber ?? 0
  const names = useQuery(calendarNamesQueryOptions(month, memberId))
  const reservationNames = new Map((names.data ?? []).map((row) => [row.id, row.name]))
  const { data } = useSuspenseQuery(calendarQueryOptions(month))
  const activeBoats = data.boats.filter((boat) => boat.active)
  const visibleBoats = data.boats.filter(
    (boat) =>
      boat.active || data.reservations.some((reservation) => reservation.boatId === boat.id),
  )
  const access = useQuery({
    ...calendarPermissionsQueryOptions(memberId, privileges),
    enabled: memberId > 0,
  })
  const [showLimits, setShowLimits] = useState(false)
  const [initial, setInitial] = useState<ReservationInput | null>(null)
  const today = getTodayPacificDateString()
  const days = monthDays(month)
  const title = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T12:00:00Z`))
  const setMonth = (value: string) => startTransition(() => updateMonth(value))
  const setReservation = (id: number | undefined) =>
    void navigate({ search: (prev) => ({ ...prev, reservation: id }), resetScroll: false })
  const loginRedirect = `/keelboat-calendar${reservation ? `?reservation=${reservation}` : ''}`
  const startBooking = (date = today, kind: ReservationInput['kind'] = 'personal') => {
    setInitial({
      kind,
      title: '',
      boatId: activeBoats[0]?.id ?? 0,
      fromDate: date,
      fromSlot: 0,
      throughDate: date,
      throughSlot: 0,
      destination: '',
      numberOfCrew: 0,
      phone: access.data?.phone ?? '',
      comment: '',
    })
  }
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">Keelboat Calendar</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous month"
              title="Previous month"
              disabled={month === '2000-01'}
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Popover
              open={pickerOpen}
              onOpenChange={(open) => {
                if (open) setPickerYear(Number(month.slice(0, 4)))
                setPickerOpen(open)
              }}
            >
              <h2>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="min-w-40 font-semibold">
                    {title}
                  </Button>
                </PopoverTrigger>
              </h2>
              <PopoverContent aria-label="Choose month">
                <div className="mb-3 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Previous year"
                    title="Previous year"
                    disabled={pickerYear === 2000}
                    onClick={() => setPickerYear((year) => year - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="font-semibold" aria-live="polite">
                    {pickerYear}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Next year"
                    title="Next year"
                    disabled={pickerYear === 2099}
                    onClick={() => setPickerYear((year) => year + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 12 }, (_, index) => {
                    const value = `${pickerYear}-${String(index + 1).padStart(2, '0')}`
                    const date = new Date(`${value}-01T12:00:00Z`)
                    return (
                      <Button
                        key={value}
                        variant={month === value ? 'default' : 'ghost'}
                        aria-pressed={month === value}
                        aria-label={date.toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                          timeZone: 'UTC',
                        })}
                        onClick={() => {
                          setMonth(value)
                          setPickerOpen(false)
                        }}
                      >
                        {date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}
                      </Button>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              title="Next month"
              disabled={month === '2099-12'}
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" onClick={() => setMonth(today.slice(0, 7))}>
              Today
            </Button>
          </div>
        </div>
        <div
          className="grid w-fit grid-cols-2 gap-0.5 text-xs"
          role="group"
          aria-label="Boat and reservation slot legend"
        >
          {visibleBoats.map((boat) =>
            ['Morning', 'Afternoon'].map((slot) => (
              <div
                key={`${boat.id}-${slot}`}
                className={cn(
                  'rounded-sm px-3 py-1 text-foreground',
                  boatColors[boat.id] ?? 'bg-secondary',
                )}
              >
                {boat.name} {slot}
              </div>
            )),
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {!memberId ? (
            <Button asChild>
              <Link to="/login" search={{ redirect: loginRedirect }}>
                Log in to reserve
              </Link>
            </Button>
          ) : access.data?.canBook ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => startBooking()} disabled={!activeBoats.length}>
                <Plus aria-hidden="true" />
                {access.data.isCalendarAdmin ? 'New personal reservation' : 'New reservation'}
              </Button>
              {access.data.isCalendarAdmin && (
                <Button onClick={() => startBooking(today, 'admin')} disabled={!activeBoats.length}>
                  <Plus aria-hidden="true" />
                  New admin reservation
                </Button>
              )}
            </div>
          ) : (
            access.data && (
              <span className="text-sm text-muted-foreground">
                A keelboat rating is required to reserve.
              </span>
            )
          )}
          <Button variant="outline" size="sm" onClick={() => setShowLimits(true)}>
            Booking limits
          </Button>
        </div>
      </div>
      <ErrorAlert error={access.error?.message} action="Loading calendar permissions" />
      <div
        className="overflow-x-auto rounded-lg border"
        tabIndex={0}
        role="region"
        aria-label={`${title} keelboat availability`}
      >
        <div className="min-w-[740px]">
          <div className="grid grid-cols-7 border-b bg-muted text-center text-xs font-semibold">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((date) => {
              const outsideMonth = date.slice(0, 7) !== month
              const dateLabel = outsideMonth
                ? new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  }).format(new Date(`${date}T12:00:00Z`))
                : String(Number(date.slice(8)))
              const reservedBoats = data.boats.filter((boat) =>
                data.reservations.some(
                  (r) =>
                    r.boatId === boat.id &&
                    (occupiesSlot(r.from, r.through, date, 0) ||
                      occupiesSlot(r.from, r.through, date, 1)),
                ),
              )
              const dateClasses = cn(
                'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                date === today && 'bg-primary text-primary-foreground',
              )
              return (
                <div
                  key={date}
                  className={cn(
                    'min-h-32 min-w-0 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0',
                    outsideMonth ? 'bg-muted text-muted-foreground' : 'bg-background',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    {access.data?.canBook && date >= today ? (
                      <Button
                        variant="ghost"
                        className={dateClasses}
                        aria-label={`Reserve on ${date}`}
                        onClick={() => startBooking(date)}
                      >
                        {dateLabel}
                      </Button>
                    ) : (
                      <span className={dateClasses}>{dateLabel}</span>
                    )}
                  </div>
                  <div className={cn('space-y-1', outsideMonth && 'opacity-60')}>
                    {reservedBoats.map((boat) => (
                      <div key={boat.id} className="grid grid-cols-2 gap-0.5">
                        {[0, 1].map((slot) => {
                          const booking = data.reservations.find(
                            (r) =>
                              r.boatId === boat.id && occupiesSlot(r.from, r.through, date, slot),
                          )
                          if (!booking) return <span key={slot} />
                          const displayName =
                            booking.kind === 'admin'
                              ? booking.title || 'Admin'
                              : memberId
                                ? reservationNames.get(booking.id) || boat.name
                                : boat.name
                          const label = `${boat.name}, ${date}, ${slot === 0 ? 'morning' : 'afternoon'}: ${booking.kind === 'admin' ? displayName : 'reserved'}`
                          const classes = cn(
                            'h-6 min-w-0 rounded-sm px-1 text-[10px] text-foreground',
                            boatColors[boat.id] ?? 'bg-secondary',
                          )
                          return memberId ? (
                            <Button
                              key={slot}
                              variant="ghost"
                              className={cn(classes, 'w-full font-normal')}
                              aria-label={label}
                              title={label}
                              onClick={() => setReservation(booking.id)}
                            >
                              <span className="truncate">{displayName}</span>
                            </Button>
                          ) : (
                            <div
                              key={slot}
                              title={label}
                              aria-label={label}
                              className={cn(classes, 'flex items-center justify-center truncate')}
                            >
                              {displayName}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {showLimits && (
        <Modal title="Booking limits" onClose={() => setShowLimits(false)}>
          <ul className="list-disc space-y-3 pl-5 text-sm">
            <li>
              To reserve, you need a keelboat rating, database admin access, or to be the Keelboat
              Instruction Chair or SnC Chair.
            </li>
            <li>Up to three outstanding reservations.</li>
            <li>Maximum 14 days per reservation.</li>
            <li>Half-days are bookable starting one day before the start time.</li>
            <li>Reservations must start today or later and end within one year.</li>
          </ul>
        </Modal>
      )}
      {initial && memberId > 0 && (
        <ReservationForm
          boats={activeBoats}
          initial={initial}
          onClose={() => setInitial(null)}
          onCreated={(id) => {
            setInitial(null)
            setReservation(id)
          }}
        />
      )}
      {reservation && memberId > 0 && (
        <ReservationDetails
          key={reservation}
          id={reservation}
          memberId={memberId}
          isCalendarAdmin={access.data?.isCalendarAdmin ?? false}
          onClose={() => setReservation(undefined)}
        />
      )}
      {reservation && !memberId && (
        <p className="text-sm text-muted-foreground">Log in to view reservation details.</p>
      )}
    </div>
  )
}
