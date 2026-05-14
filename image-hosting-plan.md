# Image Hosting Plan

## Current State

- Legacy system stores member photos as files on DreamHost in a `chief_pics/` directory
- `image_name` column on `WYCDatabase` stores the filename (e.g., `18614.png`)
- Naming convention: `{WYCNumber}.{ext}`
- Upload/remove handled by `ImgUtil.pm` — CGI form uploads file to disk, updates DB column
- ~20 members have photos set (mostly chiefs/officers)
- Meet-the-team page currently hardcodes WordPress-hosted URLs

## Goal

Any member can upload a profile photo. Officers/chiefs photos show on public pages. Could also be used for chiefs list, member profiles, etc.

## Recommended Approach: Vercel Blob

Vercel Blob is an S3-compatible object store integrated with Vercel. Simple SDK, built-in CDN, works directly in server functions.

### How it would work

1. `npm install @vercel/blob` (with `--legacy-peer-deps`)
2. Server function receives file via form upload
3. Call `put(`member-photos/${wycNumber}.${ext}`, file, { access: 'public' })` 
4. Store returned URL in `image_name` column (change from filename to full URL)
5. Serve images directly from the Blob CDN URL

### Migration from legacy

- Download existing `chief_pics/` from DreamHost
- Upload them to Vercel Blob with same naming convention
- Update `image_name` values in DB from filenames to full URLs
- Or: keep old filenames as-is, only store full URLs for new uploads, detect which format at read time (URL starts with `https://`)

### Cost

- Storage: $0.15/GB/month
- Reads: free (served via CDN)
- Writes: $0.05 per 10,000
- For a yacht club with <500 photos at ~200KB each = ~100MB → basically free

## Alternative: Cloudflare R2

- Zero egress fees (vs Vercel Blob's free reads anyway)
- S3-compatible API, needs separate Cloudflare account
- Slightly more setup (API tokens, bucket config, custom domain optional)
- Better if photos get viewed extremely heavily, but at this scale it doesn't matter

## Open Questions

1. **Max file size / dimensions?** Legacy enforced 100-2000px. What limits make sense now? Compress on upload?
2. **Who can upload?** Any member for their own photo? Officers for anyone? Should there be approval?
3. **Image processing?** Resize/crop on upload (e.g., always save a 500x500 square)? Or let CSS handle it like now?
4. **Legacy migration?** Do we need to migrate the ~20 existing chief_pics, or let people re-upload?
5. **Where does the upload UI live?** Member profile page? A separate settings page? Admin-only?
6. **Delete/replace flow?** Can members remove their photo? Auto-delete old blob on re-upload?
7. **meet-the-team page** — eventually pull from DB (officers table + image_name) instead of hardcoded? Would need officers table to be maintained.
8. **Vercel Blob token** — needs `BLOB_READ_WRITE_TOKEN` env var. Set up in both Vercel projects (prod + dev).
