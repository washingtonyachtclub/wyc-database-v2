import { useCurrentUser } from '@/lib/auth/auth-query-options'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

export function SailLockerCheckoutSessionGuard() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isAuthenticated, sessionExpiresAt } = useCurrentUser()

  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) return

    const expireSession = async () => {
      queryClient.clear()
      await router.navigate({ to: '/checkout', replace: true })
      await router.invalidate()
    }

    const remaining = sessionExpiresAt - Date.now()
    if (remaining <= 0) {
      void expireSession()
      return
    }

    const timeout = window.setTimeout(() => void expireSession(), remaining)
    return () => window.clearTimeout(timeout)
  }, [isAuthenticated, queryClient, router, sessionExpiresAt])

  return null
}
