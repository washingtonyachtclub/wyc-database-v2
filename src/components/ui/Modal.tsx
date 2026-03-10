import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = {
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ onClose, title, children }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
            type="button"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
