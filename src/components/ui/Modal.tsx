import type { ComponentPropsWithoutRef } from 'react'
import type * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog'

type ModalProps = {
  onClose: () => void
  title: string
  children: React.ReactNode
  contentClassName?: string
  overlayClassName?: string
  onOpenAutoFocus?: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>['onOpenAutoFocus']
  onCloseAutoFocus?: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>['onCloseAutoFocus']
}

export function Modal({
  onClose,
  title,
  children,
  contentClassName,
  overlayClassName,
  onOpenAutoFocus,
  onCloseAutoFocus,
}: ModalProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className={cn('max-w-2xl', contentClassName)}
        overlayClassName={overlayClassName}
        onOpenAutoFocus={onOpenAutoFocus}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
