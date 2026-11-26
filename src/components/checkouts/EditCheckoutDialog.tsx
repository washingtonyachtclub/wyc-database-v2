import { useQuery } from '@tanstack/react-query'
import { formErrorMessage } from '@/components/ui/app-form-fields'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Label } from '@/components/ui/label'
import type { MemberLite } from '@/components/ui/MemberCombobox'
import { Modal } from '@/components/ui/Modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getCheckoutEditQueryOptions,
  useEditCheckoutMutation,
} from '@/domains/checkouts/query-options'
import {
  checkoutEditSchema,
  DESTINATIONS,
  type CheckoutCard,
  type CheckoutEdit,
} from '@/domains/checkouts/schema'
import { useAppForm } from '@/hooks/form'
import { CheckoutGuestFields } from './CheckoutGuestFields'
import { MemberMultiCombobox } from './MemberMultiCombobox'
import { useCheckoutMemberOptions } from './use-checkout-member-options'

export function EditCheckoutDialog({
  checkout,
  viewerWycNumber,
  onClose,
  onSaved,
}: {
  checkout: CheckoutCard
  viewerWycNumber: number
  onClose: () => void
  onSaved?: () => void | Promise<void>
}) {
  const details = useQuery(getCheckoutEditQueryOptions(checkout.index, viewerWycNumber))
  const edit = useEditCheckoutMutation(async () => {
    onClose()
    await onSaved?.()
  })
  const cancel = () => {
    if (!edit.isPending) onClose()
  }

  return (
    <Modal
      title={checkout.boatName ? `Edit ${checkout.boatName} checkout` : 'Edit checkout'}
      onClose={cancel}
      contentClassName="max-h-[calc(100dvh-2rem)] overflow-y-auto"
    >
      {details.isPending && <p role="status">Loading checkout…</p>}
      <ErrorAlert error={details.error?.message} action="Loading checkout" />
      <ErrorAlert error={edit.error?.message} action="Editing checkout" />
      {details.data && (
        <EditCheckoutForm
          values={details.data.values}
          skipperWycNumber={details.data.skipperWycNumber}
          crewMembers={details.data.crewMembers}
          onCancel={cancel}
          onSave={(changes) => edit.mutateAsync({ data: { index: checkout.index, changes } })}
        />
      )}
    </Modal>
  )
}

function EditCheckoutForm({
  values,
  skipperWycNumber,
  crewMembers,
  onCancel,
  onSave,
}: {
  values: CheckoutEdit
  skipperWycNumber: number
  crewMembers: MemberLite[]
  onCancel: () => void
  onSave: (changes: CheckoutEdit) => Promise<unknown>
}) {
  const { selectableMembers, searchAllMembers, rememberMember } =
    useCheckoutMemberOptions(crewMembers)
  const form = useAppForm({
    defaultValues: values,
    validators: { onSubmit: checkoutEditSchema },
    onSubmit: ({ value }) =>
      onSave(value).then(
        () => undefined,
        () => undefined,
      ),
  })

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      className="space-y-5"
    >
      <form.AppField name="destination">
        {(field) => (
          <div>
            <Label htmlFor={field.name} className="mb-1">
              Destination
            </Label>
            <Select
              value={field.state.value}
              onValueChange={(value) => {
                const destination = DESTINATIONS.find((option) => option === value)
                if (destination) field.handleChange(destination)
              }}
            >
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue placeholder="Select a destination" />
              </SelectTrigger>
              <SelectContent>
                {DESTINATIONS.map((destination) => (
                  <SelectItem key={destination} value={destination}>
                    {destination}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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
      <form.AppField name="expectedReturn">
        {(field) => (
          <field.TextField label="Estimated return (Pacific)" type="datetime-local" required />
        )}
      </form.AppField>
      <form.AppField name="crew">
        {(field) => (
          <MemberMultiCombobox
            value={field.state.value}
            onChange={field.handleChange}
            members={selectableMembers}
            exclude={[skipperWycNumber]}
            searchAllMembers={searchAllMembers}
            onSelectMember={rememberMember}
            error={formErrorMessage(field.state.meta.errors)}
            showWycNumbers={false}
          />
        )}
      </form.AppField>
      <CheckoutGuestFields form={form} fields={{ guests: 'guests' }} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <form.AppForm>
          <form.SubmitButton label="Save Changes" submittingLabel="Saving…" />
        </form.AppForm>
      </div>
    </form>
  )
}
