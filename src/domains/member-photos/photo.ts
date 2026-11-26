export type PhotoCrop = { x: number; y: number; width: number; height: number }
export const maxPhotoEdge = 2560
export const maxUploadBytes = 4 * 1024 * 1024

export function photoUrl(wycNumber: number, version: string, source = false) {
  const query = new URLSearchParams({ v: version })
  if (source) query.set('source', '1')
  return `/api/member-photo/${wycNumber}?${query}`
}
