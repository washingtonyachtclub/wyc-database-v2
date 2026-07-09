import { CalendarIcon } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Calendar } from './calendar'
import { Input } from './input'
import { Label } from './label'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

// Build the Date in local time; new Date('2026-07-08') parses as UTC and can shift the day.
function parseYmd(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return undefined
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Auto-format keystrokes into YYYY-MM-DD: keep digits only and insert dashes after
// the year and month, so the user never types the separators. Dashes are only added
// ahead of a filled group, so backspacing over one doesn't get re-inserted.
function maskYmd(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const parts = [digits.slice(0, 4)]
  if (digits.length > 4) parts.push(digits.slice(4, 6))
  if (digits.length > 6) parts.push(digits.slice(6, 8))
  return parts.join('-')
}

export function DatePicker({
  value,
  onChange,
  label,
  className,
  placeholder = 'YYYY-MM-DD',
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
  label?: string
  className?: string
  placeholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  // Local text state so partial typing (e.g. "2026-07") isn't wiped by the controlled
  // value on every keystroke; committed to onChange only when it parses.
  const [text, setText] = React.useState(value ?? '')

  React.useEffect(() => {
    setText(value ?? '')
  }, [value])

  const commitText = (raw: string) => {
    const trimmed = raw.trim()
    if (trimmed === '') {
      onChange(undefined)
      return
    }
    const parsed = parseYmd(trimmed)
    if (parsed) {
      onChange(toYmd(parsed))
    } else {
      setText(value ?? '')
    }
  }

  const selected = parseYmd(value)

  return (
    <div>
      {label && <Label className="mb-1">{label}</Label>}
      <div className="relative">
        <Input
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          className={cn('pr-9', className)}
          value={text}
          onChange={(e) => setText(maskYmd(e.target.value))}
          onBlur={(e) => commitText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitText(text)
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
              onSelect={(date) => {
                onChange(date ? toYmd(date) : undefined)
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
