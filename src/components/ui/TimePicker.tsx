import { Clock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNativeDateTimeInput } from '@/hooks/use-native-date-time-input'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

type Meridiem = 'AM' | 'PM'

type TimeParts = {
  hour: number
  minute: number
  meridiem: Meridiem
}

function parseTime(raw: string): string | undefined {
  const compact = raw.trim().toLowerCase().replace(/\s+/g, '')
  if (!compact) return undefined

  const meridiemMatch = compact.match(/^(\d{1,2})(?::?(\d{2}))?([ap])m?$/)
  if (meridiemMatch) {
    let hour = Number(meridiemMatch[1])
    const minute = Number(meridiemMatch[2] ?? '0')
    if (hour < 1 || hour > 12 || minute > 59) return undefined
    if (hour === 12) hour = 0
    if (meridiemMatch[3] === 'p') hour += 12
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  const twentyFourHourMatch = compact.match(/^(\d{1,2})(?::?(\d{2}))?$/)
  if (!twentyFourHourMatch) return undefined
  const hour = Number(twentyFourHourMatch[1])
  const minute = Number(twentyFourHourMatch[2] ?? '0')
  if (hour > 23 || minute > 59) return undefined
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function formatTime(value: string | undefined): string {
  if (!value) return ''
  const [hourString, minute = '00'] = value.split(':')
  const hour = Number(hourString)
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return value
  const meridiem = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minute} ${meridiem}`
}

function toParts(value: string | undefined): TimeParts {
  const parsed = value ? parseTime(value) : undefined
  const now = new Date()
  const [hourString, minuteString] = (parsed ?? `${now.getHours()}:${now.getMinutes()}`).split(':')
  const hour = Number(hourString)
  return {
    hour: hour % 12 || 12,
    minute: Number(minuteString),
    meridiem: hour >= 12 ? 'PM' : 'AM',
  }
}

function fromParts(parts: TimeParts): string {
  let hour = parts.hour % 12
  if (parts.meridiem === 'PM') hour += 12
  return `${String(hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

function centerSelected(container: HTMLDivElement | null, selector: string) {
  const selected = container?.querySelector<HTMLElement>(selector)
  if (!container || !selected) return
  container.scrollTop = selected.offsetTop - container.clientHeight / 2 + selected.clientHeight / 2
}

export function TimePicker({
  value,
  onChange,
  onBlur,
  id,
  className,
  required,
}: {
  value: string | undefined
  onChange: (value: string) => void
  onBlur?: () => void
  id?: string
  className?: string
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(formatTime(value))
  const [invalid, setInvalid] = useState(false)
  const [draft, setDraft] = useState(() => toParts(value))
  const hourListRef = useRef<HTMLDivElement>(null)
  const minuteListRef = useRef<HTMLDivElement>(null)
  const nativeInput = useNativeDateTimeInput()

  useEffect(() => {
    if (invalid) return
    setText(formatTime(value))
    setInvalid(false)
  }, [value])

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      centerSelected(hourListRef.current, `[data-hour="${draft.hour}"]`)
      centerSelected(minuteListRef.current, `[data-minute="${draft.minute}"]`)
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  const commit = () => {
    if (!text.trim()) {
      setInvalid(false)
      onChange('')
      return
    }
    const parsed = parseTime(text)
    if (!parsed) {
      setInvalid(true)
      onChange('')
      return
    }
    setInvalid(false)
    setText(formatTime(parsed))
    onChange(parsed)
  }

  const choosePart = (changes: Partial<TimeParts>) => {
    const nextDraft = { ...draft, ...changes }
    const nextValue = fromParts(nextDraft)
    setDraft(nextDraft)
    setText(formatTime(nextValue))
    setInvalid(false)
    onChange(nextValue)
  }

  const scrollClass = 'h-56 touch-pan-y overscroll-contain overflow-y-auto rounded-md border p-1'

  if (nativeInput) {
    return (
      <Input
        id={id}
        type="time"
        step={60}
        value={value ?? ''}
        required={required}
        className={className}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    )
  }

  return (
    <div>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          maxLength={8}
          required={required}
          aria-invalid={invalid}
          value={text}
          className={cn('pr-9', invalid && 'border-destructive', className)}
          onChange={(event) => {
            setText(event.target.value.slice(0, 8))
            setInvalid(false)
          }}
          onBlur={() => {
            commit()
            onBlur?.()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            }
          }}
        />
        <Popover
          modal
          open={open}
          onOpenChange={(nextOpen) => {
            if (nextOpen) setDraft(toParts(value))
            setOpen(nextOpen)
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="absolute right-0 top-0 h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Choose a time"
            >
              <Clock className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <div className="mb-2 grid grid-cols-[1fr_1fr_4.5rem] gap-2 text-center text-xs font-medium text-muted-foreground">
              <span>Hour</span>
              <span>Minute</span>
              <span>AM/PM</span>
            </div>
            <div className="grid grid-cols-[1fr_1fr_4.5rem] gap-2">
              <div
                ref={hourListRef}
                className={scrollClass}
                onWheel={(event) => event.stopPropagation()}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                  <Button
                    key={hour}
                    type="button"
                    size="sm"
                    variant={draft.hour === hour ? 'secondary' : 'ghost'}
                    data-hour={hour}
                    className="mb-0.5 h-8 w-full"
                    onClick={() => choosePart({ hour })}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
              <div
                ref={minuteListRef}
                className={scrollClass}
                onWheel={(event) => event.stopPropagation()}
              >
                {Array.from({ length: 60 }, (_, minute) => minute).map((minute) => (
                  <Button
                    key={minute}
                    type="button"
                    size="sm"
                    variant={draft.minute === minute ? 'secondary' : 'ghost'}
                    data-minute={minute}
                    className="mb-0.5 h-8 w-full"
                    onClick={() => choosePart({ minute })}
                  >
                    {String(minute).padStart(2, '0')}
                  </Button>
                ))}
              </div>
              <div className="space-y-1">
                {(['AM', 'PM'] as const).map((meridiem) => (
                  <Button
                    key={meridiem}
                    type="button"
                    size="sm"
                    variant={draft.meridiem === meridiem ? 'secondary' : 'ghost'}
                    className="w-full"
                    onClick={() => choosePart({ meridiem })}
                  >
                    {meridiem}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {invalid && <p className="mt-1 text-sm text-destructive">Enter a valid time.</p>}
    </div>
  )
}
