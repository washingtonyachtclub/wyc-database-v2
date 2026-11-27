import app from '@tanstack/react-start/server-entry'
import { runDailyTasks } from '@/lib/daily-tasks'

const joinPolicy =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self' https://washingtonyachtclub.org https://www.washingtonyachtclub.org https://wyc-emdash-review.wyc-emdash-website.workers.dev; script-src 'self' 'unsafe-inline' https://web.squarecdn.com https://sandbox.web.squarecdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://web.squarecdn.com https://sandbox.web.squarecdn.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com https://square-fonts-production-f.squarecdn.com https://d1g145x70srn7h.cloudfront.net; frame-src 'self' https://web.squarecdn.com https://sandbox.web.squarecdn.com; connect-src 'self' https://web.squarecdn.com https://sandbox.web.squarecdn.com https://pci-connect.squareup.com https://pci-connect.squareupsandbox.com https://o160250.ingest.sentry.io; form-action 'self'"

export default {
  async fetch(request: Request) {
    const { pathname } = new URL(request.url)
    if (pathname === '/guides/fj' || pathname === '/guides/knots') {
      return Response.redirect('https://washingtonyachtclub.org' + pathname, 308)
    }
    const response = await app.fetch(request)
    if (pathname !== '/join' && !pathname.startsWith('/join/')) return response
    const framed = new Response(response.body, response)
    framed.headers.set('Content-Security-Policy', joinPolicy)
    framed.headers.set('X-Content-Type-Options', 'nosniff')
    framed.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    return framed
  },
  async scheduled() {
    await runDailyTasks()
  },
}
