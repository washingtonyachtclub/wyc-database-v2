type FieldWrapperProps = {
  label: string
  name: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

function FieldWrapper({ label, name, required, className, children }: FieldWrapperProps) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium mb-1">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
}

const inputClass = 'w-full px-3 py-2 border rounded'

// --- Text / number / date input ---

type TextFieldProps = {
  label: string
  required?: boolean
  className?: string
} & React.InputHTMLAttributes<HTMLInputElement>

export function TextField({ label, required, className, ...inputProps }: TextFieldProps) {
  return (
    <FieldWrapper label={label} name={inputProps.name!} required={required} className={className}>
      <input
        id={inputProps.name}
        required={required}
        className={inputClass}
        {...inputProps}
      />
    </FieldWrapper>
  )
}

// --- Select ---

type SelectFieldProps = {
  label: string
  required?: boolean
  className?: string
  placeholder?: string
  children: React.ReactNode
} & React.SelectHTMLAttributes<HTMLSelectElement>

export function SelectField({ label, required, className, placeholder, children, ...selectProps }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} name={selectProps.name!} required={required} className={className}>
      <select
        id={selectProps.name}
        required={required}
        className={inputClass}
        {...selectProps}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
    </FieldWrapper>
  )
}

// --- Textarea ---

type TextAreaFieldProps = {
  label: string
  required?: boolean
  className?: string
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>

export function TextAreaField({ label, required, className, ...textareaProps }: TextAreaFieldProps) {
  return (
    <FieldWrapper label={label} name={textareaProps.name!} required={required} className={className}>
      <textarea
        id={textareaProps.name}
        required={required}
        className={inputClass}
        {...textareaProps}
      />
    </FieldWrapper>
  )
}
