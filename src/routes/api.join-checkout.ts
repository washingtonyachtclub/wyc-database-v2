import { createFileRoute } from '@tanstack/react-router'
import { saveCheckoutDraft } from '@/domains/membership-applications/checkout-drafts'

export const Route = createFileRoute('/api/join-checkout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url)
        if (request.headers.get('origin') !== url.origin)
          return new Response('Invalid origin', { status: 403 })
        try {
          const form = await request.formData()
          await saveCheckoutDraft(JSON.parse(String(form.get('signup'))))
          return new Response(null, {
            status: 303,
            headers: { Location: '/join/checkout', 'Cache-Control': 'no-store' },
          })
        } catch (error) {
          console.error('Failed to save signup checkout', error)
          return new Response('Could not save your signup. Go back and try again.', { status: 400 })
        }
      },
    },
  },
})
