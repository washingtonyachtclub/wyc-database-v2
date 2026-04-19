import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { getMemberEmailsQueryOptions } from '@/domains/members/query-options'
import type { MemberFilters } from '@/domains/members/filter-types'

type Status = 'idle' | 'copying' | 'copied' | 'error'

export function CopyEmailsButton({
  filters,
  totalCount,
}: {
  filters?: MemberFilters
  totalCount: number
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [copiedCount, setCopiedCount] = useState(0)

  const handleOpen = () => {
    setStatus('idle')
    setCopiedCount(0)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleCopy = async () => {
    setStatus('copying')
    try {
      const emails = await queryClient.fetchQuery(getMemberEmailsQueryOptions(filters))
      await navigator.clipboard.writeText(emails.join('\n'))
      setCopiedCount(emails.length)
      setStatus('copied')
      setTimeout(() => setOpen(false), 1500)
    } catch (error) {
      console.error('Failed to copy emails:', error)
      setStatus('error')
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} disabled={totalCount === 0}>
        Copy Emails
      </Button>
      {open && (
        <Modal onClose={handleClose} title="Copy Emails">
          <div className="space-y-4">
            {status === 'copied' ? (
              <p className="text-sm">Copied {copiedCount} emails to clipboard.</p>
            ) : (
              <p className="text-sm">
                You are about to copy up to {totalCount} emails from the filtered results. Members
                without an email on file will be skipped.
              </p>
            )}
            {status === 'error' && (
              <p className="text-sm text-destructive">Failed to copy emails. Try again.</p>
            )}
            {status !== 'copied' && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={status === 'copying'}>
                  Cancel
                </Button>
                <Button onClick={handleCopy} disabled={status === 'copying'}>
                  {status === 'copying' ? 'Copying…' : 'Copy'}
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
