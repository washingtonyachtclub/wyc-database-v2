import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  useLoginMutation,
  useRequestEmailOtpMutation,
  useVerifyEmailOtpMutation,
} from '@/lib/auth/auth-query-options'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => {
    const redirectTo = search.redirect as string | undefined
    return redirectTo ? { redirect: redirectTo } : {}
  },
  beforeLoad: ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

type Mode = 'password' | 'email'
type EmailStep = 'request' | 'verify'

function LoginPage() {
  const navigate = useNavigate()
  const { redirect: redirectTo } = Route.useSearch()
  const [mode, setMode] = useState<Mode>('password')

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-card p-8 shadow-lg space-y-8">
          <div className="flex flex-col items-center">
            <img src="/favicon.png" alt="WYC" className="h-12 w-12" />
            <h2 className="mt-4 text-center text-3xl font-bold tracking-tight">WYC Database</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {mode === 'password'
                ? 'Sign in with your WYC ID and password'
                : 'Sign in with a code sent to your email'}
            </p>
          </div>

          {mode === 'password' ? (
            <PasswordForm redirectTo={redirectTo} onSwitchMode={() => setMode('email')} navigate={navigate} />
          ) : (
            <EmailOtpFlow redirectTo={redirectTo} onSwitchMode={() => setMode('password')} navigate={navigate} />
          )}
        </div>
      </div>
    </div>
  )
}

function PasswordForm({
  redirectTo,
  onSwitchMode,
  navigate,
}: {
  redirectTo: string | undefined
  onSwitchMode: () => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const loginMutation = useLoginMutation()
  const [wycNumber, setWycNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    try {
      const result = await loginMutation.mutateAsync({
        wycNumber: Number(wycNumber),
        password,
      })

      if (result.success) {
        navigate({ to: redirectTo ?? '/' })
      } else {
        setError(result.message || 'Login failed')
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during login')
    }
  }

  return (
    <form action="/login" method="POST" className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-md bg-destructive/10 p-4">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}
      <div className="space-y-4">
        <div>
          <Label htmlFor="wyc-number" className="sr-only">
            WYC ID
          </Label>
          <Input
            id="wyc-number"
            name="wycNumber"
            type="text"
            inputMode="numeric"
            required
            autoComplete="username"
            placeholder="WYC ID"
            value={wycNumber}
            onChange={(e) => setWycNumber(e.target.value.replace(/\D/g, ''))}
            disabled={loginMutation.isPending}
          />
        </div>
        <div>
          <Label htmlFor="password" className="sr-only">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loginMutation.isPending}
          />
        </div>
      </div>

      <Button type="submit" disabled={loginMutation.isPending} className="w-full">
        {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
      </Button>

      <div className="space-y-2 text-center">
        <button
          type="button"
          onClick={onSwitchMode}
          className="text-sm text-muted-foreground hover:text-primary block w-full"
        >
          Sign in with an email code instead
        </button>
        <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
          Forgot your password or WYC ID?
        </Link>
      </div>
    </form>
  )
}

function EmailOtpFlow({
  redirectTo,
  onSwitchMode,
  navigate,
}: {
  redirectTo: string | undefined
  onSwitchMode: () => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const requestMutation = useRequestEmailOtpMutation()
  const verifyMutation = useVerifyEmailOtpMutation()

  const [step, setStep] = useState<EmailStep>('request')
  const [wycNumber, setWycNumber] = useState('')
  const [code, setCode] = useState('')
  const [emailMasked, setEmailMasked] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRequest = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    try {
      const result = await requestMutation.mutateAsync({ wycNumber: Number(wycNumber) })
      if (result.success) {
        setEmailMasked(result.emailMasked ?? null)
        setStep('verify')
      } else {
        setError(result.message || 'Unable to send a code.')
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred sending your code')
    }
  }

  const handleVerify = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    try {
      const result = await verifyMutation.mutateAsync({
        wycNumber: Number(wycNumber),
        code,
      })
      if (result.success) {
        navigate({ to: redirectTo ?? '/' })
      } else {
        setError(result.message || 'Invalid or expired code')
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred verifying your code')
    }
  }

  const handleResend = async () => {
    setError(null)
    setCode('')
    try {
      const result = await requestMutation.mutateAsync({ wycNumber: Number(wycNumber) })
      if (!result.success) {
        setError(result.message || 'Unable to resend.')
      } else if (result.emailMasked) {
        setEmailMasked(result.emailMasked)
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred resending your code')
    }
  }

  if (step === 'request') {
    return (
      <form className="space-y-6" onSubmit={handleRequest}>
        {error && (
          <div className="rounded-md bg-destructive/10 p-4">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        )}
        <div>
          <Label htmlFor="wyc-number" className="sr-only">
            WYC ID
          </Label>
          <Input
            id="wyc-number"
            type="text"
            inputMode="numeric"
            required
            autoComplete="username"
            placeholder="WYC ID"
            value={wycNumber}
            onChange={(e) => setWycNumber(e.target.value.replace(/\D/g, ''))}
            disabled={requestMutation.isPending}
          />
        </div>

        <Button type="submit" disabled={requestMutation.isPending} className="w-full">
          {requestMutation.isPending ? 'Sending...' : 'Send code to my email'}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchMode}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Use password instead
          </button>
        </div>
      </form>
    )
  }

  return (
    <form className="space-y-6" onSubmit={handleVerify}>
      {error && (
        <div className="rounded-md bg-destructive/10 p-4">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center">
        Code sent to <span className="font-medium text-foreground">{emailMasked ?? 'your email'}</span>.
        Enter the 6-digit code below.
      </p>

      <div>
        <Label htmlFor="otp-code" className="sr-only">
          6-digit code
        </Label>
        <Input
          id="otp-code"
          type="text"
          inputMode="numeric"
          required
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          disabled={verifyMutation.isPending}
        />
      </div>

      <Button type="submit" disabled={verifyMutation.isPending || code.length !== 6} className="w-full">
        {verifyMutation.isPending ? 'Verifying...' : 'Verify and sign in'}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={requestMutation.isPending}
          className="text-muted-foreground hover:text-primary disabled:opacity-50"
        >
          {requestMutation.isPending ? 'Resending...' : 'Resend code'}
        </button>
        <button
          type="button"
          onClick={onSwitchMode}
          className="text-muted-foreground hover:text-primary"
        >
          Use password instead
        </button>
      </div>
    </form>
  )
}
