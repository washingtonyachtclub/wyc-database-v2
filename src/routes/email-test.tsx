import { Button } from '@/components/ui/button'
import { EmailSimulatedNotice } from '@/components/ui/EmailSimulatedNotice'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { sendTestEmailServerFn } from '../lib/email-server-fns'
import { requirePrivilegeForRoute } from '../lib/route-guards'

export const Route = createFileRoute('/email-test')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/email-test')
  },
  component: EmailTestPage,
})

function EmailTestPage() {
  const [to, setTo] = useState('')

  const mutation = useMutation({
    mutationFn: (email: string) => sendTestEmailServerFn({ data: { to: email } }),
  })

  return (
    <div className="max-w-md mx-auto mt-12 p-6">
      <h1 className="text-2xl font-bold mb-6">Email Test</h1>

      {mutation.data?.success && (
        <>
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            Email sent! ID: {mutation.data.emailId}
          </div>
          {mutation.data.emailSimulated && <EmailSimulatedNotice />}
        </>
      )}

      {mutation.data && !mutation.data.success && (
        <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {mutation.data.message}
        </div>
      )}

      {mutation.error && (
        <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {mutation.error.message}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          {/* <Label htmlFor="to-email">Recipient Email</Label>
          <Input
            id="to-email"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="e.g. earora24@uw.edu"
          /> */}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => mutation.mutate(to)}
            disabled={!to.includes('@') || mutation.isPending}
          >
            {mutation.isPending ? 'Sending...' : 'Send Test Email'}
          </Button>
          <Button
            variant="outline"
            onClick={() => mutation.mutate('webmaster@washingtonyachtclub.org')}
            disabled={mutation.isPending}
          >
            Send to Webmaster
          </Button>
          <Button
            variant="outline"
            onClick={() => mutation.mutate('earora24@uw.edu')}
            disabled={mutation.isPending}
          >
            Send to Eshan
          </Button>
        </div>
      </div>
    </div>
  )
}
