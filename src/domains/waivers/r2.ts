import { env } from 'cloudflare:workers'

type UploadWaiverPdfInput = {
  acceptanceId: string
  body: Uint8Array
  filename: string
  key: string
  sha256: string
}

export async function uploadWaiverPdf(input: UploadWaiverPdfInput) {
  await env.WAIVERS.put(input.key, input.body, {
    httpMetadata: {
      contentType: 'application/pdf',
      contentDisposition: `attachment; filename="${input.filename}"`,
    },
    customMetadata: { acceptanceId: input.acceptanceId, sha256: input.sha256 },
  })
}
