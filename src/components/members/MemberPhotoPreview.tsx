import { useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/Modal'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { photoUrl } from '@/domains/member-photos/photo'
import { cn } from '@/lib/utils'

export function MemberPhotoPreview({
  id,
  name,
  version,
  children,
  className,
  nameTrigger = false,
}: {
  id: number
  name: string
  version: string
  children: ReactNode
  className?: string
  nameTrigger?: boolean
}) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  if (!version) return children
  const button = (
    <Button
      ref={trigger}
      type="button"
      variant="ghost"
      aria-label={`View photo of ${name}`}
      aria-haspopup="dialog"
      className={cn(
        'h-auto justify-start whitespace-normal p-0 text-left text-inherit hover:bg-transparent hover:text-inherit',
        nameTrigger ? 'cursor-pointer' : 'cursor-zoom-in',
        className,
      )}
      onClick={() => setOpen(true)}
    >
      {children}
    </Button>
  )
  return (
    <>
      {nameTrigger ? (
        button
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>View photo</TooltipContent>
        </Tooltip>
      )}
      {open && (
        <Modal
          title={name}
          contentClassName="w-[calc(100%-2rem)] max-w-[416px] p-4"
          onClose={() => setOpen(false)}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            trigger.current?.focus()
          }}
        >
          <img alt={name} src={photoUrl(id, version)} className="aspect-square w-full rounded-md" />
        </Modal>
      )}
    </>
  )
}
