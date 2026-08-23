import { useEffect, useState } from 'react'

const mobileInputQuery = '(max-width: 767px) and (pointer: coarse)'

export function useNativeDateTimeInput() {
  const [native, setNative] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(mobileInputQuery)
    const update = () => setNative(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return native
}
