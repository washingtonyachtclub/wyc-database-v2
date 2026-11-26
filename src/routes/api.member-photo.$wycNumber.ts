import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useRefreshedAppSession } from '@/lib/auth/session'
import { maxUploadBytes } from '@/domains/member-photos/photo'
import { InvalidPhoto } from '@/domains/member-photos/images'
import {
  changePhoto,
  getPhoto,
  loadSource,
  loadAvatar,
  listedInDirectory,
  StalePhoto,
} from '@/domains/member-photos/service'

const headers = { 'Cache-Control': 'private, no-store' }
const cropSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().positive().max(100),
  height: z.number().positive().max(100),
})
const reply = (status: number) => new Response(null, { status, headers })

async function handle({ request, params }: { request: Request; params: { wycNumber: string } }) {
  try {
    const id = Number(params.wycNumber)
    if (!Number.isSafeInteger(id) || id <= 0) return reply(404)
    const { data } = await useRefreshedAppSession()
    if (!data.userId) return reply(401)
    const editor = data.userId === id || data.privileges?.includes('db')
    const url = new URL(request.url)
    if (request.method === 'GET') {
      const source = url.searchParams.has('source')
      if (source && !editor) return reply(403)
      if (!editor && !data.privileges?.includes('rtgs') && !(await listedInDirectory(id)))
        return reply(403)
      const row = await getPhoto(id)
      if (!row || row.version !== url.searchParams.get('v')) return reply(404)
      const bytes = source ? await loadSource(row) : await loadAvatar(row)
      return new Response(new Uint8Array(bytes), {
        headers: { ...headers, 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff' },
      })
    }
    if (
      !editor ||
      request.headers.get('X-WYC-Photo') !== '1' ||
      request.headers.get('Origin') !== url.origin
    )
      return reply(403)
    const expected = url.searchParams.get('v') ?? ''
    if (request.method === 'DELETE') {
      await changePhoto(id, expected)
    } else {
      const length = Number(request.headers.get('content-length'))
      if (!length || length > maxUploadBytes + 16384) return reply(413)
      const form = await request.formData()
      const file = form.get('file')
      if (file && (!(file instanceof File) || file.size > maxUploadBytes)) return reply(413)
      let crop
      try {
        crop = cropSchema.parse(JSON.parse(String(form.get('crop'))))
      } catch {
        return reply(400)
      }
      await changePhoto(id, expected, {
        crop,
        file: file instanceof File ? Buffer.from(await file.arrayBuffer()) : undefined,
      })
    }
    return reply(204)
  } catch (error) {
    if (error instanceof InvalidPhoto) return reply(422)
    if (error instanceof StalePhoto) return reply(409)
    console.error('Member photo request failed', error)
    return reply(500)
  }
}
export const Route = createFileRoute('/api/member-photo/$wycNumber')({
  server: { handlers: { GET: handle, POST: handle, DELETE: handle } },
})
