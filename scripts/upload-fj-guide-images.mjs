import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const bucket = 'wyc-public-media'
const objectPrefix = 'website/guides/fj'
const verifyOnly = process.argv.includes('--verify-only')

const config = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: process.env.R2_ENDPOINT,
}

for (const [name, value] of Object.entries({
  accessKeyId: config.accessKeyId,
  secretAccessKey: config.secretAccessKey,
  endpoint: config.endpoint,
})) {
  if (!value) throw new Error(`${name} is required`)
}

const sourceDirectory = path.resolve('public/guides/fj/images')
const guideSource = await readFile(path.resolve('src/routes/guides.fj.tsx'), 'utf8')
const referencedFiles = new Set(
  [...guideSource.matchAll(/file="([^"]+\.webp)"/g)].map((match) => match[1]),
)
const availableFiles = new Set(
  (await readdir(sourceDirectory)).filter((file) => file.endsWith('.webp')),
)
const files = [...referencedFiles].sort()

if (files.length === 0) throw new Error('No FJ guide images found')

const missingFiles = files.filter((file) => !availableFiles.has(file))
if (missingFiles.length > 0) {
  throw new Error(`Missing referenced FJ guide images: ${missingFiles.join(', ')}`)
}

const client = new S3Client({
  region: 'auto',
  endpoint: config.endpoint,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
})

if (!verifyOnly) {
  for (const file of files) {
    const body = await readFile(path.join(sourceDirectory, file))
    const sha256 = createHash('sha256').update(body).digest('hex')
    const key = `${objectPrefix}/${file}`

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        CacheControl: 'public, max-age=86400',
        ContentType: 'image/webp',
        Metadata: { sha256 },
      }),
    )

    console.log(`Uploaded ${key}`)
  }
}

const listed = await client.send(
  new ListObjectsV2Command({ Bucket: bucket, Prefix: `${objectPrefix}/` }),
)
const uploadedKeys = new Set((listed.Contents ?? []).map((object) => object.Key))
const missingKeys = files
  .map((file) => `${objectPrefix}/${file}`)
  .filter((key) => !uploadedKeys.has(key))

if (missingKeys.length > 0) {
  throw new Error(`Missing uploaded FJ guide objects: ${missingKeys.join(', ')}`)
}

console.log(`Verified ${files.length} objects in ${bucket}`)
