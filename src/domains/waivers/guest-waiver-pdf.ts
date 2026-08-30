import {
  finalGuestWaiverAcknowledgement,
  guestWaiverSections,
  sectionAcknowledgement,
} from './guest-waiver-content'
import { createExecutedWaiverPdf } from './executed-waiver-pdf'

export type GuestWaiverPdfInput = {
  acceptanceId: string
  acknowledgements: Record<(typeof guestWaiverSections)[number]['id'], boolean>
  adultAcknowledged: boolean
  email: string
  firstName: string
  lastName: string
  isMock: boolean
  signatureDataUrl: string
  signedAt: string
  testAcknowledged: boolean
}

export function createGuestWaiverPdf(input: GuestWaiverPdfInput) {
  return createExecutedWaiverPdf({
    acceptanceId: input.acceptanceId,
    adultAcknowledged: input.adultAcknowledged,
    documentTitle: 'Washington Yacht Club Participant Agreement',
    finalAcknowledgement: finalGuestWaiverAcknowledgement,
    headerTitle: 'Washington Yacht Club Participant Agreement',
    isMock: input.isMock,
    mockAcknowledged: input.testAcknowledged,
    sections: guestWaiverSections.map((section) => ({
      title: section.title,
      paragraphs: section.paragraphs,
      acknowledgement: {
        checked: input.acknowledgements[section.id],
        text: sectionAcknowledgement,
      },
    })),
    signatureDataUrl: input.signatureDataUrl,
    signedAt: input.signedAt,
    signerRows: [
      ['Full legal name', `${input.firstName} ${input.lastName}`],
      ['Email', input.email],
    ],
    subject: 'Executed participant agreement',
  })
}
