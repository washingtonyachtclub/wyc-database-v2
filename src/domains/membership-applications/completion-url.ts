// Email recipients must reach the public site, even when a cron job or officer
// action runs on a Vercel deployment URL protected by Vercel Authentication.
const PUBLIC_APPLICATION_ORIGIN = 'https://database.washingtonyachtclub.org'

export function applicationCompletionUrl(applicationId: string): string {
  return new URL(`/join/${encodeURIComponent(applicationId)}`, PUBLIC_APPLICATION_ORIGIN).toString()
}
