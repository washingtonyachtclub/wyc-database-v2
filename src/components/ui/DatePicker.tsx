import { CalendarIcon } from 'lucide-react'
import * as React from 'react'
import { useNativeDateTimeInput } from '@/hooks/use-native-date-time-input'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Calendar } from './calendar'
import { Input } from './input'
import { Label } from './label'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

function parseYmd(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined
  const [, year, month, day] = match
  const y = Number(year)
  const m = Number(month)
  const d = Number(day)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return undefined
  }
  return date
}

function toYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toDisplayDate(value: string | undefined): string {
  const date = parseYmd(value)
  if (!date) return value ?? ''
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`
}

function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const parts = [digits.slice(0, 2)]
  if (digits.length > 2) parts.push(digits.slice(2, 4))
  if (digits.length > 4) parts.push(digits.slice(4, 8))
  return parts.join('/')
}

function parseDisplayDate(value: string): Date | undefined {
  const ymd = parseYmd(value)
  if (ymd) return ymd
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return undefined
  const [, month, day, year] = match
  return parseYmd(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
}

export function DatePicker({
  value,
  onChange,
  label,
  className,
  placeholder = 'MM/DD/YYYY',
  id,
  required,
  onBlur,
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
  label?: string
  className?: string
  placeholder?: string
  id?: string
  required?: boolean
  onBlur?: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [text, setText] = React.useState(toDisplayDate(value))
  const [invalid, setInvalid] = React.useState(false)
  const nativeInput = useNativeDateTimeInput()

  React.useEffect(() => {
    if (invalid) return
    setText(toDisplayDate(value))
    setInvalid(false)
  }, [value])

  const commitText = (raw: string) => {
    const trimmed = raw.trim()
    if (trimmed === '') {
      onChange(undefined)
      return
    }
    const parsed = parseDisplayDate(trimmed)
    if (parsed) {
      setInvalid(false)
      setText(toDisplayDate(toYmd(parsed)))
      onChange(toYmd(parsed))
    } else {
      setInvalid(true)
      onChange(undefined)
    }
  }

  const selected = parseYmd(value)

  if (nativeInput) {
    return (
      <div>
        {label && (
          <Label htmlFor={id} className="mb-1">
            {label}
          </Label>
        )}
        <Input
          id={id}
          type="date"
          value={value ?? ''}
          required={required}
          className={className}
          onChange={(event) => onChange(event.target.value || undefined)}
          onBlur={onBlur}
        />
      </div>
    )
  }

  return (
    <div>
      {label && <Label className="mb-1">{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          maxLength={10}
          required={required}
          aria-invalid={invalid}
          className={cn('pr-9', invalid && 'border-destructive', className)}
          value={text}
          onChange={(e) => {
            setText(maskDate(e.target.value))
            setInvalid(false)
          }}
          onBlur={(e) => {
            commitText(e.target.value)
            onBlur?.()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="absolute right-0 top-0 h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Open calendar"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected}
              captionLayout="dropdown"
              startMonth={new Date(1900, 0)}
              endMonth={new Date(new Date().getFullYear() + 10, 11)}
              onSelect={(date) => {
                onChange(date ? toYmd(date) : undefined)
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      {invalid && <p className="mt-1 text-sm text-destructive">Enter a valid date.</p>}
    </div>
  )
}
