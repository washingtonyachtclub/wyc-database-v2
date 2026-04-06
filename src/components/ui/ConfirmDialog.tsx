import { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: React.ReactNode
  confirmLabel?: string
  confirmLabels?: string[]
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  confirmLabels,
}: ConfirmDialogProps) {
  const labels = confirmLabels ?? ['I understand']
  const [checked, setChecked] = useState<boolean[]>(() => labels.map(() => false))

  useEffect(() => {
    if (!open) setChecked(labels.map(() => false))
  }, [open])

  const allChecked = checked.every(Boolean)

  return (
    <AlertDialog open={open} onOpenChange={(open) => { if (!open) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 pt-2">
          {labels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox
                id={`confirm-checkbox-${i}`}
                checked={checked[i]}
                onCheckedChange={(val) =>
                  setChecked((prev) => prev.map((v, j) => (j === i ? val === true : v)))
                }
              />
              <Label htmlFor={`confirm-checkbox-${i}`} className="cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {allChecked && (
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
