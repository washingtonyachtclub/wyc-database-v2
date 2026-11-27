import { maxPhotoEdge, type PhotoCrop } from './photo'

export class InvalidPhoto extends Error {}

export async function normalizePhoto(input: Buffer) {
  const { default: sharp } = await import('sharp')
  try {
    const image = sharp(input, { limitInputPixels: 60_000_000 })
    const { format, pages } = await image.metadata()
    if (!format || !['jpeg', 'png', 'webp'].includes(format) || (pages ?? 1) > 1) {
      throw new InvalidPhoto()
    }
    return await image
      .autoOrient()
      .resize({
        width: maxPhotoEdge,
        height: maxPhotoEdge,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 90 })
      .toBuffer()
  } catch {
    throw new InvalidPhoto()
  }
}

export async function cropPhoto(source: Buffer, area?: PhotoCrop) {
  const { default: sharp } = await import('sharp')
  const image = sharp(source)
  const { width, height } = await image.metadata()
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
  const avatar = await image
    .extract({ left, top, width: size, height: size })
    .resize(384, 384)
    .webp({ quality: 86 })
    .toBuffer()
  return { crop, avatar }
}
