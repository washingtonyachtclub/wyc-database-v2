import { isDevEnvironment } from '@/lib/env'
import { useLocation } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

const MESSAGE_SOURCE = 'wyc-join-embed'
const SCROLL_EVENT = 'wyc-join-embed-scroll-to-top'
const WYC_WEBSITE_ORIGINS = new Set([
  'https://washingtonyachtclub.org',
  'https://www.washingtonyachtclub.org',
])

function parentOrigin() {
  if (!document.referrer) return null

  try {
    const url = new URL(document.referrer)
    if (WYC_WEBSITE_ORIGINS.has(url.origin)) return url.origin
    if (isDevEnvironment() && ['localhost', '127.0.0.1'].includes(url.hostname)) {
      return url.origin
    }
  } catch {
    return null
  }

  return null
}

function postToParent(type: 'resize' | 'scroll-to-top', height?: number) {
  if (window.parent === window) return
  const origin = parentOrigin()
  if (!origin) return
  window.parent.postMessage({ source: MESSAGE_SOURCE, type, height }, origin)
}

export function requestEmbeddedJoinScrollToTop() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SCROLL_EVENT))
}

export function EmbeddedJoinPage({
  children,
  enabled,
}: {
  children: React.ReactNode
  enabled: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const previousPath = useRef(location.pathname)

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const sendHeight = () => {
      const height = Math.ceil(containerRef.current?.getBoundingClientRect().height ?? 0)
      if (height > 0) postToParent('resize', height)
    }
    const sendScrollToTop = () => postToParent('scroll-to-top')
    const observer = new ResizeObserver(sendHeight)
    observer.observe(containerRef.current)
    const frame = requestAnimationFrame(sendHeight)
    window.addEventListener('load', sendHeight)
    window.addEventListener('resize', sendHeight)
    window.addEventListener(SCROLL_EVENT, sendScrollToTop)
    void document.fonts?.ready.then(sendHeight)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('load', sendHeight)
      window.removeEventListener('resize', sendHeight)
      window.removeEventListener(SCROLL_EVENT, sendScrollToTop)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    if (previousPath.current !== location.pathname) {
      previousPath.current = location.pathname
      postToParent('scroll-to-top')
    }
  }, [enabled, location.pathname])

  if (!enabled) return children
  return <div ref={containerRef}>{children}</div>
}
