import type { FocusEventHandler } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './select'

export type GroupedSelectGroup = {
  label: string
  options: { value: number; label: string }[]
}

export function GroupedSelect({
  value,
  onValueChange,
  groups,
  placeholder,
  disabled,
  onBlur,
  triggerClassName,
}: {
  value: number | null
  onValueChange: (value: number | null) => void
  groups: GroupedSelectGroup[]
  placeholder?: string
  disabled?: boolean
  onBlur?: FocusEventHandler<HTMLButtonElement>
  triggerClassName?: string
}) {
  return (
    <Select
      disabled={disabled}
      value={value != null ? String(value) : ''}
      onValueChange={(nextValue) => onValueChange(nextValue === '' ? null : Number(nextValue))}
    >
      <SelectTrigger className={triggerClassName} onBlur={onBlur}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {groups.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.options.map((option) => (
              <SelectItem key={option.value} value={String(option.value)} className="pl-6">
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
