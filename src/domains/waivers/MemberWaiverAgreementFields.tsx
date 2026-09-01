import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { SignaturePad } from './SignaturePad'
import {
  adultAcknowledgement,
  finalMemberWaiverAcknowledgement,
  memberWaiverIntro,
  memberWaiverSections,
} from './member-waiver-content'
import { WaiverText } from './WaiverText'

export function MemberWaiverAgreementFields({
  adultAcknowledged,
  adultError,
  disabled,
  idPrefix,
  isMock,
  onAdultAcknowledgedChange,
  onSignatureChange,
  onTestAcknowledgedChange,
  signatureError,
  testAcknowledged,
  testError,
}: {
  adultAcknowledged: boolean
  adultError?: string
  disabled: boolean
  idPrefix: string
  isMock: boolean
  onAdultAcknowledgedChange: (value: boolean) => void
  onSignatureChange: (value: string) => void
  onTestAcknowledgedChange: (value: boolean) => void
  signatureError?: string
  testAcknowledged: boolean
  testError?: string
}) {
  const adultId = `${idPrefix}-adult-acknowledgement`
  const testId = `${idPrefix}-test-acknowledgement`

  return (
    <>
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

        <div
          className={cn('rounded-lg border bg-muted/50 p-4', adultError && 'border-destructive')}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id={adultId}
              checked={adultAcknowledged}
              onCheckedChange={(checked) => onAdultAcknowledgedChange(checked === true)}
              disabled={disabled}
              aria-describedby={adultError ? `${adultId}-error` : undefined}
              aria-invalid={Boolean(adultError)}
            />
            <Label htmlFor={adultId} className="leading-5">
              {adultAcknowledgement}
              <span className="text-destructive" aria-hidden="true">
                {' '}
                *
              </span>
            </Label>
          </div>
          {adultError && (
            <p id={`${adultId}-error`} className="mt-2 text-sm text-destructive">
              {adultError}
            </p>
          )}
        </div>

        <div
          id={`${idPrefix}-signature`}
          className={cn('space-y-2', signatureError && 'rounded-lg ring-2 ring-destructive')}
          tabIndex={-1}
        >
          <Label>
            Signature
            <span className="text-destructive" aria-hidden="true">
              {' '}
              *
            </span>
          </Label>
          <SignaturePad disabled={disabled} onChange={onSignatureChange} />
          {signatureError && <p className="text-sm text-destructive">{signatureError}</p>}
        </div>

        {isMock && (
          <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id={testId}
                checked={testAcknowledged}
                onCheckedChange={(checked) => onTestAcknowledgedChange(checked === true)}
                disabled={disabled}
                aria-describedby={testError ? `${testId}-error` : undefined}
                aria-invalid={Boolean(testError)}
              />
              <Label htmlFor={testId} className="leading-5 text-destructive">
                I understand that this is a mock test and does not create a valid waiver.
                <span aria-hidden="true"> *</span>
              </Label>
            </div>
            {testError && (
              <p id={`${testId}-error`} className="mt-2 text-sm text-destructive">
                {testError}
              </p>
            )}
          </div>
        )}
      </section>
    </>
  )
}
