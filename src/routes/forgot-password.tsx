import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { lookupWycNumberServerFn, resetPasswordServerFn } from '@/lib/password-server-fns'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-card p-8 shadow-lg space-y-8">
          <div className="flex flex-col items-center">
            <img src="/favicon.png" alt="WYC" className="h-12 w-12" />
            <h2 className="mt-4 text-center text-3xl font-bold tracking-tight">WYC Database</h2>
          </div>

          <LookupSection />

          <hr className="border-border" />

          <ResetSection />

          <p className="text-center text-sm text-muted-foreground">
            Forgot which email you used? Email{' '}
            <a
              href="mailto:contact@washingtonyachtclub.org"
              className="text-primary hover:underline"
            >
              contact@washingtonyachtclub.org
            </a>{' '}
            for help.
          </p>

          <div className="text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function LookupSection() {
  const [email, setEmail] = useState('')

  const lookupMutation = useMutation({
    mutationFn: () => lookupWycNumberServerFn({ data: { email } }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) lookupMutation.mutate()
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Forgot your WYC ID Number?</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="lookup-email">Email Address</Label>
          <Input
            id="lookup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={lookupMutation.isPending}
          />
        </div>
        <Button
          type="submit"
          disabled={!email.trim() || lookupMutation.isPending}
          className="w-full"
        >
          {lookupMutation.isPending ? 'Looking up...' : 'Look Up'}
        </Button>
      </form>

      {lookupMutation.data && !lookupMutation.data.success && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {lookupMutation.data.message}
        </div>
      )}

      {lookupMutation.data?.success && lookupMutation.data.emailSent && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          Your WYC number has been sent to <span className="font-semibold">{email}</span>.
        </div>
      )}

      {lookupMutation.data?.success && !lookupMutation.data.emailSent && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Email could not be sent. Please contact{' '}
          <a href="mailto:contact@washingtonyachtclub.org" className="underline">
            contact@washingtonyachtclub.org
          </a>{' '}
          for assistance.
        </div>
      )}
    </div>
  )
}

function ResetSection() {
  const [wycNumber, setWycNumber] = useState('')
  const [email, setEmail] = useState('')

  const resetMutation = useMutation({
    mutationFn: () => resetPasswordServerFn({ data: { wycNumber: Number(wycNumber), email } }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (wycNumber && email.trim()) resetMutation.mutate()
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Reset Password</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="reset-wyc">WYC Number</Label>
          <Input
            id="reset-wyc"
            type="text"
            inputMode="numeric"
            value={wycNumber}
            onChange={(e) => setWycNumber(e.target.value.replace(/\D/g, ''))}
            placeholder="WYC Number"
            disabled={resetMutation.isPending}
          />
        </div>
        <div>
          <Label htmlFor="reset-email">Email Address</Label>
          <Input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email on file"
            disabled={resetMutation.isPending}
          />
        </div>
        <Button
          type="submit"
          disabled={!wycNumber || !email.trim() || resetMutation.isPending}
          className="w-full"
        >
          {resetMutation.isPending ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>

      {resetMutation.data && !resetMutation.data.success && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {resetMutation.data.message}
        </div>
      )}

      {resetMutation.data?.success && resetMutation.data.emailSent && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          Your new password has been sent to your email address. Please check your inbox.
        </div>
      )}

      {resetMutation.data?.success && !resetMutation.data.emailSent && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Password was reset but the email could not be sent. Please contact{' '}
          <a href="mailto:contact@washingtonyachtclub.org" className="underline">
            contact@washingtonyachtclub.org
          </a>{' '}
          for your new password.
        </div>
      )}
    </div>
  )
}
