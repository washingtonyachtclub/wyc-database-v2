import { useState } from 'react'
import { cn } from '@/lib/utils'
import { photoUrl } from '@/domains/member-photos/photo'

export function MemberAvatar({
  id,
  name,
  version,
  className,
  hideFallback = false,
}: {
  id: number
  name: string
  version: string
  className?: string
  hideFallback?: boolean
}) {
  const [failed, setFailed] = useState('')
  const showPhoto = version && failed !== version
  if (!showPhoto && hideFallback) return null
  const words = name.trim().split(/\s+/)
  const initials = [words[0], ...(words.length > 1 ? words.slice(-1) : [])]
    .map((word) => word?.[0])
    .join('')
    .toUpperCase()
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      {showPhoto ? (
        <img
          alt=""
          loading="lazy"
          className="size-full object-cover"
          src={photoUrl(id, version)}
          onError={() => setFailed(version)}
        />
      ) : (
        initials
      )}
    </span>
  )
}
