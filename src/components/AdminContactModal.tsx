import { WEBMASTER_EMAIL } from 'src/db/constants'
import { CopyRow } from './ui/CopyRow'
import { Modal } from './ui/Modal'

type AdminContactModalProps = {
  onClose: () => void
  adminName: string
  adminEmail: string
}

export function AdminContactModal({ onClose, adminName, adminEmail }: AdminContactModalProps) {
  return (
    <Modal onClose={onClose} title="Contact Database Administrator">
      <div className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Send any questions, comments, or suggestions to {adminName}.
        </p>
        <CopyRow label="Club Email" text={WEBMASTER_EMAIL} />
        {adminEmail && <CopyRow label={`${adminName}'s Email`} text={adminEmail} />}
      </div>
    </Modal>
  )
}
