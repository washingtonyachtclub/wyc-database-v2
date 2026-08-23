import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCurrentUser } from '@/lib/auth/auth-query-options'
import { setSailLockerModeServerFn } from '@/lib/auth/device-settings-server-fns'
import { hasPrivilege } from '@/lib/permissions'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/settings')
  },
  component: SettingsPage,
})

function SettingsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { privileges, sailLockerMode } = useCurrentUser()
  const canManageSailLocker = hasPrivilege(privileges, ['db'])
  const mutation = useMutation({
    mutationFn: (enabled: boolean) => setSailLockerModeServerFn({ data: { enabled } }),
    onSuccess: async () => {
      queryClient.clear()
      await router.invalidate()
      await router.navigate({
        to: '/login',
        search: { redirect: '/' },
        replace: true,
      })
    },
  })

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-medium">Set Password</h2>
          </div>
          <Button asChild variant="outline">
            <Link to="/set-password">Update</Link>
          </Button>
        </div>
        {canManageSailLocker && (
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-6">
              <div className="space-y-1">
                <Label htmlFor="sail-locker-mode" className="text-base">
                  Sail Locker mode
                </Label>
                <p id="sail-locker-mode-description" className="text-sm text-muted-foreground">
                  Sessions expire after 10 minutes. Toggling this setting logs you out.
                </p>
              </div>
              <Switch
                id="sail-locker-mode"
                checked={sailLockerMode}
                disabled={mutation.isPending}
                aria-describedby="sail-locker-mode-description"
                onCheckedChange={(checked) => mutation.mutate(checked)}
              />
            </div>
            {mutation.isError && (
              <p className="mt-4 text-sm text-destructive">
                Failed to update Sail Locker mode. Please try again.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
