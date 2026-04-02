import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { getDatabaseAdmin } from '@/domains/officers/server-fns'
import { AdminContactModal } from '../AdminContactModal'
import { CopyRow } from './CopyRow'

type ErrorAlertProps = {
  error: string | null | undefined
  action?: string
}

export function ErrorAlert({ error, action }: ErrorAlertProps) {
  const location = useLocation()
  const [showAdminModal, setShowAdminModal] = useState(false)
  const { data: adminData } = useQuery({
    queryKey: ['databaseAdmin'],
    queryFn: () => getDatabaseAdmin(),
    staleTime: Infinity,
    enabled: !!error,
  })

  if (!error) return null

  const timestamp = new Date().toLocaleString()
  const report = [
    `Time: ${timestamp}`,
    `Page: ${location.pathname}`,
    action && `Action: ${action}`,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="rounded-md bg-destructive/10 p-4 border border-destructive space-y-3">
      <div className="text-sm text-destructive">{error}</div>
      <CopyRow label="Error details" text={report} />
      <p className="text-xs text-muted-foreground">
        If this problem persists, send the above details to the{' '}
        <button
          type="button"
          className="underline hover:text-foreground"
          onClick={() => setShowAdminModal(true)}
        >
          database administrator
        </button>
        .
      </p>
      {showAdminModal && adminData && (
        <AdminContactModal
          onClose={() => setShowAdminModal(false)}
          adminName={adminData.name}
          adminEmail={adminData.email}
        />
      )}
    </div>
  )
}
