import { useSyncExternalStore } from 'react'

const QUERY = '(min-width: 48rem) and (hover: hover) and (pointer: fine)'

function subscribe(callback: () => void) {
  const mediaQuery = window.matchMedia(QUERY)
  mediaQuery.addEventListener('change', callback)
  return () => mediaQuery.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

export function useDesktopSelectControl() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
