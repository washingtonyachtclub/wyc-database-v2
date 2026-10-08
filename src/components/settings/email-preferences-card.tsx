import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { emailPreferencesQueryOptions } from '@/domains/email-preferences/query-options'
import { setEmailPreferences } from '@/domains/email-preferences/server-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function EmailPreferencesCard({ wycNumber }: { wycNumber: number }) {
  const queryClient = useQueryClient()
  const options = emailPreferencesQueryOptions(wycNumber)
  const preferences = useQuery(options)
  const mutation = useMutation({
    mutationFn: (sailingOpportunities: boolean) =>
      setEmailPreferences({ data: { sailingOpportunities } }),
    onSuccess: (data) => {
      queryClient.setQueryData(options.queryKey, data)
    },
  })

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-base font-medium">Email preferences</h2>
      {preferences.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading…
        </p>
      ) : preferences.isError ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-destructive">
            Failed to load email preferences.
          </p>
          <Button variant="outline" onClick={() => preferences.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-1">
              <Label htmlFor="sailing-opportunities">
                Social sailing &amp; lesson opportunities
              </Label>
            </div>
            <Switch
              id="sailing-opportunities"
              checked={
                mutation.isPending ? mutation.variables : preferences.data.sailingOpportunities
              }
              disabled={mutation.isPending}
              onCheckedChange={(checked) => mutation.mutate(checked)}
            />
          </div>
          {mutation.isError && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Failed to save email preferences. Please try again.
            </p>
          )}
        </>
      )}
    </div>
  )
}
