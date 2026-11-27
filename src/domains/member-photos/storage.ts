import { env } from 'cloudflare:workers'

export async function readPhoto(key: string) {
  const object = await env.PROFILE_PHOTOS.get(key)
  if (!object) throw new Error('Missing image')
  return Buffer.from(await object.arrayBuffer())
}

export async function writePhoto(kind: 'source' | 'avatar', body: Buffer) {
  const key = `profiles/${kind}/${crypto.randomUUID()}.webp`
  await env.PROFILE_PHOTOS.put(key, new Uint8Array(body), {
    httpMetadata: { contentType: 'image/webp' },
  })
  return key
}

export function discardPhoto(key: string) {
  return env.PROFILE_PHOTOS.delete(key)
}
