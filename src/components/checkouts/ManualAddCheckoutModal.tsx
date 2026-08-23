import { useQuery } from '@tanstack/react-query'
import { Plus, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Label } from '@/components/ui/label'
import { MemberCombobox } from '@/components/ui/MemberCombobox'
import { Modal } from '@/components/ui/Modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formErrorMessage } from '@/components/ui/app-form-fields'
import {
  getCheckoutBoatTypesQueryOptions,
  getCheckoutMembersQueryOptions,
  useCreateManualCheckoutMutation,
} from '@/domains/checkouts/query-options'
import {
  DESTINATIONS,
  emptyGuestInput,
  emptyManualCheckoutInsert,
  GUEST_STATUSES,
  type ManualCheckoutInsert,
  manualCheckoutInsertSchema,
} from '@/domains/checkouts/schema'
import { getRatingTypesQueryOptions } from '@/domains/ratings/query-options'
import { useAppForm } from '@/hooks/form'
import { CheckoutQualificationField } from './CheckoutQualificationField'
import { MemberMultiCombobox } from './MemberMultiCombobox'

type ManualAddCheckoutModalProps = {
  onClose: () => void
}

export function ManualAddCheckoutModal({ onClose }: ManualAddCheckoutModalProps) {
  const [skipperWycNumber, setSkipperWycNumber] = useState(0)
  const { data: boatTypes = [] } = useQuery(getCheckoutBoatTypesQueryOptions())
  const { data: members = [] } = useQuery(getCheckoutMembersQueryOptions())
  const { data: ratings = [] } = useQuery(getRatingTypesQueryOptions())
  const createCheckout = useCreateManualCheckoutMutation({ onSuccess: onClose })

  const form = useAppForm({
    defaultValues: {
      ...emptyManualCheckoutInsert,
      qualification: { ...emptyManualCheckoutInsert.qualification },
    },
    validators: { onSubmit: manualCheckoutInsertSchema },
    onSubmit: async ({ value }) => {
      await createCheckout.mutateAsync({ data: value })
    },
  })

  const boatGroups = Object.values(
    boatTypes.reduce<
      Record<string, { label: string; options: { value: number; label: string }[] }>
    >((acc, boat) => {
      const fleet = boat.fleet || 'Other'
      acc[fleet] ??= { label: fleet, options: [] }
      acc[fleet].options.push({
        value: boat.index,
        label: `${boat.type || `Boat ${boat.index}`}${boat.active ? '' : ' (inactive)'}`,
      })
      return acc
    }, {}),
  )

  return (
    <Modal onClose={onClose} title="Manual Boat Checkout">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          form.handleSubmit()
        }}
        className="max-h-[75vh] space-y-5 overflow-y-auto pr-1"
      >
        <div className="flex gap-2 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Use manual entry only for special cases, such as recording a checkout after it has
            already happened. Standard checkouts should go through the checkout page.
          </p>
        </div>

        <ErrorAlert error={createCheckout.error?.message} action="Adding manual checkout" />

        <form.AppField name="skipperWycNumber">
          {(field) => (
            <MemberCombobox
              label="Skipper"
              required
              value={field.state.value || null}
              onChange={(value) => {
                const nextValue = value ?? 0
                field.handleChange(nextValue)
                setSkipperWycNumber(nextValue)
                form.setFieldValue('qualification', {
                  supervised: false,
                  relevantRatingId: 0,
                })
                form.setFieldValue('crew', (crew) => crew.filter((id) => id !== nextValue))
              }}
              members={members}
              placeholder="Search for a skipper..."
              error={formErrorMessage(field.state.meta.errors)}
            />
          )}
        </form.AppField>

        <form.AppField name="boatId">
          {(field) => (
            <field.GroupedSelectField
              label="Boat"
              required
              placeholder="Select a boat"
              groups={boatGroups}
            />
          )}
        </form.AppField>

        <form.AppField name="qualification">
          {(field) => (
            <CheckoutQualificationField
              key={skipperWycNumber}
              value={field.state.value}
              onChange={field.handleChange}
              ratings={ratings}
              members={members}
              excludeSupervisor={skipperWycNumber > 0 ? [skipperWycNumber] : []}
              error={formErrorMessage(field.state.meta.errors)}
            />
          )}
        </form.AppField>

        <form.AppField name="destination">
          {(field) => {
            const error = formErrorMessage(field.state.meta.errors)
            return (
              <div>
                <Label className="mb-1">Destination *</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) =>
                    field.handleChange(value as ManualCheckoutInsert['destination'])
                  }
                >
                  <SelectTrigger onBlur={field.handleBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DESTINATIONS.map((destination) => (
                      <SelectItem key={destination} value={destination}>
                        {destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
              </div>
            )
          }}
        </form.AppField>

        <form.Subscribe selector={(state) => state.values.destination}>
          {(destination) =>
            destination === 'Other' && (
              <form.AppField name="otherDestination">
                {(field) => <field.TextField label="Other destination" required />}
              </form.AppField>
            )
          }
        </form.Subscribe>

        <div className="grid gap-4 sm:grid-cols-2">
          <form.AppField name="departure">
            {(field) => <field.TextField label="Departure" type="datetime-local" required />}
          </form.AppField>
          <form.AppField name="timeReturn">
            {(field) => <field.TextField label="Actual return" type="datetime-local" required />}
          </form.AppField>
        </div>

        <form.AppField name="crew">
          {(field) => (
            <MemberMultiCombobox
              value={field.state.value}
              onChange={field.handleChange}
              members={members}
              exclude={skipperWycNumber > 0 ? [skipperWycNumber] : []}
              error={formErrorMessage(field.state.meta.errors)}
            />
          )}
        </form.AppField>

        <form.AppField name="guests" mode="array">
          {(guestsField) => (
            <div>
              <Label className="mb-1">Guests</Label>
              <div className="space-y-3">
                {guestsField.state.value.map((_, index) => (
                  <div key={index} className="rounded-md border p-3">
                    <div className="flex items-start gap-2">
                      <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        <form.AppField name={`guests[${index}].name`}>
                          {(field) => <field.TextField label="Name" required />}
                        </form.AppField>
                        <form.AppField name={`guests[${index}].status`}>
                          {(field) => (
                            <field.SelectField
                              label="Status"
                              required
                              options={GUEST_STATUSES.map((status) => ({
                                value: status.value,
                                label: status.label,
                              }))}
                            />
                          )}
                        </form.AppField>
                        <form.AppField name={`guests[${index}].email`}>
                          {(field) => <field.TextField label="Email" type="email" />}
                        </form.AppField>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Remove guest"
                        className="mt-6 h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => guestsField.removeValue(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => guestsField.pushValue({ ...emptyGuestInput })}
              >
                <Plus className="h-4 w-4" />
                Add guest
              </Button>
            </div>
          )}
        </form.AppField>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton label="Add checkout" submittingLabel="Adding..." />
          </form.AppForm>
        </div>
      </form>
    </Modal>
  )
}
