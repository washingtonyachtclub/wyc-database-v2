import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { GuideHeader } from '@/components/GuideHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/guides/fj')({
  head: () => ({
    meta: [
      { title: 'FJ Rigging Guide | Washington Yacht Club' },
      {
        name: 'description',
        content: 'Step-by-step instructions for rigging, launching, and putting away a WYC FJ.',
      },
    ],
  }),
  component: FjRiggingGuide,
})

// TODO(pre-commit): This R2 development URL is intentionally hard-coded until the
// permanent public-media domain is available.
const publicMediaBaseUrl = 'https://pub-5a3e3c50b33c4b70b19b652343752a89.r2.dev'
const riggingVideoUrl = 'https://www.youtube.com/watch?v=N4N_PYAmEHI&t=93s'

const guideSections = {
  setup: 'Setup',
  jib: 'Jib sail',
  mainsail: 'Mainsail',
  launching: 'Launching the boat',
  'final-sail-setup': 'Final Sail Setup',
  derigging: 'Derigging',
} as const

function guideImage(file: string) {
  return `${publicMediaBaseUrl}/website/guides/fj/${file}`
}

type GuideContentsItem = {
  id: string
  title: string
  children: GuideContentsItem[]
}

function GuideContents() {
  const navRef = useRef<HTMLElement>(null)
  const [activeId, setActiveId] = useState('setup')
  const [items, setItems] = useState<GuideContentsItem[]>(() =>
    Object.entries(guideSections).map(([id, title]) => ({ id, title, children: [] })),
  )

  useEffect(() => {
    const sections = Object.entries(guideSections).map(([id, title]) => ({
      id,
      title,
      element: document.getElementById(id),
    }))
    const targets: HTMLElement[] = []
    setItems(
      sections.map(({ id, title, element }) => {
        const children: GuideContentsItem[] = []
        if (element) {
          targets.push(element)
          for (const heading of element.querySelectorAll<HTMLElement>('h3[id], h4[id]')) {
            targets.push(heading)
            const item = { id: heading.id, title: heading.textContent ?? '', children: [] }
            const parent = children.at(-1)
            if (heading.tagName === 'H4' && parent) parent.children.push(item)
            else children.push(item)
          }
        }
        return { id, title, children }
      }),
    )
    let frame: number | undefined

    const updateActiveSection = () => {
      frame = undefined
      let currentId = sections[0].id
      for (const element of targets) {
        if (element.getBoundingClientRect().top <= 96) currentId = element.id
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        currentId = targets.at(-1)?.id ?? currentId
      }
      setActiveId(currentId)
    }

    const scheduleUpdate = () => {
      if (frame === undefined) frame = requestAnimationFrame(updateActiveSection)
    }

    const resizeObserver = new ResizeObserver(scheduleUpdate)
    for (const { element } of sections) {
      if (element) resizeObserver.observe(element)
    }
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    updateActiveSection()

    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      resizeObserver.disconnect()
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const nav = navRef.current
    const activeLink = nav?.querySelector<HTMLElement>('[aria-current="location"]')
    if (!nav?.clientHeight || !activeLink) return

    const navBounds = nav.getBoundingClientRect()
    const linkBounds = activeLink.getBoundingClientRect()
    if (linkBounds.top < navBounds.top) {
      nav.scrollBy({ top: linkBounds.top - navBounds.top, behavior: 'instant' })
    } else if (linkBounds.bottom > navBounds.bottom) {
      nav.scrollBy({ top: linkBounds.bottom - navBounds.bottom, behavior: 'instant' })
    }
  }, [activeId, items])

  function renderItems(entries: GuideContentsItem[], nested = false): ReactNode {
    return (
      <ul className={cn('m-0 list-none', nested ? 'pl-3' : 'space-y-3 p-0')}>
        {entries.map((item) => (
          <li key={item.id}>
            <Button
              asChild
              variant="link"
              className={cn(
                'h-auto w-full justify-start whitespace-normal rounded-none px-0 py-1 text-left text-sm leading-5 transition-none hover:no-underline',
                activeId === item.id
                  ? 'font-bold text-primary'
                  : nested
                    ? 'font-normal text-muted-foreground hover:text-foreground'
                    : 'font-semibold text-foreground',
              )}
            >
              <a href={`#${item.id}`} aria-current={activeId === item.id ? 'location' : undefined}>
                {item.title}
              </a>
            </Button>
            {item.children.length > 0 && renderItems(item.children, true)}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <nav
      ref={navRef}
      aria-label="Guide contents"
      className="sticky top-8 hidden max-h-[calc(100dvh-4rem)] self-start overflow-y-auto lg:block print:hidden"
    >
      <p className="m-0 mb-3 text-sm font-bold">Contents</p>
      {renderItems(items)}
    </nav>
  )
}

function GuideSection({ id, children }: { id: keyof typeof guideSections; children: ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-4 print:break-inside-avoid"
      aria-labelledby={`${id}-title`}
    >
      <header className="mb-10">
        <h2 id={`${id}-title`} className="m-0 text-[clamp(2rem,5vw,3rem)] leading-[1.1]">
          {guideSections[id]}
        </h2>
      </header>
      <div className="grid gap-14">{children}</div>
    </section>
  )
}

function GuideStep({
  id,
  title,
  children,
  nested = false,
}: {
  id: string
  title: string
  children?: ReactNode
  nested?: boolean
}) {
  const Heading = nested ? 'h4' : 'h3'

  return (
    <article aria-labelledby={id}>
      <header className="mb-6">
        <Heading
          id={id}
          className="m-0 mb-[0.8rem] scroll-mt-4 text-[clamp(1.35rem,3vw,1.8rem)] leading-[1.2]"
        >
          {title}
        </Heading>
      </header>
      {children && <div className="grid gap-10">{children}</div>}
    </article>
  )
}

function GuideAction({
  children,
  media,
  stacked = false,
}: {
  children?: ReactNode
  media?: ReactNode
  stacked?: boolean
}) {
  return (
    <div
      className={cn(
        'print:break-inside-avoid',
        children && media ? 'grid grid-cols-1 items-start gap-6' : 'block max-w-[44rem]',
        children &&
          media &&
          (stacked
            ? 'max-w-[44rem]'
            : 'xl:grid-cols-[minmax(14rem,0.85fr)_minmax(0,1.15fr)] xl:gap-10'),
      )}
    >
      {children && (
        <div
          className={cn(
            'text-base leading-[1.6] text-foreground',
            '[&_p]:m-0 [&_p]:mb-4 [&_p:last-child]:mb-0',
            '[&_ul]:m-0 [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1 [&_ul]:pl-[1.4rem]',
            '[&_li>ul]:mt-1 [&_li>ul]:gap-1 [&_ul_ul]:list-[circle]',
            '[&>ul+p]:mt-4 [&_a]:text-primary [&_a]:underline',
          )}
        >
          {children}
        </div>
      )}
      {media && <div className="@container min-w-0">{media}</div>}
    </div>
  )
}

function PhotoGrid({ children, columns = 2 }: { children: ReactNode; columns?: 2 | 3 }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 items-start gap-4 @min-[30rem]:grid-cols-2',
        columns === 3 && '@min-[45rem]:grid-cols-3',
      )}
    >
      {children}
    </div>
  )
}

function Figure({
  file,
  alt,
  width,
  height,
  caption,
  className = '',
}: {
  file: string
  alt: string
  width: number
  height: number
  caption?: string
  className?: string
}) {
  return (
    <figure className={cn('m-0 min-w-0 print:break-inside-avoid', className)}>
      <img
        src={guideImage(file)}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full object-contain"
      />
      {caption && (
        <figcaption className="mt-[0.6rem] text-base leading-[1.6] text-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

function Warning({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <aside className={cn('font-bold leading-[1.5] text-destructive', className)}>{children}</aside>
  )
}

function FjRiggingGuide() {
  return (
    <main className="min-h-screen bg-background px-4 pt-7 pb-20 font-[Arial,Helvetica,sans-serif] text-foreground [--color-primary:var(--color-wyc-purple)] [--color-ring:var(--color-wyc-purple)] min-[481px]:pt-10 print:p-0">
      <div className="mx-auto max-w-[68rem] lg:grid lg:max-w-[87rem] lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-x-10 xl:gap-x-14 print:block">
        <GuideHeader title="FJ Rigging Guide" className="lg:col-start-2">
          <p className="text-base font-bold text-wyc-purple">
            TODO: watch kevins video and consider adding to top
          </p>
        </GuideHeader>

        <GuideContents />

        <div className="min-w-0 space-y-20">
          <GuideSection id="setup">
            <Warning className="-mb-4">
              DO NOT STEP INTO THE BOAT WHEN IT IS NOT IN THE WATER. It can damage the hull.
            </Warning>

            <GuideStep id="equipment" title="Equipment">
              <GuideAction
                media={
                  <Figure
                    file="page-01-04.webp"
                    width={464}
                    height={348}
                    alt="Tiller, rudder, and PFDs placed in the FJ"
                  />
                }
              >
                <p>
                  Put the tiller, rudder, and PFDs in the boat. Grab the right rudder/tiller combo
                  to match the color of your FJ's hull.
                </p>
                <ul>
                  <li>White FJs: smaller support bracket and curvy tiller</li>
                  <li>Blue FJs: larger support bracket and straight tiller</li>
                </ul>
              </GuideAction>
            </GuideStep>

            <GuideStep id="drain-plugs" title="Drain and install plugs">
              <GuideAction
                media={
                  <Figure
                    file="page-01-01.webp"
                    width={470}
                    height={352}
                    alt="Centerboard line held in its jam cleat"
                    caption="Centerboard line secure in the jam cleat."
                  />
                }
              >
                <p>
                  Make sure centerboard is held tight by the jam cleat so it will not fall when you
                  lift the boat.
                </p>
              </GuideAction>

              <GuideAction
                media={
                  <Figure
                    file="page-01-03.webp"
                    width={544}
                    height={408}
                    alt="Two sailors lifting an FJ at the dock"
                  />
                }
              >
                <p>
                  If there is water in the boat, undo the drain plug and lift the boat at the
                  shrouds until the transom is off the edge of the dock. Use a carpet at the edge of
                  the dock to protect the boat&apos;s fiberglass.
                </p>
              </GuideAction>

              <GuideAction
                media={
                  <PhotoGrid>
                    <Figure
                      file="page-01-02.webp"
                      width={534}
                      height={400}
                      alt="Stern side-tank plug installed in an FJ"
                      caption="Stern plug"
                    />
                    <Figure
                      file="page-02-02.webp"
                      width={819}
                      height={614}
                      alt="Sailor installing a side-tank plug inside an FJ"
                      caption="Side-tank plugs"
                    />
                  </PhotoGrid>
                }
              >
                <p>Put the drain plugs in.</p>
              </GuideAction>
            </GuideStep>

            <GuideStep id="loosen-sail-controls" title="Loosen sail controls">
              <GuideAction
                media={
                  <PhotoGrid>
                    <Figure
                      file="page-02-01.webp"
                      width={580}
                      height={435}
                      alt="Knot at the mainsheet block being undone"
                      caption="Undo the knot in the mainsheet block, if there is one."
                    />
                    <Figure
                      file="page-02-03.webp"
                      width={332}
                      height={443}
                      alt="Sailor loosening the boom vang"
                      caption="Loosen the boom vang."
                    />
                  </PhotoGrid>
                }
              />
            </GuideStep>

            <GuideStep id="lower-boom" title="Lower the boom">
              <GuideAction
                media={
                  <PhotoGrid>
                    <Figure
                      file="page-03-04.webp"
                      width={443}
                      height={332}
                      alt="Sailor carefully lowering the boom into the FJ"
                      caption="A. Support the boom"
                    />
                    <Figure
                      file="page-03-02.webp"
                      width={251}
                      height={334}
                      alt="Sailor loosening a halyard at the mast"
                      caption="B. Loosen the halyard"
                    />
                  </PhotoGrid>
                }
              >
                <p>
                  Ask your crew to hold the boom while you loosen the halyard so the boom will not
                  drop into the boat.
                </p>
              </GuideAction>

              <GuideAction
                media={
                  <Figure
                    file="page-03-01.webp"
                    width={683}
                    height={512}
                    alt="Boom resting above the cockpit of an FJ"
                  />
                }
              >
                <p>Lower the boom carefully into the boat.</p>
              </GuideAction>

              <GuideAction
                media={
                  <Figure
                    file="page-03-03.webp"
                    width={510}
                    height={383}
                    alt="Sailor holding the two ends of the halyard together"
                  />
                }
              >
                <p>
                  Tie the halyard&apos;s ends together so that it does not get loose and sky at the
                  top of the mast. The ring and a wet halyard together can be enough weight to pull
                  the loose end up out of reach.
                </p>
              </GuideAction>
            </GuideStep>
          </GuideSection>

          <GuideSection id="jib">
            <GuideStep id="secure-jib-and-halyard" title="Secure jib and halyard">
              <GuideAction
                media={
                  <Figure
                    file="page-04-03.webp"
                    width={408}
                    height={306}
                    alt="Attaching the jib tack with the retaining pin"
                  />
                }
              >
                Place the tack grommet at the bow and slide the retaining pin through it.
                <ul>
                  <li>The pin will feel loose until you raise the jib.</li>
                </ul>
              </GuideAction>

              <GuideAction
                media={
                  <Figure
                    file="page-04-01.webp"
                    width={384}
                    height={288}
                    alt="Jib halyard shackle connected to the head of the jib"
                  />
                }
              >
                Connect the jib halyard shackle to the jib sail&apos;s head.
              </GuideAction>

              <GuideAction
                media={
                  <PhotoGrid>
                    <Figure
                      file="page-04-05.webp"
                      width={275}
                      height={366}
                      alt="Tensioning the jib halyard beside the mast"
                      caption="A. Feed through bottom block"
                    />
                    <Figure
                      file="page-04-04.webp"
                      width={300}
                      height={225}
                      alt="Jib halyard threaded through the small block"
                      caption="B. Feed through small block on the halyard"
                    />
                  </PhotoGrid>
                }
              >
                <p>
                  Feed the jib halyard through the block at the bottom of the mast. Pull on the
                  halyard until the small block on the halyard is low enough to feed the halyard
                  through.
                </p>
              </GuideAction>
            </GuideStep>

            <GuideStep id="tension-jib-halyard" title="Tension jib halyard">
              <GuideAction
                media={
                  <Figure
                    file="page-04-02.webp"
                    width={387}
                    height={290}
                    alt="Crew member pulling the forestay forward"
                    caption="Crew helps bend the mast forward, letting the skipper get more halyard tension"
                  />
                }
              >
                Have your crew pull on the forestay to create tension on the mast while you pull on
                the halyard.
                <ul>
                  <li>
                    See the{' '}
                    <a href={riggingVideoUrl} target="_blank" rel="noreferrer">
                      rigging video
                    </a>{' '}
                    for more detail about mast tension.
                  </li>
                </ul>
              </GuideAction>

              <GuideAction
                media={
                  <figure className="m-0 flex aspect-[4/3] items-center justify-center border border-dashed border-border bg-muted p-6 text-center text-base leading-[1.6] text-foreground">
                    <figcaption>
                      Photo placeholder: jib halyard secured to the mast cleat.
                    </figcaption>
                  </figure>
                }
              >
                <p>
                  Secure the jib halyard to the cleat on the mast with a cleat hitch. Make sure not
                  to lose tension as you tie it.
                </p>
              </GuideAction>

              <GuideAction
                media={
                  <Figure
                    file="page-05-01.webp"
                    width={318}
                    height={424}
                    alt="Sailor testing the jib luff tension at the shroud"
                  />
                }
              >
                <p>
                  Test the luff tension by pulling on the shroud. It should be tight because the jib
                  is now holding up the mast and the forestay is loose.
                </p>
              </GuideAction>
            </GuideStep>

            <GuideStep id="jib-sheets" title="Run jib sheets">
              <GuideAction
                media={
                  <Figure
                    file="page-05-02.webp"
                    width={539}
                    height={404}
                    alt="Jib sheet passing through its block"
                  />
                }
              >
                <p>
                  Run the jib sheets through the blocks and tie a figure-eight knot at each end.
                  Make sure the sheets stay inside the shrouds.
                </p>
              </GuideAction>
            </GuideStep>
          </GuideSection>

          <GuideSection id="mainsail">
            <GuideStep id="mainsail-foot" title="Foot">
              <GuideAction
                media={
                  <PhotoGrid>
                    <Figure
                      file="page-06-03.webp"
                      width={512}
                      height={384}
                      alt="Main-sail tack with Cunningham grommet above it"
                      caption="Tack / Cunningham grommet."
                    />
                    <Figure
                      file="page-06-01.webp"
                      width={500}
                      height={375}
                      alt="Large grommet at the clew of the main sail"
                      caption="Clew grommet."
                    />
                  </PhotoGrid>
                }
              >
                <p>Locate the tack and clew of the main sail.</p>
                <ul>
                  <li>The tack grommet has the small grommet for the Cunningham above it.</li>
                  <li>The clew has a large grommet.</li>
                </ul>
              </GuideAction>

              <GuideAction
                media={
                  <figure className="m-0 flex aspect-[4/3] items-center justify-center border border-dashed border-border bg-muted p-6 text-center text-base leading-[1.6] text-foreground">
                    <figcaption>Photo placeholder: rubber slug in the boom slot.</figcaption>
                  </figure>
                }
              >
                <p>
                  Starting at the mast, slide the rubber slug into the boom slot and pull it down to
                  the stern end of the boom. You can optionally slide the entire bolt rope at the
                  foot of the sail through the boom.
                </p>
              </GuideAction>
            </GuideStep>

            <GuideStep id="mainsail-outhaul" title="Tack, clew, and outhaul">
              <GuideAction
                media={
                  <PhotoGrid columns={3}>
                    <Figure
                      file="page-07-01.webp"
                      width={502}
                      height={376}
                      alt="Main sail being fed into the mast slot"
                      caption="A. Feed the tack end into the mast slot."
                    />
                    <Figure
                      file="page-07-03.webp"
                      width={504}
                      height={378}
                      alt="Outhaul passed through the main-sail clew"
                      caption="B. Pass the outhaul through the clew."
                    />
                    <Figure
                      file="page-07-02.webp"
                      width={640}
                      height={480}
                      alt="Outhaul aligned along the end of the boom"
                      caption="C. Run the outhaul through the block on the boom."
                    />
                  </PhotoGrid>
                }
              >
                <p>
                  Secure the tack by sliding the rubber slug into the mast slot. Pass the outhaul
                  through the clew grommet, then align it in the block on the boom.
                </p>
              </GuideAction>

              <GuideAction
                media={
                  <Figure
                    file="page-07-04.webp"
                    width={550}
                    height={412}
                    alt="Outhaul secured in the jam cleat on the boom"
                  />
                }
              >
                <p>
                  Run the outhaul up the boom to the jam cleat near the mast. Push the outhaul into
                  the cleat and tie a figure-eight knot at the end of the line so it can't come out
                  of the cleat.
                </p>
              </GuideAction>
            </GuideStep>

            <GuideStep id="attach-main-halyard" title="Main halyard">
              <GuideAction
                media={
                  <PhotoGrid columns={3}>
                    <Figure
                      file="page-08-03.webp"
                      width={520}
                      height={390}
                      alt="Main halyard passed through the sail head twice"
                      caption="A. Pass the halyard through twice"
                    />
                    <Figure
                      file="page-08-01.webp"
                      width={512}
                      height={384}
                      alt="Figure-eight knot tied at the end of the main halyard"
                      caption="B. Tie a figure-eight knot"
                    />
                    <Figure
                      file="page-08-02.webp"
                      width={579}
                      height={434}
                      alt="Main halyard pulled tight against the sail head"
                      caption="C. Pull in any remaining slack"
                    />
                  </PhotoGrid>
                }
              >
                <p>
                  Untie the main halyard from where you secured it and make sure the end running
                  down the boom side of the mast is not twisted or fouled. Run the halyard through
                  the hole in the head of the sail twice. Secure the halyard with a figure-eight
                  knot and pull it tight to the head plate.{' '}
                  <strong>
                    Make sure the figure-eight knot has a long enough tail that it will not come
                    loose.
                  </strong>
                </p>
              </GuideAction>

              <GuideAction
                media={
                  <Figure
                    file="page-08-04.webp"
                    width={348}
                    height={464}
                    alt="Main sail raised a short distance up the mast"
                  />
                }
              >
                <p>
                  Raise the sail only a few feet and secure the halyard to the cleat on the mast.
                </p>
              </GuideAction>
            </GuideStep>
          </GuideSection>

          <GuideSection id="launching">
            <div id="launch-boat" className="grid scroll-mt-4 gap-10">
              <GuideAction>
                Double-check that the centerboard line is secure in the jam cleat and take hold of
                the painter so you don't lose the boat (the line attached to the bow).
              </GuideAction>

              <GuideAction
                media={
                  <Figure
                    file="page-09-02.webp"
                    width={544}
                    height={408}
                    alt="Two sailors preparing to lift an FJ from its dock support"
                    caption="Use the carpet to help the stern slide."
                  />
                }
              >
                Position your hands near the shrouds so you lift the boat at the beam, its widest
                point.
              </GuideAction>

              <GuideAction
                media={
                  <Figure
                    file="page-09-03.webp"
                    width={555}
                    height={416}
                    alt="Two sailors sliding the stern of an FJ into the water"
                  />
                }
              >
                Tie the boat to the dock (with a bowline knot) as soon as it is in the water and
                point the bow into the wind.
              </GuideAction>

              <GuideAction
                media={
                  <Figure
                    file="page-09-01.webp"
                    width={640}
                    height={480}
                    alt="Sail bag secured under the wooden FJ support"
                  />
                }
              >
                <p>
                  Secure the sail bag under the FJ support so the wind does not blow it away and
                  move the carpet away from the edge of the dock so it does not fall in the water.
                </p>
              </GuideAction>
            </div>

            <GuideStep id="lower-centerboard" title="Board the boat">
              <GuideAction
                media={
                  <PhotoGrid>
                    <Figure
                      file="page-10-01.webp"
                      width={512}
                      height={384}
                      alt="Sailor lowering the FJ centerboard"
                      caption="A. Lower the centerboard."
                    />
                    <Figure
                      file="page-10-02.webp"
                      width={640}
                      height={480}
                      alt="Bungee looped over the centerboard horns"
                      caption="B. Loop the bungee over the horns."
                    />
                  </PhotoGrid>
                }
              >
                <p>
                  Lower the centerboard to stabilize the boat before you step into the boat. Loop
                  the bungee over the horns on the board.
                </p>
              </GuideAction>

              <GuideAction
                stacked
                media={
                  <PhotoGrid>
                    <Figure
                      file="page-10-03.webp"
                      width={432}
                      height={576}
                      alt="Crew member holding the shroud while the boat is boarded"
                    />
                    <Figure
                      file="page-10-04.webp"
                      width={508}
                      height={381}
                      alt="Sailor stepping into the middle of an FJ"
                    />
                  </PhotoGrid>
                }
              >
                <p>
                  Make sure your crew is holding the shroud to keep the boat from tipping as you
                  step into the middle of the boat.
                </p>
              </GuideAction>
            </GuideStep>

            <GuideStep id="rudder-tiller" title="Rudder &amp; tiller">
              <GuideAction
                media={
                  <PhotoGrid>
                    <Figure
                      file="page-11-03.webp"
                      width={524}
                      height={393}
                      alt="Sailor lowering the rudder onto the FJ pins"
                      caption="Lower the rudder onto the pins."
                    />
                    <Figure
                      file="page-11-01.webp"
                      width={480}
                      height={640}
                      alt="Close view of the rudder retaining clip and gudgeon"
                      caption="Check that the retaining clip is in."
                    />
                  </PhotoGrid>
                }
              >
                <p>
                  Lower the rudder onto the pins. Make sure the retaining clip is in so the bottom
                  of the rudder does not hang up on it. When you take the rudder off, you may need
                  to push this clip in so the rudder can come out.
                </p>
              </GuideAction>

              <GuideAction
                media={
                  <PhotoGrid>
                    <Figure
                      file="page-11-02.webp"
                      width={640}
                      height={480}
                      alt="Tiller installed through the top of the rudder"
                      caption="A. Slide the tiller through the rudder."
                    />
                    <Figure
                      file="page-11-04.webp"
                      width={496}
                      height={372}
                      alt="Securing line tied to the cleat on the tiller"
                      caption="B. Tie the securing line to the tiller cleat."
                    />
                  </PhotoGrid>
                }
              >
                <p>
                  Slide the tiller through and make sure it sticks out a little from the back of the
                  rudder. Pull the securing line through the hole in the transom and tie it to the
                  cleat on the tiller with a cleat hitch.
                </p>
              </GuideAction>
            </GuideStep>
          </GuideSection>

          <GuideSection id="final-sail-setup">
            <GuideStep id="raise-main-sail" title="Raising the main">
              <GuideAction
                media={
                  <PhotoGrid columns={3}>
                    <Figure
                      file="page-12-02.webp"
                      width={512}
                      height={384}
                      alt="Sailor pulling the main halyard down at the mast"
                      caption="A. Pull the halyard until the ring is in reach."
                    />
                    <Figure
                      file="page-12-03.webp"
                      width={480}
                      height={640}
                      alt="Main halyard passed through the metal ring"
                      caption="B. Pass the halyard through the ring."
                    />
                    <Figure
                      file="page-12-01.webp"
                      width={480}
                      height={640}
                      alt="Main halyard tightened and secured beside the mast"
                      caption="C. Tighten and cleat the main halyard."
                    />
                  </PhotoGrid>
                }
              >
                <p>
                  Loop the main halyard under the cleat and pull until the ring is within reach.
                  Pass the halyard through the ring when you can reach it. Tighten down and secure
                  the main halyard onto the mast with a cleat hitch.
                </p>
              </GuideAction>
            </GuideStep>

            <GuideStep id="final-sail-controls" title="Cunningham, outhaul, vang">
              <GuideAction
                media={
                  <PhotoGrid>
                    <Figure
                      file="page-13-03.webp"
                      width={582}
                      height={437}
                      alt="Cunningham line passed through the grommet above the tack"
                      caption="Pass Cunningham through grommet."
                    />
                    <Figure
                      file="page-13-01.webp"
                      width={640}
                      height={480}
                      alt="Sailor tightening the Cunningham at the mast"
                      caption="Tighten in mast jam cleat."
                    />
                  </PhotoGrid>
                }
              >
                <p>
                  Pass the Cunningham through the small grommet above the tack and tighten it down
                  in the mast jam cleat.
                </p>
              </GuideAction>

              <GuideAction
                media={
                  <PhotoGrid>
                    <Figure
                      file="page-13-02.webp"
                      width={480}
                      height={360}
                      alt="Sailor tightening the outhaul"
                      caption="Adjust outhaul."
                    />
                    <Figure
                      file="page-13-04.webp"
                      width={480}
                      height={360}
                      alt="Sailor tightening the boom vang"
                      caption="Adjust boom vang."
                    />
                  </PhotoGrid>
                }
              >
                <p>Tighten the outhaul and the boom vang more if necessary.</p>
              </GuideAction>
            </GuideStep>

            <div className="grid grid-cols-1 items-center gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(14rem,0.85fr)] xl:gap-10">
              <Figure
                file="page-14-01.webp"
                width={640}
                height={480}
                alt="Sailor wearing a PFD in a fully rigged FJ"
                className="max-w-[42rem]"
              />
              <p className="m-0 text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-[1.15]">
                Make sure you wear a PFD, and have a good sail.
              </p>
            </div>
          </GuideSection>

          <GuideSection id="derigging">
            <GuideStep id="secure-boat" title="Secure the boat">
              <GuideAction>
                <p>Make sure you have the boat turned into the wind and secured to the dock.</p>
                <Warning className="my-4">
                  Before doing anything else, lower the main sail and raise the centerboard.
                </Warning>
                <p>Then follow the guide in reverse to undo everything.</p>
                <p>
                  If there is water in the boat, undo the transom plug when you put the boat back on
                  the dock support to let the water drain out.
                </p>
              </GuideAction>
            </GuideStep>

            <GuideStep id="roll-sails" title="Roll the sails">
              <GuideAction
                media={
                  <PhotoGrid>
                    <Figure
                      file="page-16-01.webp"
                      width={515}
                      height={386}
                      alt="Sailor starting to roll the jib"
                    />
                    <Figure
                      file="page-16-02.webp"
                      width={510}
                      height={382}
                      alt="Sailor rolling the main sail around the jib"
                    />
                  </PhotoGrid>
                }
              >
                <p>
                  It helps if you roll the jib first. When you are almost done rolling the main, you
                  can place the jib inside it.
                </p>
              </GuideAction>
            </GuideStep>

            <GuideStep id="return-sail-bag" title="Return the sail bag">
              <GuideAction
                media={
                  <Figure
                    file="page-17-01.webp"
                    width={820}
                    height={615}
                    alt="Sailor returning an FJ sail bag to its labeled shelf in the sail locker"
                    className="max-w-lg"
                  />
                }
              >
                <p>Return the sail bag to the shelf in the sail locker.</p>
              </GuideAction>
            </GuideStep>

            <p className="m-0 mt-4 text-[1.3rem] font-bold">
              Thank you for taking good care of the club&apos;s FJ.
            </p>
          </GuideSection>
        </div>
      </div>
    </main>
  )
}
