import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDeleteLessonAnnouncementMutation } from '@/domains/lesson-announcements/query-options'
import type { LessonAnnouncement } from '@/domains/lesson-announcements/schema'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
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
import { MarkdownContent } from './MarkdownContent'

function formatCreatedAt(value: string): string {
  const [date, time = ''] = value.split(' ')
  return `${date} ${time.slice(0, 5)}`.trim()
}

export function AnnouncementFeed({
  lessonId,
  announcements,
  canDelete = false,
}: {
  lessonId: number
  announcements: LessonAnnouncement[]
  canDelete?: boolean
}) {
  const [selected, setSelected] = useState<LessonAnnouncement | null>(null)
  const deleteMutation = useDeleteLessonAnnouncementMutation(lessonId)

  if (announcements.length === 0) {
    return <p className="text-sm text-muted-foreground">No announcements yet.</p>
  }

  return (
    <>
      <ErrorAlert error={deleteMutation.error?.message} action="Deleting lesson announcement" />
      <div className="space-y-4">
        {[...announcements].reverse().map((announcement) => (
          <article key={announcement.id} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{announcement.subject}</h3>
                <p className="text-xs text-muted-foreground">
                  {announcement.authorName} · {formatCreatedAt(announcement.createdAt)}
                </p>
              </div>
              {canDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Delete announcement"
                      onClick={() => setSelected(announcement)}
                    >
                      <Trash2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete announcement</TooltipContent>
                </Tooltip>
              )}
            </div>
            <MarkdownContent markdown={announcement.bodyMarkdown} />
          </article>
        ))}
      </div>

      <AlertDialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the announcement from the lesson page. Emailed copies cannot be recalled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!selected) return
                deleteMutation.mutate({ data: { announcementId: selected.id } })
                setSelected(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
