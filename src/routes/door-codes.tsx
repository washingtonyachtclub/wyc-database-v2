import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { DoorCodeCard } from '@/components/door-codes/DoorCodeCard'
import { EditDoorCodeModal } from '@/components/door-codes/EditDoorCodeModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import {
  getMyDoorCodesQueryOptions,
  useUpdateDoorCodeMutation,
} from '@/domains/door-codes/query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'

export const Route = createFileRoute('/door-codes')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/door-codes')
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(getMyDoorCodesQueryOptions()),
  component: DoorCodesPage,
})

type EditTarget = { index: number; name: string; currentCode: string }
type PendingEdit = EditTarget & { newCode: string }

function DoorCodesPage() {
  const { data } = useSuspenseQuery(getMyDoorCodesQueryOptions())
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null)

  const updateMutation = useUpdateDoorCodeMutation({
    onSuccess: () => setPendingEdit(null),
  })

  const anyUnlocked = data.entries.some((e) => e.unlocked)

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Door Codes</h2>

      <ErrorAlert error={updateMutation.error?.message} action="Updating door code" />

      {!anyUnlocked &&
        (data.membershipActive ? (
          <p className="mb-4 text-muted-foreground">
            You don&apos;t have any door codes yet. Get your ratings and they&apos;ll show up here.
          </p>
        ) : (
          <p className="mb-4 text-muted-foreground">
            <Link to="/renew-membership" className="underline hover:text-foreground">
              Renew membership
            </Link>{' '}
            to see door codes.
          </p>
        ))}

      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
        {data.entries.map((entry) => (
          <DoorCodeCard
            key={entry.slug}
            entry={entry}
            canEdit={data.canEdit}
            onEditClick={() => {
              if (!entry.unlocked) return
              setEditTarget({ index: entry.index, name: entry.name, currentCode: entry.code })
            }}
          />
        ))}
      </div>

      {editTarget && (
        <EditDoorCodeModal
          name={editTarget.name}
          currentCode={editTarget.currentCode}
          onClose={() => setEditTarget(null)}
          onSubmit={(code) => {
            setPendingEdit({ ...editTarget, newCode: code })
            setEditTarget(null)
          }}
        />
      )}

      <ConfirmDialog
        open={pendingEdit !== null}
        onClose={() => setPendingEdit(null)}
        onConfirm={() => {
          if (!pendingEdit) return
          updateMutation.mutate({
            data: { index: pendingEdit.index, code: pendingEdit.newCode },
          })
        }}
        title="ARE YOU SURE?"
        confirmLabel="Update code"
        confirmLabels={['I have verified this code at the door']}
        description={
          <>
            <p className="mb-2">
              Changing the <strong>{pendingEdit?.name}</strong> code from{' '}
              <strong className="font-mono">{pendingEdit?.currentCode}</strong> to{' '}
              <strong className="font-mono">{pendingEdit?.newCode}</strong>.
            </p>
            <p>
              Everyone who relies on this door will see the new code immediately. If it is wrong,
              they will be locked out until someone fixes it.
            </p>
          </>
        }
      />
    </div>
  )
}
