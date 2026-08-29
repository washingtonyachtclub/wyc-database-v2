import { CircleHelp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFieldContext, useFormContext } from '../../hooks/form-context'
import { Button } from './button'
import { Checkbox } from './checkbox'
import { DatePicker } from './DatePicker'
import { Input } from './input'
import { Label } from './label'
import { SearchableSelect } from './SearchableSelect'
import { TimePicker } from './TimePicker'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Textarea } from './textarea'

// --- Shared helpers ---

export function formErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'string') return error
  if (Array.isArray(error)) {
    for (const item of error) {
      const message = formErrorMessage(item)
      if (message) return message
    }
  }
  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') return error.message
    for (const value of Object.values(error)) {
      const message = formErrorMessage(value)
      if (message) return message
    }
  }
  return undefined
}

function FieldError({ errors }: { errors: Array<unknown> }) {
  const message = formErrorMessage(errors)
  if (!message) return null
  return <p className="text-sm text-destructive mt-1">{message}</p>
}

// --- Field components (use useFieldContext) ---

export function TextField({
  label,
  required,
  type = 'text',
  placeholder,
  className,
}: {
  label: string
  required?: boolean
  type?: 'text' | 'date' | 'time' | 'datetime-local' | 'email' | 'password'
  placeholder?: string
  className?: string
}) {
  const field = useFieldContext<string>()
  const input =
    type === 'date' ? (
      <DatePicker
        id={field.name}
        value={field.state.value}
        required={required}
        onBlur={field.handleBlur}
        onChange={(value) => field.handleChange(value ?? '')}
      />
    ) : type === 'time' ? (
      <TimePicker
        id={field.name}
        value={field.state.value}
        required={required}
        onBlur={field.handleBlur}
        onChange={field.handleChange}
      />
    ) : (
      <Input
        id={field.name}
        type={type}
        placeholder={placeholder}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
      />
    )

  return (
    <div className={className}>
      <Label htmlFor={field.name} className="mb-1">
        {label}
        {required && ' *'}
      </Label>
      {input}
      <FieldError errors={field.state.meta.errors} />
    </div>
  )
}

export function TextAreaField({
  label,
  required,
  rows = 3,
  className,
  tooltip,
}: {
  label: string
  required?: boolean
  rows?: number
  className?: string
  tooltip?: string
}) {
  const field = useFieldContext<string>()
  return (
    <div className={className}>
      <Label htmlFor={field.name} className="mb-1 flex items-center gap-1">
        {label}
        {required && ' *'}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger type="button" tabIndex={-1}>
              <CircleHelp className="h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </Label>
      <Textarea
        id={field.name}
        rows={rows}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      <FieldError errors={field.state.meta.errors} />
    </div>
  )
}

export function NumberField({
  label,
  required,
  className,
}: {
  label: string
  required?: boolean
  className?: string
}) {
  const field = useFieldContext<number>()
  return (
    <div className={className}>
      <Label htmlFor={field.name} className="mb-1">
        {label}
        {required && ' *'}
      </Label>
      <Input
        id={field.name}
        type="number"
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.valueAsNumber)}
      />
      <FieldError errors={field.state.meta.errors} />
    </div>
  )
}

export function SelectField({
  label,
  required,
  placeholder,
  options,
  className,
}: {
  label: string
  required?: boolean
  placeholder?: string
  options: { value: number; label: string }[]
  className?: string
}) {
  const field = useFieldContext<number | null>()
  return (
    <div className={className}>
      <Label className="mb-1">
        {label}
        {required && ' *'}
      </Label>
      <SearchableSelect
        value={field.state.value != null ? String(field.state.value) : null}
        onValueChange={(value) => field.handleChange(Number(value))}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        options={options.map((option) => ({
          value: String(option.value),
          label: option.label,
        }))}
      />
      <FieldError errors={field.state.meta.errors} />
    </div>
  )
}

export function GroupedSelectField({
  label,
  required,
  placeholder,
  groups,
  tooltip,
  className,
}: {
  label: string
  required?: boolean
  placeholder?: string
  groups: { label: string; options: { value: number; label: string }[] }[]
  tooltip?: string
  className?: string
}) {
  const field = useFieldContext<number | null>()
  return (
    <div className={className}>
      <Label className="mb-1 flex items-center gap-1">
        {label}
        {required && ' *'}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger type="button" tabIndex={-1}>
              <CircleHelp className="h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </Label>
      <SearchableSelect
        value={field.state.value != null ? String(field.state.value) : null}
        onValueChange={(value) => field.handleChange(Number(value))}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        groups={groups.map((group) => ({
          label: group.label,
          options: group.options.map((option) => ({
            value: String(option.value),
            label: option.label,
          })),
        }))}
      />
      <FieldError errors={field.state.meta.errors} />
    </div>
  )
}

export function BooleanSelectField({
  label,
  trueLabel = 'Yes',
  falseLabel = 'No',
  className,
}: {
  label: string
  trueLabel?: string
  falseLabel?: string
  className?: string
}) {
  const field = useFieldContext<boolean>()
  return (
    <div className={className}>
      <Label className="mb-1">{label}</Label>
      <Select
        value={field.state.value ? '1' : '0'}
        onValueChange={(value) => field.handleChange(value === '1')}
      >
        <SelectTrigger onBlur={field.handleBlur}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">{trueLabel}</SelectItem>
          <SelectItem value="0">{falseLabel}</SelectItem>
        </SelectContent>
      </Select>
      <FieldError errors={field.state.meta.errors} />
    </div>
  )
}

export function CheckboxField({ label, className }: { label: string; className?: string }) {
  const field = useFieldContext<boolean>()
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Checkbox
        id={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked === true)}
        onBlur={field.handleBlur}
      />
      <Label htmlFor={field.name}>{label}</Label>
      <FieldError errors={field.state.meta.errors} />
    </div>
  )
}

// --- Form components (use useFormContext) ---

export function SubmitButton({
  label = 'Save',
  submittingLabel = 'Saving...',
}: {
  label?: string
  submittingLabel?: string
}) {
  const form = useFormContext()
  return (
    <form.Subscribe
      selector={(state) => [state.canSubmit, state.isSubmitting] as const}
      children={([canSubmit, isSubmitting]) => (
        <Button type="submit" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? submittingLabel : label}
        </Button>
      )}
    />
  )
}
