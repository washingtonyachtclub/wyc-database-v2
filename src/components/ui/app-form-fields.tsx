import { useFieldContext, useFormContext } from '../../hooks/form-context'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Textarea } from './textarea'

// --- Shared helpers ---

function FieldError({ errors }: { errors: Array<any> }) {
  if (errors.length === 0) return null
  const message = typeof errors[0] === 'string' ? errors[0] : (errors[0]?.message ?? '')
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
  type?: 'text' | 'date' | 'email' | 'password'
  placeholder?: string
  className?: string
}) {
  const field = useFieldContext<string>()
  return (
    <div className={className}>
      <Label htmlFor={field.name} className="mb-1">
        {label}
        {required && ' *'}
      </Label>
      <Input
        id={field.name}
        type={type}
        placeholder={placeholder}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      <FieldError errors={field.state.meta.errors} />
    </div>
  )
}

export function TextAreaField({
  label,
  required,
  rows = 3,
  className,
}: {
  label: string
  required?: boolean
  rows?: number
  className?: string
}) {
  const field = useFieldContext<string>()
  return (
    <div className={className}>
      <Label htmlFor={field.name} className="mb-1">
        {label}
        {required && ' *'}
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
      <Select
        value={field.state.value != null ? String(field.state.value) : ''}
        onValueChange={(value) => field.handleChange(value === '' ? null : Number(value))}
      >
        <SelectTrigger onBlur={field.handleBlur}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
