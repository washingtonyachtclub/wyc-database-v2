import { LoaderCircle, RefreshCw, Smartphone } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { getCurrentUserQueryOptions } from '@/lib/auth/auth-query-options'
import {
  cancelQrLoginRequestServerFn,
  createQrLoginRequestServerFn,
  pollQrLoginRequestServerFn,
} from '@/lib/auth/qr-login-server-fns'

type ActiveRequest = {
  approvalSecret: string
  pollingSecret: string
  expiresAt: number
}

type DisplayStatus = 'creating' | 'pending' | 'connection-error' | 'unavailable'

export function QrLoginPanel({
  onPollingSecretChange,
}: {
  onPollingSecretChange: (secret: string | null) => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const startedRef = useRef(false)
  const authenticatedRef = useRef(false)
  const [request, setRequest] = useState<ActiveRequest | null>(null)
  const [status, setStatus] = useState<DisplayStatus>('creating')

  const approvalUrl = useMemo(() => {
    if (!request || typeof window === 'undefined') return ''
    const url = new URL('/qr-login/approve', window.location.origin)
    url.searchParams.set('secret', request.approvalSecret)
    return url.toString()
  }, [request])

  const createRequest = useCallback(async () => {
    setStatus('creating')
    setRequest(null)
    onPollingSecretChange(null)

    try {
      const result = await createQrLoginRequestServerFn()
      if (!result.success) {
        setStatus('unavailable')
        return
      }

      const nextRequest = {
        approvalSecret: result.approvalSecret,
        pollingSecret: result.pollingSecret,
        expiresAt: result.expiresAt,
      }
      setRequest(nextRequest)
      setStatus('pending')
      onPollingSecretChange(nextRequest.pollingSecret)
    } catch (error) {
      console.error('QR login creation error:', error)
      setStatus('unavailable')
    }
  }, [onPollingSecretChange])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void createRequest()
  }, [createRequest])

  useEffect(() => {
    if (!request) return

    const timeout = window.setTimeout(() => {
      authenticatedRef.current = false
      void createRequest()
    }, Math.max(0, request.expiresAt - Date.now()))

    return () => window.clearTimeout(timeout)
  }, [createRequest, request])

  useEffect(() => {
    if (!request || Date.now() >= request.expiresAt || status === 'unavailable') return

    let stopped = false
    let timeout: number | undefined

    const poll = async () => {
      try {
        const result = await pollQrLoginRequestServerFn({
          data: { pollingSecret: request.pollingSecret },
        })
        if (stopped) return

        if (result.status === 'authenticated') {
          if (authenticatedRef.current) return
          authenticatedRef.current = true
          onPollingSecretChange(null)
          queryClient.removeQueries({ queryKey: ['auth', 'currentUser'] })
          await queryClient.fetchQuery(getCurrentUserQueryOptions())
          await router.invalidate()
          return
        }

        if (result.status === 'unavailable') {
          setStatus('unavailable')
          return
        }

        setStatus('pending')
      } catch (error) {
        console.error('QR login polling error:', error)
        if (!stopped) setStatus('connection-error')
      }

      if (!stopped) {
        timeout = window.setTimeout(() => void poll(), 1500)
      }
    }

    void poll()
    return () => {
      stopped = true
      if (timeout !== undefined) window.clearTimeout(timeout)
    }
  }, [onPollingSecretChange, queryClient, request, router, status])

  const replaceRequest = async () => {
    if (request) {
      await cancelQrLoginRequestServerFn({ data: { pollingSecret: request.pollingSecret } })
    }
    authenticatedRef.current = false
    await createRequest()
  }

  return (
    <section className="space-y-4 text-center md:border-r md:pr-8">
      <div className="space-y-1">
        <div className="flex items-center justify-center gap-2">
          <Smartphone className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Sign in with your phone</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Scan to sign in to this computer immediately.
        </p>
      </div>

      <div className="flex min-h-64 items-center justify-center rounded-lg border bg-background p-3">
        {approvalUrl && status !== 'unavailable' ? (
          <QRCodeSVG
            value={approvalUrl}
            size={232}
            level="M"
            marginSize={4}
            title="Sail Locker login QR code"
            className="h-auto w-full max-w-60"
          />
        ) : status === 'creating' ? (
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">A QR code could not be created.</p>
            <Button type="button" variant="outline" onClick={() => void replaceRequest()}>
              <RefreshCw />
              Generate a new QR code
            </Button>
          </div>
        )}
      </div>

      {request && status === 'connection-error' && (
        <p className="text-sm text-muted-foreground">Reconnecting to the Sail Locker…</p>
      )}
    </section>
  )
}
