import { createHash, randomUUID } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import db from '@/db'
import { guestWaivers } from '@/db/schema'
import { isDevEnvironment } from '@/lib/env'
import { guestWaiverVersion } from './guest-waiver-content'
import { createGuestWaiverPdf } from './guest-waiver-pdf'
import { uploadWaiverPdf } from './r2'

const requiredAcknowledgement = z.boolean().refine((value) => value, {
  message: 'Every acknowledgement is required',
})

const guestWaiverSchema = z.object({
  acknowledgements: z.object({
    assumptionOfRisk: requiredAcknowledgement,
    consentToTreatment: requiredAcknowledgement,
    indemnification: requiredAcknowledgement,
    intro: requiredAcknowledgement,
    miscellaneous: requiredAcknowledgement,
    waiverAndRelease: requiredAcknowledgement,
  }),
  dateOfBirth: z.iso.date().refine((value) => {
    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - 18)
    return value <= cutoff.toISOString().slice(0, 10)
  }, 'The signer must be at least 18 years old'),
  email: z.string().trim().toLowerCase().email().max(254),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  signatureDataUrl: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/),
  testAcknowledged: z.boolean(),
})

export type GuestWaiverInput = z.infer<typeof guestWaiverSchema>

export const submitGuestWaiver = createServerFn({ method: 'POST' })
  .inputValidator((input: GuestWaiverInput) => guestWaiverSchema.parse(input))
  .handler(async ({ data }) => {
    const isMock = isDevEnvironment()
    if (isMock && !data.testAcknowledged) {
      throw new Error('Mock waiver acknowledgement is required')
    }

    const acceptanceId = randomUUID()
    const signedAt = new Date().toISOString()
    const objectKey = isMock
      ? `mock/guest/${acceptanceId}.pdf`
      : `waivers/v1/guest/${signedAt.slice(0, 4)}/${acceptanceId}.pdf`
    const filename = `${isMock ? 'mock-' : ''}wyc-guest-waiver-${acceptanceId}.pdf`
    let pdf: Uint8Array
    let sha256: string

    try {
      pdf = await createGuestWaiverPdf({
        acceptanceId,
        acknowledgements: data.acknowledgements,
        dateOfBirth: data.dateOfBirth,
        email: data.email,
        firstName: data.firstName,
        isMock,
        lastName: data.lastName,
        signatureDataUrl: data.signatureDataUrl,
        signedAt,
      })
      sha256 = createHash('sha256').update(pdf).digest('hex')

      await uploadWaiverPdf({
        acceptanceId,
        body: pdf,
        filename,
        key: objectKey,
        sha256,
      })

      const { testAcknowledged, ...submittedValues } = data
      await db.insert(guestWaivers).values({
        id: acceptanceId,
        waiverVersion: guestWaiverVersion,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        dateOfBirth: data.dateOfBirth,
        submittedValues: isMock ? { ...submittedValues, testAcknowledged } : submittedValues,
        signedAt: new Date(signedAt),
        objectKey,
        pdfSha256: sha256,
        pdfSize: pdf.byteLength,
        pdfContentType: 'application/pdf',
      })
    } catch (error) {
      console.error('Guest waiver submission failed:', error)
      return {
        success: false as const,
        message: 'The waiver could not be signed and stored. Please try again.',
      }
    }

    if (isMock) {
      return {
        success: true as const,
        acceptanceId,
        isMock: true as const,
        objectKey,
        sha256,
        size: pdf.byteLength,
        signedAt,
      }
    }

    return {
      success: true as const,
      isMock: false as const,
    }
  })
