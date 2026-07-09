import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, getDefaultClassNames } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: cn(defaults.months, 'relative'),
        month: cn(defaults.month, 'space-y-4'),
        month_caption: cn(defaults.month_caption, 'flex justify-center h-9 items-center'),
        caption_label: cn(defaults.caption_label, 'text-sm font-medium'),
        nav: cn(defaults.nav, 'absolute inset-x-0 top-0 flex items-center justify-between'),
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 p-0 opacity-50 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 p-0 opacity-50 hover:opacity-100',
        ),
        month_grid: cn(defaults.month_grid, 'w-full border-collapse space-y-1'),
        weekdays: cn(defaults.weekdays, 'flex'),
        weekday: cn(defaults.weekday, 'text-muted-foreground rounded-md w-9 font-normal text-xs'),
        week: cn(defaults.week, 'flex w-full mt-2'),
        day: cn(defaults.day, 'h-9 w-9 text-center text-sm p-0 relative'),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
        ),
        selected: cn(
          defaults.selected,
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary [&>button:hover]:text-primary-foreground',
        ),
        today: cn(defaults.today, '[&>button]:bg-accent [&>button]:text-accent-foreground'),
        outside: cn(defaults.outside, '[&>button]:text-muted-foreground [&>button]:opacity-50'),
        disabled: cn(defaults.disabled, '[&>button]:text-muted-foreground [&>button]:opacity-50'),
        hidden: cn(defaults.hidden, 'invisible'),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass }) =>
          orientation === 'left' ? (
            <ChevronLeft className={cn('h-4 w-4', chevronClass)} />
          ) : (
            <ChevronRight className={cn('h-4 w-4', chevronClass)} />
          ),
      }}
      {...props}
    />
  )
}
