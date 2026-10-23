import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getCheckoutCardsQueryOptions, getWindHistoryQueryOptions } from './query-options'

export function useCheckoutActivityRefresh(wycNumber?: number) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const queries = [getCheckoutCardsQueryOptions(wycNumber), getWindHistoryQueryOptions()]
    let lastActivityAt = 0

    const refresh = () => {
      const now = Date.now()
      if (document.visibilityState !== 'visible' || now - lastActivityAt < 1000) return
      lastActivityAt = now

      for (const options of queries) {
        if (typeof options.staleTime !== 'number') continue
        const query = queryClient.getQueryCache().find({ queryKey: options.queryKey, exact: true })
        if (
          !query?.isActive() ||
          query.state.fetchStatus !== 'idle' ||
          !query.isStaleByTime(options.staleTime) ||
          now - query.state.errorUpdatedAt < options.staleTime
        ) {
          continue
        }

        void queryClient.refetchQueries(
          { queryKey: options.queryKey, exact: true, type: 'active' },
          { cancelRefetch: false },
        )
      }
    }

    const events = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'focus'] as const
    for (const event of events) {
      window.addEventListener(event, refresh, { capture: true, passive: true })
    }
    document.addEventListener('visibilitychange', refresh)

    return () => {
      for (const event of events) window.removeEventListener(event, refresh, true)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [queryClient, wycNumber])
}
