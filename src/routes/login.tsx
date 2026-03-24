import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useLoginMutation } from '../lib/auth-query-options'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => {
    const redirectTo = search.redirect as string | undefined
    return redirectTo ? { redirect: redirectTo } : {}
  },
  beforeLoad: ({ context }) => {
    // If already authenticated, redirect to home
    if (context.isAuthenticated) {
      throw redirect({
        to: '/',
      })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { redirect: redirectTo } = Route.useSearch()
  const loginMutation = useLoginMutation()
  const [wycNumber, setWycNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const result = await loginMutation.mutateAsync({
        wycNumber: Number(wycNumber),
        password,
      })

      if (result.success) {
        // Redirect to the original destination or home
        navigate({ to: redirectTo ?? '/' })
      } else {
        setError(result.message || 'Login failed')
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during login')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your WYC ID and password
          </p>
        </div>
        <form method="POST" className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-destructive/10 p-4">
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="wyc-number" className="sr-only">
                WYC Number
              </Label>
              <Input
                id="wyc-number"
                name="wycNumber"
                type="text"
                inputMode="numeric"
                required
                autoComplete="username"
                placeholder="WYC Number"
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

          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
