import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import './guides.fj.css'

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

function guideImage(file: string) {
  return `${publicMediaBaseUrl}/website/guides/fj/${file}`
}

function GuideSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="fj-section" aria-labelledby={`${id}-title`}>
      <header className="fj-section__header">
        <h2 id={`${id}-title`}>{title}</h2>
      </header>
      <div className="fj-section__steps">{children}</div>
    </section>
  )
}

function GuideStep({
  number,
  title,
  children,
  media,
  nested = false,
  compact = false,
}: {
  number: number
  title: string
  children?: ReactNode
  media?: ReactNode
  nested?: boolean
  compact?: boolean
}) {
  const Heading = nested ? 'h4' : 'h3'

  return (
    <article className={`fj-step${compact ? ' fj-step--compact' : ''}`}>
      <div className="fj-step__copy">
        <p className="fj-step__number">Step {number}</p>
        <Heading>{title}</Heading>
        {children && <div className="fj-copy">{children}</div>}
      </div>
      {media && <div className="fj-step__media">{media}</div>}
    </article>
  )
}

function Figure({
  file,
  alt,
  caption,
  className = '',
}: {
  file: string
  alt: string
  caption?: string
  className?: string
}) {
  return (
    <figure className={`fj-figure ${className}`}>
      <img src={guideImage(file)} alt={alt} loading="lazy" decoding="async" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

function Warning({ children }: { children: ReactNode }) {
  return <aside className="fj-warning">{children}</aside>
}

function FjRiggingGuide() {
  return (
    <main className="fj-guide">
      <header className="fj-title">
        <p>Washington Yacht Club</p>
        <h1>Rigging an FJ</h1>
      </header>

      <div className="fj-sections">
        <GuideSection id="setup" title="Setup">
          <Warning>
            DO NOT STEP INTO THE BOAT WHEN IT IS NOT IN THE WATER. It can damage the boat.
          </Warning>

          <GuideStep
            number={1}
            title="Equipment"
            media={
              <div className="fj-photo-grid fj-photo-grid--two">
                <Figure
                  file="page-01-04.webp"
                  alt="Tiller, rudder, and PFDs placed in the FJ"
                  caption="A. Tiller, rudder, and PFDs in the boat."
                />
                <Figure
                  file="page-01-01.webp"
                  alt="Centerboard line held in its jam cleat"
                  caption="B. Centerboard line secure in the jam cleat."
                />
              </div>
            }
          >
            <ol>
              <li>
                Put the tiller, rudder, and PFDs in the boat. Grab the right rudder/tiller combo to
                match the color of your FJ's hull.
                <ul>
                  <li>White FJs: smaller support bracket and curvy</li>
                  <li>Blue FJs: larger support bracket and straight tiller.</li>
                </ul>
              </li>
              <li>
                Make sure centerboard is held tight by the jam cleat so it will not fall when you
                lift the boat.
              </li>
            </ol>
          </GuideStep>

          <GuideStep
            number={2}
            title="Drain the boat and install the plugs"
            media={
              <div className="fj-photo-grid fj-photo-grid--three">
                <Figure
                  file="page-01-03.webp"
                  alt="Two sailors lifting an FJ at the dock"
                  caption="C. Lift at the shrouds and protect the fiberglass with a carpet."
                />
                <Figure
                  file="page-01-02.webp"
                  alt="Stern side-tank plug installed in an FJ"
                  caption="D. Put the stern side-tank plugs in after draining."
                />
                <Figure
                  file="page-02-02.webp"
                  alt="Sailor installing a side-tank plug inside an FJ"
                  caption="Put the stern side-tank plugs in."
                />
              </div>
            }
          >
            <ol start={3}>
              <li>
                If there is water in the boat, undo the drain plug and lift the boat at the shrouds
                until the transom is off the edge of the dock. Use a carpet at the edge of the dock
                to protect the boat&apos;s fiberglass.
              </li>
              <li>Once done draining, put the stern side-tank plugs in.</li>
            </ol>
          </GuideStep>

          <GuideStep
            number={3}
            title="Free the sail controls"
            compact
            media={
              <div className="fj-photo-grid fj-photo-grid--two">
                <Figure
                  file="page-02-01.webp"
                  alt="Knot at the mainsheet block being undone"
                  caption="Undo the knot in the mainsheet block, if there is one."
                />
                <Figure
                  file="page-02-03.webp"
                  alt="Sailor loosening the boom vang"
                  caption="Loosen the boomvang."
                />
              </div>
            }
          />

          <GuideStep
            number={4}
            title="Lower and secure the boom"
            media={
              <div className="fj-photo-grid fj-photo-grid--four">
                <Figure
                  file="page-03-01.webp"
                  alt="Boom resting above the cockpit of an FJ"
                  caption="A. Support the boom before loosening the halyard."
                />
                <Figure
                  file="page-03-02.webp"
                  alt="Sailor loosening a halyard at the mast"
                  caption="B. Loosen the halyard while the boom is held."
                />
                <Figure
                  file="page-03-03.webp"
                  alt="Sailor holding the two ends of the halyard together"
                  caption="C. Tie the halyard ends together."
                />
                <Figure
                  file="page-03-04.webp"
                  alt="Sailor carefully lowering the boom into the FJ"
                  caption="D. Lower the boom into the boat."
                />
              </div>
            }
          >
            <p>
              Ask your crew person to hold the boom while you loosen the halyard so the boom will
              not drop into the boat.
            </p>
            <p>
              Tie the halyard&apos;s ends together so that it does not get loose and sky at the top
              of the mast. The ring and a wet halyard together can be enough weight to pull the
              loose end up out of reach.
            </p>
            <p>Please lower the boom carefully into the boat.</p>
          </GuideStep>
        </GuideSection>

        <GuideSection id="jib" title="Jib sail">
          <GuideStep
            number={5}
            title="Attach the jib at the bow and halyard"
            media={
              <div className="fj-photo-grid fj-photo-grid--three">
                <Figure
                  file="page-04-03.webp"
                  alt="Attaching the jib tack with the retaining pin"
                  caption="A. Slide the retaining pin through the tack grommet."
                />
                <Figure
                  file="page-04-02.webp"
                  alt="Crew member pulling the forestay forward"
                  caption="B. Pull the forestay to create mast tension."
                />
                <Figure
                  file="page-04-01.webp"
                  alt="Jib halyard shackle connected to the head of the jib"
                  caption="C. Connect the jib halyard to the head."
                />
              </div>
            }
          >
            <ul>
              <li>
                Place the tack grommet at the bow and slide the retaining pin through it.
                <ul>
                  <li>The pin will feel loose until you raise the jib.</li>
                </ul>
              </li>
              <li>
                Connect the jib halyard shackle to the jib sail&apos;s head.
                <ul>
                  <li>Have your crew pull on the forestay to create tension on the mast.</li>
                  <li>
                    See the{' '}
                    <a href={riggingVideoUrl} target="_blank" rel="noreferrer">
                      rigging video
                    </a>{' '}
                    for more detail about mast tension.
                  </li>
                </ul>
              </li>
            </ul>
          </GuideStep>

          <GuideStep
            number={6}
            title="Tension and secure the jib halyard"
            media={
              <div className="fj-photo-grid fj-photo-grid--two">
                <Figure
                  file="page-04-05.webp"
                  alt="Tensioning the jib halyard beside the mast"
                  caption="D. Pull the halyard down to tension the jib luff."
                />
                <Figure
                  file="page-04-04.webp"
                  alt="Jib halyard threaded through the small block"
                  caption="E. Feed the halyard through the small block."
                />
              </div>
            }
          >
            <p>
              Feed the jib halyard through the block at the bottom of the mast. Pull on the halyard
              until the small block on the halyard is low enough to feed the halyard through. Use
              both blocks to get enough tension on the jib sail&apos;s luff.
            </p>
            <p>Secure the jib halyard to the cleat on the mast with a cleat knot.</p>
          </GuideStep>

          <GuideStep
            number={7}
            title="Check the tension and run the jib sheets"
            media={
              <div className="fj-photo-grid fj-photo-grid--two">
                <Figure
                  file="page-05-01.webp"
                  alt="Sailor testing the jib luff tension at the shroud"
                  caption="A. Pull on the shroud to check the luff tension."
                />
                <Figure
                  file="page-05-02.webp"
                  alt="Jib sheet passing through its block"
                  caption="B. Run each jib sheet through its block."
                />
              </div>
            }
          >
            <p>
              Test the luff tension by pulling on the shroud. It should be tight because the jib is
              now holding up the mast and the forestay is loose.
            </p>
            <p>Run the jib sheets through the blocks and tie a figure-eight knot at each end.</p>
          </GuideStep>
        </GuideSection>

        <GuideSection id="mainsail" title="Mainsail">
          <GuideStep
            number={8}
            title="Identify the sail corners and attach the foot"
            media={
              <div className="fj-photo-grid fj-photo-grid--two">
                <Figure
                  file="page-06-03.webp"
                  alt="Large grommet at the clew of the main sail"
                  caption="A. Identify the clew grommet."
                />
                <Figure
                  file="page-06-01.webp"
                  alt="Main-sail tack with Cunningham grommet above it"
                  caption="B. Identify the tack and Cunningham grommet."
                />
              </div>
            }
          >
            <p>
              Locate the tack and clew of the main sail and straighten the bolt rope along the foot
              of the sail.
            </p>
            <p>
              The tack grommet has the small grommet for the Cunningham above it. The clew has a
              large grommet.
            </p>
            <p>
              Starting at the mast, slide the rubber slug into the boom slot and pull it down to the
              stern end of the boom. You can optionally slide the entire bolt rope at the foot of
              the sail through the boom.
            </p>
            <aside className="fj-note">
              <strong>Note:</strong> In the picture below, the entire foot of the sail is threaded
              into the boom. It is actually recommended that you <strong>do not</strong> thread the
              foot into the boom, only the rubber slug. See the{' '}
              <a href={riggingVideoUrl} target="_blank" rel="noreferrer">
                rigging video for more in-depth detail
              </a>
              .
            </aside>
          </GuideStep>

          <GuideStep
            number={9}
            title="Secure the tack, clew, and outhaul"
            media={
              <div className="fj-photo-grid fj-photo-grid--four">
                <Figure
                  file="page-07-01.webp"
                  alt="Main sail being fed into the mast slot"
                  caption="A. Feed the tack end into the mast slot."
                />
                <Figure
                  file="page-07-03.webp"
                  alt="Outhaul passed through the main-sail clew"
                  caption="B. Pass the outhaul through the clew."
                />
                <Figure
                  file="page-07-02.webp"
                  alt="Outhaul aligned along the end of the boom"
                  caption="C. Align the outhaul in the boom block."
                />
                <Figure
                  file="page-07-04.webp"
                  alt="Outhaul secured in the jam cleat on the boom"
                  caption="D. Cleat the outhaul and tie a stopper knot."
                />
              </div>
            }
          >
            <p>
              Secure the tack end of the sail by sliding the rubber slug into the mast slot. Pass
              the outhaul through the clew grommet, then align it in the block on the boom.
            </p>
            <p>
              Run the outhaul up the boom to the jam cleat near the mast. Push the outhaul into the
              cleat and secure it with a figure-eight knot.
            </p>
          </GuideStep>

          <GuideStep
            number={10}
            title="Attach the main halyard"
            media={
              <div className="fj-photo-grid fj-photo-grid--four">
                <Figure
                  file="page-08-03.webp"
                  alt="Figure-eight knot being formed at the sail head"
                  caption="A. Pass the halyard through twice and form a figure-eight knot."
                />
                <Figure
                  file="page-08-01.webp"
                  alt="Main halyard passed through the sail head"
                  caption="B. Tighten the knot against the head plate."
                />
                <Figure
                  file="page-08-02.webp"
                  alt="Main halyard passed through the sail head a second time"
                  caption="C. Secure the halyard at the sail head."
                />
                <Figure
                  file="page-08-04.webp"
                  alt="Main sail raised a short distance up the mast"
                  caption="D. Raise the sail a few feet, then secure it."
                />
              </div>
            }
          >
            <p>
              Untie the main halyard from where you secured it and make sure the end running down
              the boom side of the mast is not twisted or fouled. Run about a foot of the halyard
              through the hole in the head of the sail, then run it through a second time. Secure
              the halyard with a figure-eight knot and pull it tight to the head plate.{' '}
              <strong>
                Make sure the tightened knot has a long enough tail that it will not come loose.
              </strong>
            </p>
            <p>Raise the sail only a few feet and secure the halyard.</p>
          </GuideStep>
        </GuideSection>

        <GuideSection id="launching" title="Launching the boat">
          <GuideStep
            number={11}
            title="Move the boat into the water"
            media={
              <div className="fj-photo-grid fj-photo-grid--four">
                <Figure
                  file="page-09-02.webp"
                  alt="Two sailors preparing to lift an FJ from its dock support"
                  caption="A. Lift near the shrouds at the boat's widest point."
                />
                <Figure
                  file="page-09-03.webp"
                  alt="Two sailors sliding the stern of an FJ into the water"
                  caption="B. Use the carpet to help the stern slide."
                />
                <Figure
                  file="page-09-01.webp"
                  alt="Sail bag secured under the wooden FJ support"
                  caption="C. Secure the sail bag under the support."
                />
                <Figure
                  file="page-09-04.webp"
                  alt="Sailor returning the carpet to the dock box"
                  caption="D. Return the carpet to the dock box."
                />
              </div>
            }
          >
            <ul>
              <li>
                Double-check that the centerboard line is secure in the jam cleat and take hold of
                the painter—the line attached to the bow.
              </li>
              <li>
                Position your hands near the shrouds so you lift the boat at the beam, its widest
                point.
              </li>
              <li>
                Use a carpet at the edge of the dock to protect the boat&apos;s fiberglass and make
                it easier to slide off.
              </li>
              <li>
                Tie the boat to the dock as soon as it is in the water and point the bow into the
                wind.
              </li>
            </ul>
            <p>
              Secure the sail bag under the FJ support so the wind does not blow it away and put the
              carpet back on the dock so it does not fall in the water.
            </p>
          </GuideStep>

          <GuideStep
            number={12}
            title="Lower the centerboard and board the boat"
            media={
              <div className="fj-photo-grid fj-photo-grid--four">
                <Figure
                  file="page-10-01.webp"
                  alt="Sailor lowering the FJ centerboard"
                  caption="A. Lower the centerboard."
                />
                <Figure
                  file="page-10-02.webp"
                  alt="Bungee looped over the centerboard horns"
                  caption="B. Loop the bungee over the horns."
                />
                <Figure
                  file="page-10-04.webp"
                  alt="Sailor stepping into the middle of an FJ"
                  caption="C. Step into the middle of the boat."
                />
                <Figure
                  file="page-10-03.webp"
                  alt="Crew member holding the shroud while the boat is boarded"
                  caption="D. Have the crew hold the shroud."
                />
              </div>
            }
          >
            <p>
              Lower the centerboard to stabilize the boat before you step into the boat. Loop the
              bungie over the horns on the board.
            </p>
            <p>
              Step into the middle of the boat when you get in. Make sure your crew is holding the
              shroud to keep the boat from tipping.
            </p>
          </GuideStep>

          <div className="fj-subsection-heading">
            <h3>Rudder &amp; tiller</h3>
          </div>

          <GuideStep
            number={13}
            title="Install the rudder and tiller"
            nested
            media={
              <div className="fj-photo-grid fj-photo-grid--four">
                <Figure
                  file="page-11-03.webp"
                  alt="Sailor lowering the rudder onto the FJ pintles"
                  caption="A. Lower the rudder onto the pintles."
                />
                <Figure
                  file="page-11-01.webp"
                  alt="Close view of the rudder retaining clip and gudgeon"
                  caption="B. Check that the retaining clip is in."
                />
                <Figure
                  file="page-11-02.webp"
                  alt="Tiller installed through the top of the rudder"
                  caption="C. Slide the tiller through the rudder."
                />
                <Figure
                  file="page-11-04.webp"
                  alt="Securing line tied to the cleat on the tiller"
                  caption="D. Tie the securing line to the tiller cleat."
                />
              </div>
            }
          >
            <p>
              Position the rudder over the pintles and lower it over them. Make sure the retaining
              clip is in so the bottom of the rudder does not hang up on it. When you take the
              rudder off, you may need to push this clip in so the rudder can come out.
            </p>
            <p>
              Slide the tiller through and make sure it sticks out some from the back of the rudder.
              Pull the securing line through the hole in the transom and tie it to the cleat on the
              tiller with a cleat knot.
            </p>
          </GuideStep>
        </GuideSection>

        <GuideSection id="raising-main" title="Raising the main">
          <GuideStep
            number={14}
            title="Raise and secure the main sail"
            media={
              <div className="fj-photo-grid fj-photo-grid--three fj-photo-grid--portrait">
                <Figure
                  file="page-12-02.webp"
                  alt="Sailor pulling the main halyard down at the mast"
                  caption="A. Pull the halyard until the ring is in reach."
                />
                <Figure
                  file="page-12-03.webp"
                  alt="Main halyard passed through the metal ring"
                  caption="B. Pass the halyard through the ring."
                />
                <Figure
                  file="page-12-01.webp"
                  alt="Main halyard tightened and secured beside the mast"
                  caption="C. Tighten and cleat the main halyard."
                />
              </div>
            }
          >
            <p>
              Loop the halyard over the cleat and pull it down until the ring is within reach. Pass
              the halyard through the ring when you can reach it as you pull the sail up. Tighten
              down and secure the main halyard with a cleat knot.
            </p>
          </GuideStep>

          <GuideStep
            number={15}
            title="Set the final sail controls"
            media={
              <div className="fj-photo-grid fj-photo-grid--four">
                <Figure
                  file="page-13-03.webp"
                  alt="Cunningham line passed through the grommet above the tack"
                  caption="A. Pass the Cunningham through the grommet."
                />
                <Figure
                  file="page-13-01.webp"
                  alt="Sailor tightening the Cunningham at the mast"
                  caption="B. Tighten it in the mast jam cleat."
                />
                <Figure
                  file="page-13-02.webp"
                  alt="Sailor tightening the outhaul"
                  caption="C. Adjust the outhaul."
                />
                <Figure
                  file="page-13-04.webp"
                  alt="Sailor tightening the boom vang"
                  caption="D. Adjust the boom vang."
                />
              </div>
            }
          >
            <p>
              Pass the Cunningham through the small grommet above the tack and tighten it down in
              the mast jam cleat.
            </p>
            <p>Tighten the outhaul and the boom vang more if necessary.</p>
          </GuideStep>

          <div className="fj-sendoff-card">
            <Figure
              file="page-14-01.webp"
              alt="Sailor wearing a PFD in a fully rigged FJ"
              className="fj-figure--hero"
            />
            <p className="fj-sendoff">Make sure you wear a PFD, and have a good sail.</p>
          </div>
        </GuideSection>

        <GuideSection id="putting-away" title="Putting the boat away">
          <GuideStep number={16} title="Secure the boat and lower the main" compact>
            <p>Make sure you have the boat turned into the wind and secured to the dock.</p>
            <Warning>
              Before doing anything else, lower the main sail and raise the centerboard.
            </Warning>
            <p>
              Undo the transom plug when you put the boat back on the dock support to let what is
              left drain out.
            </p>
          </GuideStep>

          <GuideStep
            number={17}
            title="Roll the sails"
            media={
              <div className="fj-photo-grid fj-photo-grid--two">
                <Figure
                  file="page-16-01.webp"
                  alt="Sailor starting to roll the jib"
                  caption="A. Roll the jib first."
                />
                <Figure
                  file="page-16-02.webp"
                  alt="Sailor rolling the main sail around the jib"
                  caption="B. Place the jib inside the main near the end."
                />
              </div>
            }
          >
            <p>
              When putting away the sails, it helps if you roll the jib first. When you are almost
              done rolling the main, you can place the jib inside it.
            </p>
          </GuideStep>

          <GuideStep
            number={18}
            title="Return the sail bag"
            compact
            media={
              <Figure
                file="page-17-01.webp"
                alt="Sailor returning an FJ sail bag to its labeled shelf in the sail locker"
                caption="Return the sail bag to the correct shelf."
                className="fj-figure--feature"
              />
            }
          >
            <p>Return the sail bag to the shelf in the sail locker.</p>
          </GuideStep>

          <p className="fj-thanks">Thank you for taking good care of the club&apos;s FJ.</p>
        </GuideSection>
      </div>
    </main>
  )
}
