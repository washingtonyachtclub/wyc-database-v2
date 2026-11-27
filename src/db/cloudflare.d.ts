declare module 'cloudflare:workers' {
  type Images = import('@cloudflare/workers-types').ImagesBinding

  export const env: {
    DB: import('@cloudflare/workers-types').D1Database
    PROFILE_PHOTOS: import('@cloudflare/workers-types').R2Bucket
    WAIVERS: import('@cloudflare/workers-types').R2Bucket
    IMAGES: {
      info(stream: ReadableStream<Uint8Array>): ReturnType<Images['info']>
      input(stream: ReadableStream<Uint8Array>): ReturnType<Images['input']>
    }
  }
}
