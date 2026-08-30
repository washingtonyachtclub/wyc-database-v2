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
  renewalId: string
  signatureDataUrl: string
  signedAt: string
  testAcknowledged: boolean
  wycNumber: number
}

export function createMemberWaiverPdf(input: MemberWaiverPdfInput) {
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
    signerRows: [
      ['Member name', `${input.firstName} ${input.lastName}`],
      ['Email', input.email],
      ['WYC number', String(input.wycNumber)],
      ['Renewal ID', input.renewalId],
    ],
    subject: 'Executed member acknowledgement, waiver, release, and consent',
  })
}
