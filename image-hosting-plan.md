# Object Storage and Image Hosting Plan V2

## Status

This plan makes a directional storage choice. It intentionally does not design a
gallery editor, profile-image cropper, or full media-management system before those
features are needed. The waiver workflow remains defined in `waiver-plan.md`.

## Current state

- The legacy member system stores about 20 officer and chief photos on DreamHost and
  keeps their filenames in `WYCDatabase.image_name`.
- The new Astro website currently loads WordPress media through its `media()` helper.
- The WordPress API advertises 619 media records. A 2026-08-23 metadata inventory
  reported about 291 MB of original files with recorded sizes and about 813 MB when
  WordPress-generated derivatives were included. Some older records lack size
  metadata, but the present library is still comfortably below 1 GB.
- The website plan names Cloudinary, but no Cloudinary migration has been performed.
- WYC already has a Backblaze account for database backups and expects to use
  Cloudflare for the replacement public website.

## What these services do

Object storage holds files as objects in buckets. Each object has a key, bytes, a
content type, and limited metadata. The relational database continues to hold
searchable business data and stores the object key that points to the file.

Image hosting adds public delivery, caching, resizing, format conversion, and
sometimes a media-management interface on top of file storage. WYC needs both file
storage and image delivery, but it does not need one product to provide every layer.

## Requirements

- Store public marketing-site images, including the WordPress media migration.
- Store member profile photos without assuming every member photo is public.
- Publish selected officer and chief photos on public pages.
- Store executed member and guest waiver PDFs privately.
- Keep public media and waivers behind separate access boundaries and credentials.
- Allow only authorized application code and officers to read waiver PDFs.
- Retain each waiver for at least seven years after its associated participation or
  membership period. No automatic deletion is initially required.
- Prevent accidental or premature waiver deletion and overwriting.
- Keep recurring cost close to zero at current club scale, with predictable,
  inexpensive growth beyond a free tier.
- Use portable APIs and stable WYC-owned URLs where practical.
- Remain understandable and recoverable through officer and maintainer turnover.

## Recommendation

Use **Cloudflare R2 as the system of record for stored files**. Cloudflare image
transformations are an optional performance enhancement, not a runtime dependency.

This is one object-storage provider with two access patterns:

1. Public images are stored in R2 and delivered through Cloudflare at a WYC-owned
   hostname such as `media.washingtonyachtclub.org`.
2. Private member images and executed waivers are accessed from private R2 buckets
   only after database v2 authorizes the request. Waivers never pass through the
   public media hostname or its cache rules.

R2 provides an S3-compatible API, 10 GB of free storage, 1 million free monthly Class
A operations, 10 million free monthly Class B operations, free egress, private
presigned URLs, custom-domain delivery, and bucket lock rules.

The planned public website already targets Cloudflare, and WYC is willing to move its
authoritative DNS there. R2 therefore keeps DNS, the static public site, its media
delivery, usage reporting, and storage in one account. It also has stronger current
AI-assisted administration and developer tooling than the alternatives. Public-site
traffic remains separate from the Vercel account that runs database v2.

## Longevity and dependency boundary

The durable version of this architecture is deliberately small:

- The public website depends on ordinary HTTPS image URLs, not on an R2 SDK, a
  Cloudflare Worker, Cloudflare Images, AI tooling, or a database lookup.
- The database application uses one small S3-compatible storage adapter for private
  uploads and downloads. Business records store portable object keys rather than
  provider-specific dashboard URLs.
- Public image transformations, a media-director dashboard, and automated cropping
  remain optional additions. Removing or never building them does not break storage.
- R2 objects can be bulk-exported with standard S3-compatible tools. Moving providers
  would require copying the objects and changing configuration, not rewriting every
  Astro page.

An outside infrastructure account is unavoidable unless all files are kept on a
club-owned server. Using the same Cloudflare account for DNS, Pages, and R2 reduces
account sprawl, while the S3-compatible boundary limits lock-in. Keep at least two WYC
administrators on that account and put recovery details in the shared password
manager.

## Bucket and credential boundaries

Create separate production buckets rather than separating concerns only by object
prefix:

| Bucket                 | Access                         | Contents                                                       | Important controls                                                                           |
| ---------------------- | ------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `wyc-public-media`     | Public through a custom domain | Marketing images and explicitly published officer/chief images | Long-lived cache headers; no waiver or private-member objects                                |
| `wyc-member-media`     | Private                        | Member profile originals and member-only derivatives           | Read and write only through database v2; no public CDN rule                                  |
| `wyc-executed-waivers` | Private                        | Canonical member and guest waiver PDFs                         | Eight-year bucket lock; no public access; no ordinary deletion credential in the application |

Use separate development buckets and separate application keys. Never copy production
waivers or real member images into development.

Each deployed service receives only its required bucket-scoped key:

- Database v2 can write member images and waivers and read the private objects it is
  authorized to serve.
- The Astro website receives no R2 secret. It renders public media URLs only.
- Migration and administrative credentials are not deployed with either application.
- The waiver application's ordinary credential does not receive bucket-management or
  object-deletion permission.

## Object identity and database records

Store provider-independent object keys in the database, not dashboard URLs or signed
URLs. Keep the provider, bucket mapping, and public base URL in configuration.

Use non-guessable immutable keys. Do not place a person's name, email, birthdate, WYC
number, or signature in a waiver object key. Example keys:

```text
website/wordpress/2026/08/<content-id>-<sanitized-name>.jpg
profiles/original/<random-id>.jpg
profiles/public/<random-id>-500.webp
waivers/v1/member/2026/<acceptance-uuid>.pdf
waivers/v1/guest/2026/<acceptance-uuid>.pdf
```

The database owns captions, alt text, attribution, profile linkage, waiver search
fields, retention dates, and publication state. R2 metadata is operational metadata,
not the only copy of business data.

## Public website images

### How Astro uses R2

R2 exposes a public object through an ordinary HTTPS URL. Astro does not need to log
in to R2 or load a storage SDK to display it:

```astro
<img
  src="https://media.washingtonyachtclub.org/website/hero.jpg"
  alt="Sailboats on Union Bay"
/>
```

The existing website already centralizes these URLs through `media()`:

```astro
<img src={media("2023/02/headerphoto-scaled.jpg")} alt="..." />
```

Migrating from WordPress to R2 can therefore be a change to the helper's base URL.
There is no R2 runtime dependency in the Astro site. A React, Preact, or other
interactive island uses the same image URL as static Astro markup.

Use Astro's normal hybrid image model:

- Keep the small set of structural assets that change with code, such as the logo,
  favicon, and possibly the primary hero, in `src/assets` or `public`. Astro can
  optimize imported `src/assets` images at build time.
- Keep the historical library, galleries, member uploads, and other files that should
  not enlarge Git history in R2.
- Initially upload web-ready images at sensible dimensions and use ordinary `<img>`
  URLs. Add Cloudflare transformations or responsive variants only when measured page
  performance or a concrete gallery design requires them.

### WordPress migration

1. Inventory the WordPress media library and measure its total original size.
2. Identify the assets referenced by the pages being ported, while preserving any
   additional library items that the club intentionally wants to archive or publish.
3. Download originals before WordPress is retired and verify file counts and hashes.
4. Create web-ready copies of files that are too large or use unsuitable web formats,
   while preserving originals only where they have archival value.
5. Upload the published files to `wyc-public-media` with correct content types and
   long-lived cache headers.
6. Connect the R2 bucket to the public media hostname.
7. Update the Astro `media()` helper to emit the WYC-owned media hostname.
8. Exercise every ported page and reconcile broken or missing media before cutover.

Structural assets required to render the site, such as the logo and favicon, may
remain in the website repository. The historical media library and galleries should
not be committed to Git.

### Editorial workflow

R2's dashboard supports folders and drag-and-drop uploads, but it is not a digital
asset manager and does not update the website. The long-term media-director workflow
remains a TODO. Do not build a custom media library until the club can describe the
actual recurring publishing job.

Reasonable future options include a documented R2 upload procedure for infrequent
maintainer-assisted changes, Google Drive as an editorial source with a small publish
step, a bounded WYC upload screen, or a managed DAM such as Cloudinary. None is
required to migrate the existing website or establish the storage foundation.

## Member profile photos

Profile-photo details remain a TODO. The directional boundary is that ordinary member
photos are private and public officer or chief photos are explicitly published to the
public bucket. File limits, cropping, original retention, replacement, and the upload
screen should be decided when this feature is implemented.

## Executed waiver PDFs

The waiver PDF is sensitive legal and personal data. It must never be put in the
public media bucket, exposed through a guessable URL, or sent through a public image
optimization path.

For each completed acceptance:

1. Allocate the acceptance UUID.
2. Render the self-contained PDF and calculate its SHA-256 hash.
3. Upload once to a unique key in `wyc-executed-waivers`. Apply an eight-year R2
   bucket lock to the waiver prefix so a one-year membership followed by seven years
   of retention is protected without per-object retention administration.
4. Insert the acceptance row with the object key, hash, size, content type, retention
   start date, and upload result.
5. Email the signer the same executed bytes or a verified read-back of the stored
   object. Never email a public object URL.

An external object write and a MySQL transaction cannot be atomic. If the upload
succeeds but the database write fails, preserve the locked orphan and record enough
server-side information for reconciliation. A failed upload must not produce a
completed acceptance row.

Authorized officers download through a database-v2 route that performs the normal
role check and audit logging before streaming the object. A short-lived presigned URL
is acceptable after authorization, but it must be narrowly scoped and expire within
minutes.

Do not configure a waiver lifecycle deletion rule. Objects remain stored after their
lock expires. Monitor total storage and establish a deliberate deletion policy only if
cost or a future records policy makes one necessary. A $10 monthly account-spend alert
triggers that review long before storage capacity becomes an operational problem.

## Cost model

The main cost risk is public delivery and image-management convenience, not raw file
storage.

- R2 includes 10 GB of storage, 1 million Class A operations, 10 million Class B
  operations, and all egress each month. Standard storage beyond the allowance costs
  $0.015 per GB-month.
- Cloudflare's free image-transformation allowance covers 5,000 unique source-and-size
  combinations per month. Repeated views of the same cached transformation do not each
  create another transformation.
- At 1,000 waivers per year, 500 KB per PDF, and eight years of retained material,
  waiver storage is about 4 GB. Even 2,000 one-megabyte PDFs per year for eight years
  is about 16 GB. After the free allowance, that example costs roughly $0.09 per month
  for R2 storage, before adding the current sub-1-GB public library.

Measure the WordPress library and generate representative waiver PDFs before relying
on the free allowance. Configure an account-wide $10 monthly budget alert even when
expected cost is zero.

Cloudflare DNS, its Free domain plan, and static Cloudflare Pages asset requests can
all cost $0, but they are not a $10 bundle. R2, Workers, and Images are separate
usage-based products shown in the same account and billing dashboard. At WYC's present
scale, the expected combined Cloudflare bill for DNS, Pages, R2, and image
transformations is $0 rather than a fixed subscription.

## Dashboard and AI-assisted administration

The R2 dashboard can create buckets and folders and upload, list, download, and delete
objects. That is learnable for a technical maintainer, but it is no more a publishing
system than an FTP client. The eventual media-director workflow is intentionally
undecided; the storage choice does not require the media director to administer R2.

Cloudflare provides several useful maintainer interfaces:

- Wrangler manages R2, Workers, Pages, and other Cloudflare services from the command
  line and works well with coding agents.
- R2 exposes both a standard S3-compatible API and Cloudflare's API, so common SDKs,
  migration tools, and AI-generated code apply.
- Cloudflare's managed API MCP server can search and operate more than 2,500 Cloudflare
  API endpoints, including R2, DNS, Workers, and other account configuration, through
  OAuth-scoped access.
- Cloudflare publishes agent-oriented documentation indexes and an official skills
  plugin. The current Codex workspace already has that Cloudflare guidance installed.

AI is a maintainer convenience, not an operational dependency. AI access to production
should use narrowly scoped tokens and human confirmation for deletion, bucket
settings, DNS changes, and deployment changes.

## Alternatives considered

### Backblaze B2

B2 is the runner-up. It is already in WYC's account portfolio, has an S3-compatible
API, a permanent 10 GB free allowance, inexpensive storage, file versions, and stronger
compliance-mode Object Lock and legal-hold features than R2.

Those waiver-specific features no longer outweigh the operational benefit of keeping
the public site, media delivery, DNS, storage, billing visibility, and developer tools
in Cloudflare. B2 remains appropriate for database backups and could become an
independent R2 backup target later if WYC decides the media or waiver archive needs a
second provider.

### Cloudinary

Cloudinary has the strongest ready-made media-library interface in this comparison and
handles uploads, transformations, optimization, and CDN delivery in one product. Its
free plan provides three users and 25 monthly credits shared across stored GB,
delivered GB, and transformations.

It is not the default because a busy month or a larger original library consumes the
same shared credit pool, and the next self-service plan starts around $99 per month.
That is a poor cost transition for a small club. Use it only if the no-code editorial
workflow is worth that risk, and use it only for public media, not canonical waivers.

### Vercel Blob

Vercel Blob is convenient for the Vercel-hosted database application, but it does not
solve image editing or responsive transformation. Its Hobby allowance is 1 GB stored
and 10 GB transferred, and a Hobby project loses Blob access after exceeding included
usage until the rolling period clears. Reads and transfer are not simply free. It uses
its own SDK and CLI rather than exposing the portable S3 API assumed by the previous
plan. It also couples public website media to Vercel even though the Astro site is
planned for Cloudflare.

## Verification and recovery

- Keep Cloudflare account recovery and administrative credentials in the shared
  password manager, with at least two current club administrators.
- Require multi-factor authentication and use bucket-scoped R2 application keys.
- Back up the MySQL rows that map business records to object keys and hashes.
- Run a periodic inventory that confirms every referenced waiver object exists and
  matches its stored size and hash.
- Perform an annual restore drill for one public image, one private profile image, and
  one waiver PDF.
- Document bulk export with standard S3-compatible tools so changing providers does
  not depend on a future maintainer learning a proprietary SDK.
- Treat R2 durability as protection from hardware loss, not as a substitute for access
  control, retention locks, recovery procedures, or periodic verification.

## Implementation order

1. Finish the WordPress reference inventory and generate representative waiver PDFs.
2. Create development R2 buckets and a small storage adapter using the AWS S3 client.
3. Prove private upload, hash verification, bucket-lock retention, authorized download,
   and public Cloudflare delivery with disposable test objects.
4. Migrate the WordPress media library and update the Astro media base URL.
5. Implement waiver upload, reconciliation, access audit, and locked retention
   alongside the waiver forms.
6. Implement member profile uploads only when that feature is scheduled.
7. Create production buckets and credentials only after the development proof is
   verified.
8. Document account ownership, billing alerts, restore steps, and provider export.

## Deferred product decisions

These do not need answers before choosing the storage foundation:

- The media-director upload, metadata, and gallery-ordering workflow.
- Whether Google Drive remains the long-term original-photo archive or R2 eventually
  holds every event original.
- Profile-photo file limits, cropping, derivatives, replacement, and original
  retention.
- Whether the public site ever needs Cloudflare image transformations or generated
  responsive variants.

## Research references

- [Backblaze B2 pricing](https://www.backblaze.com/cloud-storage/pricing)
- [Backblaze B2 Object Lock and legal holds](https://www.backblaze.com/docs/cloud-storage-enable-object-lock-or-a-legal-hold-on-an-existing-bucket)
- [Backblaze B2 delivery through Cloudflare](https://www.backblaze.com/docs/cloud-storage-deliver-public-backblaze-b2-content-through-cloudflare-cdn)
- [Backblaze B2 Claude skill](https://www.backblaze.com/blog/?p=112838)
- [Cloudflare Images pricing](https://developers.cloudflare.com/images/pricing/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare R2 bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/)
- [Cloudflare API MCP server](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/)
- [Cloudflare usage-based billing](https://developers.cloudflare.com/billing/understand/usage-based-billing/)
- [Cloudflare Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/)
- [Cloudinary pricing](https://cloudinary.com/pricing)
- [Vercel Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)
