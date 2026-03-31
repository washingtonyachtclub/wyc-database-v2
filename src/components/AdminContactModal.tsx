import { useState } from 'react'
import { WEBMASTER_EMAIL } from 'src/db/constants'
import { Button } from './ui/button'
import { Modal } from './ui/Modal'

type AdminContactModalProps = {
  onClose: () => void
  adminName: string
  adminEmail: string
}

function CopyRow({ label, email }: { label: string; email: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-sm text-muted-foreground">{email}</div>
      </div>
      <Button variant="outline" size="sm" onClick={handleCopy}>
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </div>
  )
}

export function AdminContactModal({ onClose, adminName, adminEmail }: AdminContactModalProps) {
  return (
    <Modal onClose={onClose} title="Contact Database Administrator">
      <div className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Send any questions, comments, or suggestions to {adminName}.
        </p>
        <CopyRow label="Club Email" email={WEBMASTER_EMAIL} />
        {adminEmail && <CopyRow label={`${adminName}'s Email`} email={adminEmail} />}
      </div>
    </Modal>
  )
}
