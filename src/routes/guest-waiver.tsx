import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SignaturePad } from '@/domains/waivers/SignaturePad'
import {
  finalGuestWaiverAcknowledgement,
  guestWaiverSections,
  sectionAcknowledgement,
} from '@/domains/waivers/guest-waiver-content'
import { submitGuestWaiver, type GuestWaiverInput } from '@/domains/waivers/server-fns'
import { isDevEnvironment } from '@/lib/env'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/guest-waiver')({
  component: GuestWaiverPage,
})

const initialForm: GuestWaiverInput = {
  acknowledgements: {
    assumptionOfRisk: false,
    consentToTreatment: false,
    indemnification: false,
    intro: false,
    miscellaneous: false,
    waiverAndRelease: false,
  },
  confirmEmail: '',
  dateOfBirth: '',
  email: '',
  firstName: '',
  lastName: '',
  signatureDataUrl: '',
  testAcknowledged: false,
}

function GuestWaiverPage() {
  const isMock = isDevEnvironment()
  const [form, setForm] = useState(initialForm)
  const mutation = useMutation({
    mutationFn: () => submitGuestWaiver({ data: form }),
  })

  function setField<K extends keyof GuestWaiverInput>(field: K, value: GuestWaiverInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function setAcknowledgement(field: keyof GuestWaiverInput['acknowledgements'], value: boolean) {
    setForm((current) => ({
      ...current,
      acknowledgements: { ...current.acknowledgements, [field]: value },
    }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  const allSectionsAcknowledged = Object.values(form.acknowledgements).every(Boolean)
  const emailsMatch = form.email.trim().toLowerCase() === form.confirmEmail.trim().toLowerCase()
  const adultBirthDate = new Date()
  adultBirthDate.setFullYear(adultBirthDate.getFullYear() - 18)

  if (mutation.data?.success) {
    const result = mutation.data
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-12">
        <main className="mx-auto max-w-2xl">
          <div className="space-y-5 rounded-xl border bg-card p-6 shadow-sm sm:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
                Washington Yacht Club
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                {result.isMock ? 'Mock acceptance stored' : 'Waiver signed'}
              </h1>
            </div>

            <p>
              {result.isMock
                ? 'The development acceptance and test PDF were stored successfully.'
                : 'Your signed Participant Agreement has been stored successfully.'}
            </p>

            <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
              <dt className="font-medium">Acceptance ID</dt>
              <dd className="break-all font-mono text-xs">{result.acceptanceId}</dd>
              {result.isMock && (
                <>
                  <dt className="font-medium">Object key</dt>
                  <dd className="break-all font-mono text-xs">{result.objectKey}</dd>
                  <dt className="font-medium">SHA-256</dt>
                  <dd className="break-all font-mono text-xs">{result.sha256}</dd>
                  <dt className="font-medium">Size</dt>
                  <dd>{result.size.toLocaleString()} bytes</dd>
                </>
              )}
            </dl>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(initialForm)
                mutation.reset()
              }}
            >
              Sign another waiver
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-12">
      <main className="mx-auto max-w-3xl space-y-6">
        {isMock && (
          <div className="rounded-xl border-4 border-red-700 bg-red-50 p-5 text-red-950 shadow-sm sm:p-6">
            <p className="text-xl font-black tracking-wide sm:text-2xl">
              MOCK WAIVER - TESTING PURPOSES ONLY
            </p>
            <p className="mt-2 font-semibold">
              This is not a valid waiver. Use fake information while testing.
            </p>
            <p className="mt-1 text-sm">
              Submitting creates a test record and PDF in the development systems.
            </p>
          </div>
        )}

        <div className="rounded-xl border bg-card shadow-sm">
          <header className="border-b px-6 py-7 sm:px-10 sm:py-9">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
              Washington Yacht Club
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Participant&apos;s Agreement
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Read and acknowledge each section, then complete the signer information and draw a
              signature below.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="divide-y">
            <div className="space-y-5 px-6 py-7 sm:px-10 sm:py-9">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => setField('email', event.target.value)}
                    disabled={mutation.isPending}
                    required
                    maxLength={254}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="confirm-email">Confirm email</Label>
                  <Input
                    id="confirm-email"
                    type="email"
                    autoComplete="email"
                    value={form.confirmEmail}
                    onChange={(event) => setField('confirmEmail', event.target.value)}
                    disabled={mutation.isPending}
                    required
                    maxLength={254}
                    aria-invalid={Boolean(form.confirmEmail) && !emailsMatch}
                  />
                  {form.confirmEmail && !emailsMatch && (
                    <p className="text-sm text-destructive">The email addresses do not match.</p>
                  )}
                </div>
              </div>
            </div>

            {guestWaiverSections.map((section) => (
              <section key={section.id} className="space-y-5 px-6 py-7 sm:px-10 sm:py-9">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">{section.title}</h2>
                <div className="space-y-4 text-[15px] leading-7 text-slate-800">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4">
                  <Checkbox
                    id={`acknowledge-${section.id}`}
                    checked={form.acknowledgements[section.id]}
                    onCheckedChange={(checked) => setAcknowledgement(section.id, checked === true)}
                    disabled={mutation.isPending}
                  />
                  <Label htmlFor={`acknowledge-${section.id}`} className="leading-5 text-slate-900">
                    {sectionAcknowledgement}
                  </Label>
                </div>
              </section>
            ))}

            <section className="space-y-7 px-6 py-7 sm:px-10 sm:py-9">
              <div className="space-y-4 rounded-lg border-2 border-slate-800 bg-slate-50 p-5 font-bold leading-7 text-slate-950">
                {finalGuestWaiverAcknowledgement.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input
                    id="first-name"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={(event) => setField('firstName', event.target.value)}
                    disabled={mutation.isPending}
                    required
                    maxLength={60}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input
                    id="last-name"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={(event) => setField('lastName', event.target.value)}
                    disabled={mutation.isPending}
                    required
                    maxLength={60}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="date-of-birth">Date of birth</Label>
                  <Input
                    id="date-of-birth"
                    type="date"
                    autoComplete="bday"
                    value={form.dateOfBirth}
                    onChange={(event) => setField('dateOfBirth', event.target.value)}
                    disabled={mutation.isPending}
                    max={adultBirthDate.toISOString().slice(0, 10)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">The signer must be 18 or older.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Signature</Label>
                <SignaturePad
                  disabled={mutation.isPending}
                  onChange={(signatureDataUrl) => setField('signatureDataUrl', signatureDataUrl)}
                />
              </div>

              {isMock && (
                <div className="flex items-start gap-3 rounded-lg border-2 border-red-300 bg-red-50 p-4">
                  <Checkbox
                    id="test-acknowledged"
                    checked={form.testAcknowledged}
                    onCheckedChange={(checked) => setField('testAcknowledged', checked === true)}
                    disabled={mutation.isPending}
                  />
                  <Label htmlFor="test-acknowledged" className="leading-5 text-red-950">
                    I understand that this submission is a mock test and does not create a valid
                    waiver.
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={
                  mutation.isPending ||
                  !allSectionsAcknowledged ||
                  !form.firstName.trim() ||
                  !form.lastName.trim() ||
                  !form.email.trim() ||
                  !emailsMatch ||
                  !form.dateOfBirth ||
                  !form.signatureDataUrl ||
                  (isMock && !form.testAcknowledged)
                }
              >
                {mutation.isPending
                  ? 'Signing and storing...'
                  : isMock
                    ? 'Sign mock waiver'
                    : 'Sign waiver'}
              </Button>
            </section>
          </form>

          {mutation.isError && (
            <div className="m-6 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive sm:m-10">
              The waiver could not be submitted. Check the form and try again.
            </div>
          )}

          {mutation.data && !mutation.data.success && (
            <div className="m-6 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive sm:m-10">
              {mutation.data.message}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
