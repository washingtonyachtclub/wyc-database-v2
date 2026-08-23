import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { formErrorMessage } from '@/components/ui/app-form-fields'
import {
  getCheckoutFormBoatTypesQueryOptions,
  getCheckoutMembersQueryOptions,
  getMyRatingsQueryOptions,
  useCreateCheckoutMutation,
} from '@/domains/checkouts/query-options'
import {
  type CheckoutInsert,
  checkoutInsertSchema,
  DESTINATIONS,
  emptyCheckoutInsert,
  emptyGuestInput,
  GUEST_STATUSES,
} from '@/domains/checkouts/schema'
import { useAppForm } from '@/hooks/form'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { ErrorAlert } from '../ui/ErrorAlert'
import { Label } from '../ui/label'
import { CheckoutQualificationField } from './CheckoutQualificationField'
import { MemberMultiCombobox } from './MemberMultiCombobox'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultValues(): CheckoutInsert {
  const now = new Date()
  const later = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  return {
    ...emptyCheckoutInsert,
    qualification: { ...emptyCheckoutInsert.qualification },
    departure: toLocalInput(now),
    expectedReturn: toLocalInput(later),
  }
}

export function CheckoutForm({
  skipperWycNumber,
  onSuccess,
}: {
  skipperWycNumber: number
  onSuccess: () => void | Promise<void>
}) {
  const { data: boatTypes = [] } = useQuery(getCheckoutFormBoatTypesQueryOptions())
  const { data: myRatings = [] } = useQuery(getMyRatingsQueryOptions())
  const { data: members = [] } = useQuery(getCheckoutMembersQueryOptions())
  const createCheckout = useCreateCheckoutMutation({ onSuccess })

  const form = useAppForm({
    defaultValues: defaultValues(),
    validators: { onSubmit: checkoutInsertSchema },
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
      acc[fleet].options.push({ value: boat.index, label: boat.type || `Boat ${boat.index}` })
      return acc
    }, {}),
  )

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-5"
    >
      <ErrorAlert error={createCheckout.error?.message} action="Checking out boat" />

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
            value={field.state.value}
            onChange={field.handleChange}
            ratings={myRatings}
            members={members}
            excludeSupervisor={[skipperWycNumber]}
            error={formErrorMessage(field.state.meta.errors)}
            showWycNumbers={false}
          />
        )}
      </form.AppField>

      <form.AppField name="destination">
        {(field) => {
          const error = formErrorMessage(field.state.meta.errors)
          return (
            <div>
              <Label className="mb-1">Destination *</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {DESTINATIONS.map((destination) => {
                  const selected = field.state.value === destination
                  return (
                    <Button
                      key={destination}
                      type="button"
                      variant={selected ? 'default' : 'outline'}
                      aria-pressed={selected}
                      className={cn(
                        'h-auto min-h-11 justify-start whitespace-normal text-left',
                        !selected &&
                          'border-foreground/30 shadow-sm hover:border-primary hover:bg-primary/5',
                      )}
                      onBlur={field.handleBlur}
                      onClick={() => field.handleChange(destination)}
                    >
                      {destination}
                    </Button>
                  )
                })}
              </div>
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
        <form.AppField name="expectedReturn">
          {(field) => <field.TextField label="Estimated return" type="datetime-local" required />}
        </form.AppField>
      </div>

      <form.AppField name="crew">
        {(field) => (
          <MemberMultiCombobox
            value={field.state.value}
            onChange={field.handleChange}
            members={members}
            exclude={[skipperWycNumber]}
            error={formErrorMessage(field.state.meta.errors)}
            showWycNumbers={false}
          />
        )}
      </form.AppField>

      <form.AppField name="guests" mode="array">
        {(guestsField) => (
          <div>
            <Label className="mb-1">Guests</Label>
            <div className="mb-3 space-y-1 text-sm text-muted-foreground">
              <p>
                All non-WYC members must complete a{' '}
                <a
                  href="https://waiver.washingtonyachtclub.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  waiver
                </a>
                .
              </p>
              <p>
                Make sure your guests are well dressed and aware of the inherent risks of sailing.
              </p>
            </div>
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

      <div className="pt-2">
        <form.AppForm>
          <form.SubmitButton label="Check out boat" submittingLabel="Checking out..." />
        </form.AppForm>
      </div>
    </form>
  )
}
