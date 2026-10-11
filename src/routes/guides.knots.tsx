import { createFileRoute } from '@tanstack/react-router'
import { ChevronDown, ExternalLink, ImageIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

import { GuideHeader } from '@/components/GuideHeader'
import { Button } from '@/components/ui/button'
import { guideImageUrl } from '@/lib/guide-media'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/guides/knots')({
  head: () => ({
    meta: [
      { title: 'Knots Guide | Washington Yacht Club' },
      {
        name: 'description',
        content: 'Essential dinghy knots and extra knots for WYC daysailers and keelboats.',
      },
    ],
  }),
  component: KnotsGuide,
})

type KnotUse = {
  label: string
  photo?: {
    file: string
    alt: string
    width: number
    height: number
  }
}

type Knot = {
  id: string
  name: string
  purpose: ReactNode
  uses: KnotUse[]
  note?: string
  caution?: string
  bottomWarning?: string
  guideUrl?: string
  guideVideoUrl?: string
}

const dinghyKnots: Knot[] = [
  {
    id: 'figure-eight',
    name: 'Figure 8',
    purpose: 'Makes a stopper that keeps a line from pulling through a block or other opening.',
    uses: [
      {
        label: 'FJ halyard',
        photo: {
          file: 'figure-8-fj-halyard.webp',
          alt: 'Figure-eight stopper knot securing the FJ halyard through the sail headboard.',
          width: 579,
          height: 434,
        },
      },
      {
        label: 'FJ jib sheets',
        photo: {
          file: 'figure-8-fj-jib-sheets.webp',
          alt: 'Figure-eight stopper knot in an FJ jib sheet beside its block.',
          width: 539,
          height: 404,
        },
      },
    ],
    guideUrl: 'https://www.animatedknots.com/figure-8-knot',
  },
  {
    id: 'cleat-hitch',
    name: 'Cleat hitch',
    purpose: 'Secures a line to a cleat.',
    uses: [
      {
        label: 'FJ rudder line to the tiller',
      },
      {
        label: 'Laser rudder line to the tiller',
      },
      {
        label: 'FJ halyard to mast',
        photo: {
          file: 'cleat-hitch-fj-main-halyard.webp',
          alt: 'FJ main halyard secured to the mast cleat with a cleat hitch.',
          width: 480,
          height: 640,
        },
      },
    ],
    note: 'Easiest to practice at the dock. There are cleats on the dock just north of the dinghies, and on every FJ.',
    guideUrl: 'https://www.animatedknots.com/cleat-hitch-halyard-knot',
  },
  {
    id: 'bowline',
    name: 'Bowline',
    purpose: (
      <>
        Creates a fixed loop for attaching a line to something. Often called the
        <em> king of knots</em>, because it is very versatile and easy to untie.
      </>
    ),
    uses: [
      {
        label: 'Laser downhaul',
        photo: {
          file: 'bowline-laser-downhaul.webp',
          alt: 'Laser downhaul lines and bowline at the base of the mast.',
          width: 497,
          height: 747,
        },
      },
      {
        label: 'Laser outhaul',
        photo: {
          file: 'bowline-laser-outhaul.webp',
          alt: 'Bowline in the Laser outhaul line at the end of the boom.',
          width: 746,
          height: 496,
        },
      },
      {
        label: 'Dinghy painter to the dock',
      },
    ],
    guideUrl: 'https://www.animatedknots.com/bowline-knot',
    guideVideoUrl: 'https://www.youtube.com/watch?v=eQYVnOWlIZI',
    bottomWarning: "Bowlines can be challenging! Don't be discouraged, it just takes practice.",
  },
  {
    id: 'square-knot',
    name: 'Square knot',
    purpose:
      'Secures a line around something by tying its two ends together. Also called a reef knot.',
    uses: [
      {
        label: 'Laser clew to boom',
        photo: {
          file: 'square-knot-laser-clew.webp',
          alt: 'Tying the Laser clew line around the boom with a square knot.',
          width: 748,
          height: 501,
        },
      },
    ],
    caution: 'Not safe for heavy loads or joining two separate lines that will carry a load.',
    guideUrl: 'https://www.animatedknots.com/square-knot',
  },
]

const extraKnots: Knot[] = [
  {
    id: 'two-half-hitches-on-a-bight',
    name: '2 half hitches on a bight',
    purpose:
      'Uses a doubled section of line (a bight) to tie at the dock without feeding the entire end through the ring.',
    uses: [
      {
        label: 'KB or daysailer mooring line to a ring at the dock',
      },
    ],
    guideVideoUrl: 'https://www.youtube.com/watch?v=7H9Kwl5BYl4&t=35s',
  },
  {
    id: 'clove-hitch',
    name: 'Clove hitch',
    purpose: 'Attaches a line around a rail or post.',
    uses: [
      {
        label: 'Fenders on daysailers and KBs',
      },
    ],
    guideUrl: 'https://www.animatedknots.com/clove-hitch-knot-rope-end',
  },
]

function Disclosure({
  title,
  children,
  heading = false,
  photo = false,
}: {
  title: string
  children: ReactNode
  heading?: boolean
  photo?: boolean
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const trigger = (
    <Button
      type="button"
      variant="ghost"
      aria-label={photo ? `${title} photo` : undefined}
      aria-expanded={open}
      aria-controls={id}
      onClick={() => setOpen(!open)}
      className={cn(
        'h-auto w-full justify-between gap-4 whitespace-normal rounded-none text-left',
        heading
          ? 'min-h-18 bg-wyc-purple/5 px-4 py-4 hover:bg-wyc-purple/10 focus-visible:ring-inset focus-visible:ring-wyc-purple sm:px-5'
          : 'min-h-11 px-3 py-3',
        heading && open && 'border-b border-wyc-purple/40',
        photo && 'min-h-12 gap-2.5 px-0 py-2.5',
      )}
    >
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block',
            heading ? 'text-2xl font-bold' : 'text-base font-medium',
            photo && 'text-base font-normal',
          )}
        >
          {title}
        </span>
      </span>
      {photo && <ImageIcon aria-hidden="true" />}
      {heading ? (
        <span
          aria-hidden="true"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-wyc-purple/40 bg-background text-2xl leading-none font-normal text-wyc-purple"
        >
          {open ? '−' : '+'}
        </span>
      ) : (
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'shrink-0 transition-transform motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      )}
    </Button>
  )

  return (
    <>
      {heading ? <h3>{trigger}</h3> : trigger}
      <div id={id} hidden={!open}>
        {children}
      </div>
    </>
  )
}

function KnotCard({ knot }: { knot: Knot }) {
  return (
    <article
      id={knot.id}
      className="overflow-hidden rounded-xl border-2 border-wyc-purple/40 bg-background"
    >
      <Disclosure title={knot.name} heading>
        <div className="space-y-8 p-4 pb-6 sm:p-5 sm:pb-8">
          <p className="max-w-prose text-base leading-relaxed">{knot.purpose}</p>
          {knot.caution && (
            <p className="rounded-r-md border-l-4 border-wyc-purple bg-wyc-purple/10 px-4 py-3 text-base leading-relaxed text-foreground">
              {knot.caution}
            </p>
          )}
          {knot.note && <p className="max-w-prose text-base leading-relaxed">{knot.note}</p>}

          <div>
            <h4 className="mb-3 text-lg font-bold">Where we use it</h4>
            <ul>
              {knot.uses.map((use) => (
                <li key={use.label}>
                  {use.photo ? (
                    <Disclosure title={use.label} photo>
                      <figure className="pt-0.5 pb-3">
                        <img
                          src={guideImageUrl('knots', use.photo.file)}
                          alt={use.photo.alt}
                          width={use.photo.width}
                          height={use.photo.height}
                          loading="lazy"
                          decoding="async"
                          className="mx-auto block h-auto max-h-[70svh] max-w-full rounded-md object-contain"
                        />
                      </figure>
                    </Disclosure>
                  ) : (
                    <p className="py-2.5 text-base leading-relaxed">{use.label}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-lg font-bold">How to tie</h4>
            <div className="space-y-3">
              {knot.guideUrl && (
                <Button
                  asChild
                  variant="link"
                  className="h-auto whitespace-normal p-0 text-left text-base text-wyc-purple"
                >
                  <a href={knot.guideUrl} target="_blank" rel="noopener noreferrer">
                    Step-by-step animation · Animated Knots
                    <ExternalLink aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Button>
              )}
              {knot.guideVideoUrl && (
                <div>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto whitespace-normal p-0 text-left text-base text-wyc-purple"
                  >
                    <a href={knot.guideVideoUrl} target="_blank" rel="noopener noreferrer">
                      Video tutorial · YouTube
                      <ExternalLink aria-hidden="true" />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
          {knot.bottomWarning && (
            <p className="rounded-r-md border-l-4 border-wyc-purple bg-wyc-purple/10 px-4 py-3 text-base leading-relaxed text-foreground">
              {knot.bottomWarning}
            </p>
          )}
        </div>
      </Disclosure>
    </article>
  )
}

function KnotsGuide() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-5 py-8 text-foreground sm:px-8 sm:py-12">
      <GuideHeader title="Knots Guide" />
      <section aria-labelledby="dinghy-minimum">
        <h2 id="dinghy-minimum" className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Minimum Required for Dinghies
        </h2>
        <p className="mt-3 mb-6 max-w-prose text-base leading-relaxed">
          Necessary for rigging Lasers, FJs, or Cats.
        </p>
        <div className="space-y-4">
          {dinghyKnots.map((knot) => (
            <KnotCard key={knot.id} knot={knot} />
          ))}
        </div>
      </section>

      <section aria-labelledby="extra-knots" className="mt-16">
        <h2 id="extra-knots" className="text-3xl font-bold tracking-tight sm:text-4xl">
          More Knots
        </h2>
        <p className="mt-3 mb-6 max-w-prose text-base leading-relaxed">
          Necessary for daysailers and keelboats.
        </p>
        <div className="space-y-4">
          {extraKnots.map((knot) => (
            <KnotCard key={knot.id} knot={knot} />
          ))}
        </div>
      </section>
    </main>
  )
}
