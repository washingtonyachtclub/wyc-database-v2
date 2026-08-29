import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

type UploadWaiverPdfInput = {
  acceptanceId: string
  body: Uint8Array
  filename: string
  key: string
  sha256: string
}

function getR2Config() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const endpoint = process.env.R2_ENDPOINT
  const bucket = process.env.R2_WAIVER_BUCKET

  if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
    throw new Error('R2 waiver storage is not configured')
  }

  return { accessKeyId, secretAccessKey, endpoint, bucket }
}

export async function uploadWaiverPdf(input: UploadWaiverPdfInput) {
  const config = getR2Config()
  const client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: 'application/pdf',
      ContentDisposition: `attachment; filename="${input.filename}"`,
      Metadata: {
        acceptanceId: input.acceptanceId,
        sha256: input.sha256,
      },
    }),
  )
}
