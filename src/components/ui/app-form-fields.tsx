import { useFieldContext, useFormContext } from '../../hooks/form-context'

// --- Shared helpers ---

const inputClass = 'w-full px-3 py-2 border rounded'

function FieldError({ errors }: { errors: Array<any> }) {
  if (errors.length === 0) return null
  const message =
    typeof errors[0] === 'string' ? errors[0] : errors[0]?.message ?? ''
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
      <label htmlFor={field.name} className="block text-sm font-medium mb-1">
        {label}
        {required && ' *'}
      </label>
      <input
        id={field.name}
        type={type}
        placeholder={placeholder}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        className={inputClass}
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
      <label htmlFor={field.name} className="block text-sm font-medium mb-1">
        {label}
        {required && ' *'}
      </label>
      <textarea
        id={field.name}
        rows={rows}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        className={inputClass}
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
      <label htmlFor={field.name} className="block text-sm font-medium mb-1">
        {label}
        {required && ' *'}
      </label>
      <input
        id={field.name}
        type="number"
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.valueAsNumber)}
        className={inputClass}
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
      <label htmlFor={field.name} className="block text-sm font-medium mb-1">
        {label}
        {required && ' *'}
      </label>
      <select
        id={field.name}
        value={field.state.value ?? ''}
        onBlur={field.handleBlur}
        onChange={(e) =>
          field.handleChange(
            e.target.value === '' ? null : Number(e.target.value),
          )
        }
        className={inputClass}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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
      <label htmlFor={field.name} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <select
        id={field.name}
        value={field.state.value ? '1' : '0'}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value === '1')}
        className={inputClass}
      >
        <option value="1">{trueLabel}</option>
        <option value="0">{falseLabel}</option>
      </select>
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
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-70"
        >
          {isSubmitting ? submittingLabel : label}
        </button>
      )}
    />
  )
}
