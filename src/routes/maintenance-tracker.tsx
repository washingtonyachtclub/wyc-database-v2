import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/maintenance-tracker')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/maintenance-tracker')
  },
  head: () => ({
    meta: [
      { title: 'Maintenance Tracker | Washington Yacht Club' },
      {
        name: 'description',
        content: 'A quick guide to tracking Washington Yacht Club maintenance work in Linear.',
      },
    ],
  }),
  component: MaintenanceTrackerPage,
})

const linearInviteUrl =
  'https://linear.app/washington-yacht-club/join/b3cbcd7719964a225844c9e4ee77c405?s=5'

const appStoreUrl = 'https://apps.apple.com/app/linear-mobile/id1645587184'
const playStoreUrl = 'https://play.google.com/store/apps/details?id=app.linear'

function MaintenanceTrackerPage() {
  return (
    <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-10">
        <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">Maintenance Tracker</h1>
        <p className="text-lg text-muted-foreground">
          Linear is our shared hub for tracking club maintenance work.
        </p>
        <p className="mt-4">
          <a
            href={linearInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline underline-offset-4 hover:no-underline"
          >
            Join the WYC Linear workspace
          </a>{' '}
          to create an account and automatically join the team.
        </p>
      </header>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Quick Guide</h2>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold">Issues</h3>
          <p>
            Each maintenance task is tracked as an issue. Each issue keeps its status, priority,
            assignee, boat/fleet label, and discussion together.
          </p>
          <img
            src="/maintenance-tracker/issue-anatomy.png"
            alt="Annotated Linear issue showing its status, priority, assignee, boat or fleet label, and discussion"
            className="w-full rounded-lg border shadow-sm"
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold">Board View</h3>
          <p>
            To see the board, navigate to <strong>Your Teams → Maintenance → Issues</strong>.
          </p>
          <img
            src="/maintenance-tracker/board.png"
            alt="Linear maintenance board with the Issues tab and create button highlighted"
            loading="lazy"
            className="w-full rounded-lg border shadow-sm"
          />

          <ul className="list-disc space-y-2 pl-6">
            <li>
              Anyone can create an issue! Discuss in Discord or with a fleet captain first if you’re
              unsure.
            </li>
            <li>
              Look for issues you want to pick up. Comment in the thread, reach out to the reporter,
              or assign yourself if you’re confident you can do it.
            </li>
            <li>
              Even if you’re the only person working on something, it’s still helpful to create an
              issue and document it:
              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>
                  Future maintainers can use your resources and learnings for similar repairs.
                </li>
                <li>Collaboration is easy if it becomes needed.</li>
                <li>Other people see the awesome work you’re doing!</li>
              </ul>
            </li>
          </ul>

          <p>You can filter the board and change its view from the top right.</p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold">Setup</h3>
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 font-semibold">
            All members automatically have administrator-level permissions in Linear. Please be
            careful not to edit global settings.
          </p>
          <p>
            By default, you will get an email every time someone joins the team. Go to{' '}
            <strong>Settings → Notifications</strong> and turn off <strong>Invite accepted</strong>{' '}
            and any other notifications you do not want.
          </p>
          <img
            src="/maintenance-tracker/notifications.png"
            alt="Linear notification settings with Notifications and Invite accepted highlighted"
            loading="lazy"
            className="w-full rounded-lg border shadow-sm"
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold">Install the app</h3>
          <p>
            Install the Linear app for easy image uploading from your phone and issue updates while
            at the docks.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-2">
            <a
              href={appStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline underline-offset-4 hover:no-underline"
            >
              iPhone
            </a>
            <a
              href={playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline underline-offset-4 hover:no-underline"
            >
              Android
            </a>
          </p>
        </section>
      </section>

      <p className="mt-10 rounded-lg bg-muted p-5 text-lg font-medium">
        You don’t need to be an expert! It is everyone’s responsibility to report issues, pick up
        tasks they can do, and make the club better :)
      </p>
    </article>
  )
}
