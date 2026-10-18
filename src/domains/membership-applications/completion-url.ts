import { PUBLIC_APP_ORIGIN } from '@/lib/urls'

export function applicationCompletionUrl(applicationId: string): string {
  return new URL(`/join/${encodeURIComponent(applicationId)}`, PUBLIC_APP_ORIGIN).toString()
}
