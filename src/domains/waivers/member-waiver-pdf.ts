import { createExecutedWaiverPdf } from './executed-waiver-pdf'
import {
  finalMemberWaiverAcknowledgement,
  memberWaiverIntro,
  memberWaiverSections,
} from './member-waiver-content'

export type MemberWaiverPdfInput = {
  acceptanceId: string
  adultAcknowledged: boolean
  email: string
  firstName: string
  isMock: boolean
  lastName: string
  signatureDataUrl: string
  signedAt: string
  testAcknowledged: boolean
} & (
  | { applicationId: string; renewalId?: never; wycNumber?: never }
  | { applicationId?: never; renewalId: string; wycNumber: number }
)

export function createMemberWaiverPdf(input: MemberWaiverPdfInput) {
  const signerRows: [string, string][] =
    input.applicationId !== undefined
      ? [
          ['Applicant name', `${input.firstName} ${input.lastName}`],
          ['Email', input.email],
          ['Application ID', input.applicationId],
        ]
      : [
          ['Member name', `${input.firstName} ${input.lastName}`],
          ['Email', input.email],
          ['WYC number', String(input.wycNumber)],
          ['Renewal ID', input.renewalId],
        ]

  return createExecutedWaiverPdf({
    acceptanceId: input.acceptanceId,
    adultAcknowledged: input.adultAcknowledged,
    documentTitle: 'Washington Yacht Club Member Waiver',
    finalAcknowledgement: finalMemberWaiverAcknowledgement,
    headerTitle: 'Member Acknowledgement, Waiver, Release, and Consent',
    isMock: input.isMock,
    mockAcknowledged: input.testAcknowledged,
    sections: [
      { title: 'WASHINGTON YACHT CLUB', paragraphs: memberWaiverIntro },
      ...memberWaiverSections,
    ],
    signatureDataUrl: input.signatureDataUrl,
    signedAt: input.signedAt,
    signerRows,
    subject: 'Executed member acknowledgement, waiver, release, and consent',
  })
}
