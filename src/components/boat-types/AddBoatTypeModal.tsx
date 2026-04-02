import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ErrorAlert } from '../ui/ErrorAlert'
import { boatTypeInsertSchema } from '@/domains/boat-types/schema'
import { useAppForm } from '../../hooks/form'
import {
  getDistinctFleetNamesQueryOptions,
  useCreateBoatTypeMutation,
} from '@/domains/boat-types/query-options'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../ui/command'
import { Label } from '../ui/label'
import { Modal } from '../ui/Modal'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

type AddBoatTypeModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export function AddBoatTypeModal({ onClose, onSuccess }: AddBoatTypeModalProps) {
  const { data: existingFleets = [] } = useQuery(getDistinctFleetNamesQueryOptions())

  const createMutation = useCreateBoatTypeMutation({ onSuccess, onClose })

  const form = useAppForm({
    defaultValues: { type: '', fleet: '', description: '' },
    validators: {
      onSubmit: boatTypeInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({ data: value })
    },
  })

  const mutationError = createMutation.error?.message

  return (
    <Modal onClose={onClose} title="New Boat Type">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        <ErrorAlert error={mutationError} action="Adding boat type" />

        <form.AppField
          name="type"
          children={(field) => <field.TextField label="Type" required />}
        />

        <form.AppField
          name="fleet"
          children={(field) => (
            <FleetCombobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              existingFleets={existingFleets}
            />
          )}
        />

        <form.AppField
          name="description"
          children={(field) => <field.TextAreaField label="Description" />}
        />

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Save Boat Type" submittingLabel="Saving..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}

function FleetCombobox({
  value,
  onChange,
  existingFleets,
}: {
  value: string
  onChange: (val: string) => void
  existingFleets: string[]
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const trimmed = search.trim().toLowerCase()
  const filtered = trimmed
    ? existingFleets.filter((f) => f.toLowerCase().includes(trimmed))
    : existingFleets

  const showCreateOption = trimmed && !existingFleets.some((f) => f.toLowerCase() === trimmed)

  return (
    <div>
      <Label className="mb-1">Fleet</Label>
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
            <span className="truncate">{value || 'Select or type a new fleet...'}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={search} onValueChange={setSearch} placeholder="Search or type new..." />
            <CommandList className="max-h-60">
              <CommandEmpty>No matching fleets.</CommandEmpty>

              {filtered.map((fleet) => (
                <CommandItem
                  key={fleet}
                  value={fleet}
                  onSelect={() => {
                    onChange(fleet)
                    setSearch('')
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      value === fleet ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {fleet}
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
