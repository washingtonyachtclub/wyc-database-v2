import { LoaderCircle, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { approveQrLoginRequestServerFn } from '@/lib/auth/qr-login-server-fns'

type ApprovalStatus = 'approving' | 'approved' | 'unavailable'

export const Route = createFileRoute('/qr-login/approve')({
  validateSearch: (search: Record<string, unknown>) => ({
    secret: typeof search.secret === 'string' ? search.secret : '',
  }),
  beforeLoad: ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  head: () => ({ meta: [{ title: 'Sail Locker Login | WYC' }] }),
  component: ApproveQrLoginPage,
})

function ApproveQrLoginPage() {
  const router = useRouter()
  const { secret } = Route.useSearch()
  const { user } = Route.useRouteContext()
  const approvalSecretRef = useRef(secret)
  const startedRef = useRef(false)
  const [status, setStatus] = useState<ApprovalStatus>('approving')

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('secret')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const approve = async () => {
      const result = await approveQrLoginRequestServerFn({
        data: { approvalSecret: approvalSecretRef.current },
      })

      if (result.status === 'unauthenticated') {
        await router.navigate({
          to: '/login',
          search: {
            redirect: `/qr-login/approve?secret=${encodeURIComponent(approvalSecretRef.current)}`,
          },
          replace: true,
        })
        return
      }

      setStatus(result.status === 'approved' ? 'approved' : 'unavailable')
    }

    void approve()
  }, [router])

  const memberName = `${user?.first ?? ''} ${user?.last ?? ''}`.trim()

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-md rounded-xl bg-card p-8 text-center shadow-lg">
        {status === 'approving' && (
          <div className="space-y-4">
            <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-primary" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Signing in to the Sail Locker</h1>
              <p className="text-muted-foreground">Signing in as {memberName}…</p>
            </div>
          </div>
        )}

        {status === 'approved' && (
          <div className="space-y-4">
            <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Sail Locker signed in</h1>
              <p className="text-muted-foreground">
                The Sail Locker computer is signing in as {memberName}. You can close this page.
              </p>
            </div>
          </div>
        )}

        {status === 'unavailable' && (
          <div className="space-y-4">
            <TriangleAlert className="mx-auto h-12 w-12 text-destructive" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">QR code unavailable</h1>
              <p className="text-muted-foreground">
                This QR code expired or has already been used. Scan the current code on the Sail
                Locker computer.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
