import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { emptyGuestInput, GUEST_STATUSES, type GuestInput } from '@/domains/checkouts/schema'
import { withFieldGroup } from '@/hooks/form'

export const CheckoutGuestFields = withFieldGroup({
  defaultValues: { guests: [] as GuestInput[] },
  render: function CheckoutGuestFieldsRender({ group: form }) {
    return (
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
                            placeholder="Select guest status"
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
    )
  },
})
