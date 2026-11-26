import { maxPhotoEdge, maxUploadBytes } from './photo'

export async function preparePhotoUpload(file: File): Promise<File> {
  if (file.size <= maxUploadBytes) return file
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Unsupported image format')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxPhotoEdge / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image processing unavailable')

    for (;;) {
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.9),
      )
      if (!blob) throw new Error('Image encoding failed')
      if (blob.size <= maxUploadBytes) return new File([blob], 'profile-photo', { type: blob.type })
      canvas.width = Math.max(1, Math.floor(canvas.width * 0.75))
      canvas.height = Math.max(1, Math.floor(canvas.height * 0.75))
    }
  } finally {
    bitmap.close()
  }
}
