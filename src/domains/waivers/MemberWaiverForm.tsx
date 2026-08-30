import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { isDevEnvironment } from '@/lib/env'
import { SignaturePad } from './SignaturePad'
import {
  adultAcknowledgement,
  finalMemberWaiverAcknowledgement,
  memberWaiverIntro,
  memberWaiverSections,
} from './member-waiver-content'
import { submitMemberWaiver, type MemberWaiverInput } from './member-waiver-server-fns'
import { WaiverText } from './WaiverText'

type CompletedResult = {
  emailSent: boolean
  emailSimulated: boolean
  quarterLabel: string | null
}

export function MemberWaiverForm({
  member,
  renewal,
  onCompleted,
}: {
  member: { email: string; firstName: string; lastName: string }
  renewal: { id: string; source: string; targetLabel: string }
  onCompleted: (result: CompletedResult) => void
}) {
  const isMock = isDevEnvironment()
  const queryClient = useQueryClient()
  const [adultAcknowledged, setAdultAcknowledged] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState('')
  const [testAcknowledged, setTestAcknowledged] = useState(false)
  const mutation = useMutation({
    mutationFn: (input: MemberWaiverInput) => submitMemberWaiver({ data: input }),
  })

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    try {
      const result = await mutation.mutateAsync({
        adultAcknowledged,
        renewalId: renewal.id,
        signatureDataUrl,
        testAcknowledged,
      })
      if (!result.success) return
      if (result.renewalCompleted) {
        onCompleted({
          emailSent: 'emailSent' in result ? result.emailSent : false,
          emailSimulated: 'emailSimulated' in result ? result.emailSimulated : false,
          quarterLabel: 'quarterLabel' in result ? result.quarterLabel : renewal.targetLabel,
        })
        await queryClient.invalidateQueries({ queryKey: ['members'] })
        await queryClient.invalidateQueries({ queryKey: ['stats', 'membership'] })
      }
      await queryClient.invalidateQueries({ queryKey: ['renewals', 'status'] })
      await queryClient.invalidateQueries({ queryKey: ['exemptions', 'pending'] })
    } catch {
      return
    }
  }

  if (mutation.data?.success && !mutation.data.renewalCompleted) {
    return (
      <div className="w-full space-y-5 bg-background p-4">
        <h1 className="text-2xl font-bold">Waiver signed</h1>
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-5 text-foreground">
          <p className="font-semibold">Your member waiver has been stored.</p>
          <p className="mt-1">
            Your dues-exemption request is ready for officer review. Your membership will update
            automatically after approval.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-background">
      {isMock && (
        <div className="m-4 rounded-lg border-2 border-destructive bg-destructive/10 p-5 text-destructive">
          <p className="text-xl font-black tracking-wide">MOCK WAIVER - TESTING PURPOSES ONLY</p>
          <p className="mt-2 font-semibold">
            This is not a valid waiver. Submitting creates a development record and PDF.
          </p>
        </div>
      )}

      <header className="space-y-3 border-b px-4 py-7 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Washington Yacht Club
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Complete your renewal</h1>
        <p className="text-muted-foreground">
          {renewal.source === 'paid'
            ? 'Your payment was received. Sign the member waiver to finish your renewal.'
            : 'Sign the member waiver so an officer can review your dues-exemption request.'}
        </p>
        <dl className="grid gap-1 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="font-medium">Member</dt>
          <dd>
            {member.firstName} {member.lastName}
          </dd>
          <dt className="font-medium">Email</dt>
          <dd className="break-all">{member.email}</dd>
          <dt className="font-medium">Requested through</dt>
          <dd>{renewal.targetLabel}</dd>
        </dl>
      </header>

      <form onSubmit={submit} className="divide-y">
        <section className="space-y-4 px-4 py-7 sm:px-6 lg:px-8">
          {memberWaiverIntro.map((paragraph) => (
            <p key={paragraph.text} className="leading-7 text-foreground">
              <WaiverText paragraph={paragraph} />
            </p>
          ))}
        </section>

        {memberWaiverSections.map((section) => (
          <section key={section.id} className="space-y-5 px-4 py-7 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{section.title}</h2>
            <div className="space-y-4 text-[15px] leading-7 text-foreground">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.text}>
                  <WaiverText paragraph={paragraph} />
                </p>
              ))}
              {section.orderedItems.length > 0 && (
                <ol className="list-decimal space-y-4 pl-6">
                  {section.orderedItems.map((paragraph) => (
                    <li key={paragraph.text}>
                      <WaiverText paragraph={paragraph} />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        ))}

        <section className="space-y-7 px-4 py-7 sm:px-6 lg:px-8">
          <div className="space-y-4 rounded-lg border-2 border-foreground bg-muted p-5 leading-7 text-foreground">
            {finalMemberWaiverAcknowledgement.map((paragraph) => (
              <p key={paragraph.text}>
                <WaiverText paragraph={paragraph} />
              </p>
            ))}
          </div>

          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            <Checkbox
              id="member-adult-acknowledgement"
              checked={adultAcknowledged}
              onCheckedChange={(checked) => setAdultAcknowledged(checked === true)}
              disabled={mutation.isPending}
            />
            <Label htmlFor="member-adult-acknowledgement" className="leading-5">
              {adultAcknowledgement}
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Signature</Label>
            <SignaturePad disabled={mutation.isPending} onChange={setSignatureDataUrl} />
          </div>

          {isMock && (
            <div className="flex items-start gap-3 rounded-lg border-2 border-destructive bg-destructive/10 p-4">
              <Checkbox
                id="member-test-acknowledged"
                checked={testAcknowledged}
                onCheckedChange={(checked) => setTestAcknowledged(checked === true)}
                disabled={mutation.isPending}
              />
              <Label htmlFor="member-test-acknowledged" className="leading-5 text-destructive">
                I understand that this is a mock test and does not create a valid waiver.
              </Label>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={
              mutation.isPending ||
              !adultAcknowledged ||
              !signatureDataUrl ||
              (isMock && !testAcknowledged)
            }
          >
            {mutation.isPending
              ? 'Signing and storing...'
              : isMock
                ? 'Sign mock waiver'
                : 'Sign waiver'}
          </Button>

          {mutation.data && !mutation.data.success && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              {mutation.data.message}
            </div>
          )}
          {mutation.isError && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              The waiver could not be submitted. Check the form and try again.
            </div>
          )}
        </section>
      </form>
    </div>
  )
}
