import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

let cached: { Bucket: string; client: S3Client } | undefined
function storage() {
  if (cached) return cached
  const {
    R2_ENDPOINT: endpoint,
    R2_PROFILE_BUCKET: Bucket,
    R2_PROFILE_ACCESS_KEY_ID: accessKeyId,
    R2_PROFILE_SECRET_ACCESS_KEY: secretAccessKey,
  } = process.env
  if (!endpoint || !Bucket || !accessKeyId || !secretAccessKey)
    throw new Error('Member photo storage is unavailable')
  cached = {
    Bucket,
    client: new S3Client({
      endpoint,
      region: 'auto',
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    }),
  }
  return cached
}
export async function readPhoto(key: string) {
  const { Bucket, client } = storage()
  const { Body } = await client.send(new GetObjectCommand({ Bucket, Key: key }))
  if (!Body) throw new Error('Missing image')
  return Buffer.from(await Body.transformToByteArray())
}
export async function writePhoto(kind: 'source' | 'avatar', body: Buffer) {
  const key = `profiles/${kind}/${crypto.randomUUID()}.webp`
  const { Bucket, client } = storage()
  await client.send(
    new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: 'image/webp' }),
  )
  return key
}
export async function discardPhoto(key: string) {
  const { Bucket, client } = storage()
  await client.send(new DeleteObjectCommand({ Bucket, Key: key }))
}
