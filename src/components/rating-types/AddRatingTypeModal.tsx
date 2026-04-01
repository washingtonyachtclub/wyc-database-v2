import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ErrorAlert } from '../ui/ErrorAlert'
import { ratingTypeInsertSchema } from '../../db/rating-type-schema'
import { useAppForm } from '../../hooks/form'
import {
  getDistinctTypeNamesQueryOptions,
  useCreateRatingTypeMutation,
} from '../../lib/rating-types-query-options'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../ui/command'
import { Label } from '../ui/label'
import { Modal } from '../ui/Modal'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

type AddRatingTypeModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export function AddRatingTypeModal({ onClose, onSuccess }: AddRatingTypeModalProps) {
  const { data: existingTypes = [] } = useQuery(getDistinctTypeNamesQueryOptions())

  const createMutation = useCreateRatingTypeMutation({ onSuccess, onClose })

  const form = useAppForm({
    defaultValues: { text: '', type: '', degree: 0, expires: false },
    validators: {
      onSubmit: ratingTypeInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({ data: value })
    },
  })

  const mutationError = createMutation.error?.message

  return (
    <Modal onClose={onClose} title="New Rating Type">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        <ErrorAlert error={mutationError} action="Adding rating type" />

        <form.AppField
          name="text"
          children={(field) => <field.TextField label="Text" required />}
        />

        <form.AppField
          name="degree"
          children={(field) => <field.NumberField label="Degree" required />}
        />

        <form.AppField
          name="expires"
          children={(field) => <field.BooleanSelectField label="Expires" />}
        />

        <form.AppField
          name="type"
          children={(field) => (
            <TypeCombobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              existingTypes={existingTypes}
            />
          )}
        />

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Save Rating Type" submittingLabel="Saving..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}

function TypeCombobox({
  value,
  onChange,
  existingTypes,
}: {
  value: string
  onChange: (val: string) => void
  existingTypes: string[]
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const trimmed = search.trim().toLowerCase()
  const filtered = trimmed
    ? existingTypes.filter((t) => t.toLowerCase().includes(trimmed))
    : existingTypes

  const showCreateOption = trimmed && !existingTypes.some((t) => t.toLowerCase() === trimmed)

  return (
    <div>
      <Label className="mb-1">Type</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            className={cn(
              'w-full justify-between font-normal',
              !value && 'text-muted-foreground',
            )}
          >
            <span className="truncate">{value || 'Select or type a new type...'}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={search} onValueChange={setSearch} placeholder="Search or type new..." />
            <CommandList className="max-h-60">
              <CommandEmpty>No matching types.</CommandEmpty>

              {filtered.map((type) => (
                <CommandItem
                  key={type}
                  value={type}
                  onSelect={() => {
                    onChange(type)
                    setSearch('')
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      value === type ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {type}
                </CommandItem>
              ))}

              {showCreateOption && (
                <CommandItem
                  value={`__create__${search.trim()}`}
                  onSelect={() => {
                    onChange(search.trim())
                    setSearch('')
                    setOpen(false)
                  }}
                >
                  Create &quot;{search.trim()}&quot;
                </CommandItem>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
