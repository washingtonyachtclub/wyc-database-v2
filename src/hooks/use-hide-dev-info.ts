import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'wyc_hide_dev_info'
const CHANGE_EVENT = 'wyc-hide-dev-info-change'

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(CHANGE_EVENT, callback)

  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(CHANGE_EVENT, callback)
  }
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setHideDevInfo(hidden: boolean) {
  try {
    if (hidden) {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    return
  }

  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useHideDevInfo() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
