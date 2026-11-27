import { env } from 'cloudflare:workers'
import { maxPhotoEdge, type PhotoCrop } from './photo'

export class InvalidPhoto extends Error {}

export async function normalizePhoto(input: Buffer) {
  try {
    const bytes = new Response(new Uint8Array(input))
    const info = await env.IMAGES.info(bytes.clone().body!)
    if (
      !('width' in info) ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(info.format) ||
      info.width * info.height > 60_000_000
    )
      throw new InvalidPhoto()
    const transformed = await env.IMAGES.input(bytes.body!)
      .transform({ width: maxPhotoEdge, height: maxPhotoEdge, fit: 'scale-down' })
      .output({ format: 'image/webp', quality: 90, anim: false })
    return Buffer.from(await transformed.response().arrayBuffer())
  } catch {
    throw new InvalidPhoto()
  }
}

export async function cropPhoto(source: Buffer, area?: PhotoCrop) {
  const bytes = new Response(new Uint8Array(source))
  const info = await env.IMAGES.info(bytes.clone().body!)
  if (!('width' in info)) throw new InvalidPhoto()
  const { width, height } = info
  const side = Math.min(width, height)
  const crop = area ?? {
    x: ((width - side) / width) * 50,
    y: ((height - side) / height) * 50,
    width: (side / width) * 100,
    height: (side / height) * 100,
  }
  const size = Math.round((width * crop.width) / 100)
  if (
    size < 1 ||
    size > side ||
    Math.abs(size - (height * crop.height) / 100) > 2 ||
    crop.x + crop.width > 100.01 ||
    crop.y + crop.height > 100.01
  )
    throw new InvalidPhoto()
  const left = Math.min(width - size, Math.round((width * crop.x) / 100))
  const top = Math.min(height - size, Math.round((height * crop.y) / 100))
  const result = await env.IMAGES.input(bytes.body!)
    .transform({ trim: { left, top, right: width - left - size, bottom: height - top - size } })
    .transform({ width: 384, height: 384 })
    .output({ format: 'image/webp', quality: 86, anim: false })
  const avatar = Buffer.from(await result.response().arrayBuffer())
  return { crop, avatar }
}
