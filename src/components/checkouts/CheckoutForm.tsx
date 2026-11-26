import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formErrorMessage } from '@/components/ui/app-form-fields'
import { boatTypeGroups } from '@/domains/boat-types/order'
import {
  getCheckoutFormBoatTypesQueryOptions,
  getMyRatingsQueryOptions,
  useCreateCheckoutMutation,
} from '@/domains/checkouts/query-options'
import {
  type CheckoutInsert,
  checkoutInsertSchema,
  DESTINATIONS,
  emptyCheckoutInsert,
} from '@/domains/checkouts/schema'
import { useAppForm } from '@/hooks/form'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { ErrorAlert } from '../ui/ErrorAlert'
import { Label } from '../ui/label'
import { CheckoutGuestFields } from './CheckoutGuestFields'
import { useCheckoutMemberOptions } from './use-checkout-member-options'
import { CheckoutQualificationField } from './CheckoutQualificationField'
import { MemberMultiCombobox } from './MemberMultiCombobox'

const PRIMARY_DESTINATIONS = DESTINATIONS.slice(0, 2)

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
  const [showMoreDestinations, setShowMoreDestinations] = useState(false)
  const { data: boatTypes = [] } = useQuery(getCheckoutFormBoatTypesQueryOptions())
  const { data: myRatings = [] } = useQuery(getMyRatingsQueryOptions())
  const { selectableMembers, searchAllMembers, rememberMember } = useCheckoutMemberOptions()
  const createCheckout = useCreateCheckoutMutation({ onSuccess })

  const form = useAppForm({
    defaultValues: defaultValues(),
    validators: { onSubmit: checkoutInsertSchema },
    onSubmit: async ({ value }) => {
      await createCheckout.mutateAsync({ data: value })
    },
  })

  const boatGroups = useMemo(() => boatTypeGroups(boatTypes), [boatTypes])
  const excludedMembers = useMemo(() => [skipperWycNumber], [skipperWycNumber])

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
            members={selectableMembers}
            excludeSupervisor={excludedMembers}
            searchAllMembers={searchAllMembers}
            onSelectMember={rememberMember}
            error={formErrorMessage(field.state.meta.errors)}
            showWycNumbers={false}
          />
        )}
      </form.AppField>

      <form.AppField name="destination">
        {(field) => {
          const error = formErrorMessage(field.state.meta.errors)
          const visibleDestinations = showMoreDestinations ? DESTINATIONS : PRIMARY_DESTINATIONS
          return (
            <div>
              <Label className="mb-1">Destination *</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {visibleDestinations.map((destination) => {
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
                {!showMoreDestinations && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 border-dashed text-muted-foreground sm:col-span-2"
                    aria-expanded="false"
                    onClick={() => setShowMoreDestinations(true)}
                  >
                    <ChevronDown className="h-4 w-4" />
                    More destinations
                  </Button>
                )}
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
            members={selectableMembers}
            exclude={excludedMembers}
            searchAllMembers={searchAllMembers}
            onSelectMember={rememberMember}
            error={formErrorMessage(field.state.meta.errors)}
            showWycNumbers={false}
          />
        )}
      </form.AppField>

      <CheckoutGuestFields form={form} fields={{ guests: 'guests' }} />

      <div className="pt-2">
        <form.AppForm>
          <form.SubmitButton label="Check out boat" submittingLabel="Checking out..." />
        </form.AppForm>
      </div>
    </form>
  )
}
