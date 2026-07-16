import { Lock, Pencil } from 'lucide-react'
import type { DoorCodeEntry } from '@/domains/door-codes/schema'
import { Button } from '../ui/button'

type DoorCodeCardProps = {
  entry: DoorCodeEntry
  canEdit: boolean
  onEditClick: () => void
}

export function DoorCodeCard({ entry, canEdit, onEditClick }: DoorCodeCardProps) {
  if (!entry.unlocked) {
    return (
      <div className="rounded-lg border border-dashed p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" />
          <h3 className="font-semibold">{entry.name}</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{entry.requirement}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{entry.name}</h3>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={onEditClick} aria-label={`Edit ${entry.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="mt-2 font-mono text-3xl tracking-widest">{entry.code}</p>

      {canEdit && entry.updatedAt && (
        <p className="mt-2 text-xs text-muted-foreground">
          Updated {entry.updatedByName && `by ${entry.updatedByName} `}on {entry.updatedAt}
        </p>
      )}
    </div>
  )
}
