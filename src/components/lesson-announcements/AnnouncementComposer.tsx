import { EmailSimulatedNotice } from '@/components/ui/EmailSimulatedNotice'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePostLessonAnnouncementMutation } from '@/domains/lesson-announcements/query-options'
import {
  DEFAULT_LESSON_ANNOUNCEMENT_SUBJECT,
  LESSON_ANNOUNCEMENT_BODY_LIMIT,
} from '@/domains/lesson-announcements/schema'
import type { MDXEditorMethods } from '@mdxeditor/editor'
import { useRef, useState } from 'react'
import { MarkdownContent } from './MarkdownContent'
import { MarkdownEditor } from './MarkdownEditor'

type PostResult = NonNullable<ReturnType<typeof usePostLessonAnnouncementMutation>['data']>

export function AnnouncementComposer({
  lessonId,
  enrolledCount,
  waitlistedCount,
}: {
  lessonId: number
  enrolledCount: number
  waitlistedCount: number
}) {
  const [subject, setSubject] = useState(DEFAULT_LESSON_ANNOUNCEMENT_SUBJECT)
  const [bodyMarkdown, setBodyMarkdown] = useState('')
  const [emailEnrolled, setEmailEnrolled] = useState(true)
  const [emailWaitlisted, setEmailWaitlisted] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [result, setResult] = useState<PostResult | null>(null)
  const editorRef = useRef<MDXEditorMethods>(null)
  const mutation = usePostLessonAnnouncementMutation(lessonId)
  const bodyLength = bodyMarkdown.length
  const bodyIsValid = bodyMarkdown.trim().length > 0 && bodyLength <= LESSON_ANNOUNCEMENT_BODY_LIMIT
  const willEmailEnrolled = emailEnrolled && enrolledCount > 0
  const willEmailWaitlisted = emailWaitlisted && waitlistedCount > 0

  const reset = () => {
    setSubject(DEFAULT_LESSON_ANNOUNCEMENT_SUBJECT)
    setBodyMarkdown('')
    editorRef.current?.setMarkdown('')
    setEmailEnrolled(true)
    setEmailWaitlisted(false)
  }

  const post = async () => {
    const response = await mutation.mutateAsync({
      data: {
        lessonId,
        subject,
        bodyMarkdown,
        emailEnrolled: willEmailEnrolled,
        emailWaitlisted: willEmailWaitlisted,
      },
    })
    setResult(response)
    setShowPreview(false)
    reset()
  }

  return (
    <section className="rounded-lg border border-border p-4 space-y-4">
      <h2 className="text-lg font-semibold">Post announcement</h2>

      <ErrorAlert error={mutation.error?.message} action="Posting lesson announcement" />
      {result && <PostResultNotice result={result} />}

      <div className="space-y-2">
        <Label htmlFor="announcement-subject">Subject</Label>
        <Input
          id="announcement-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={DEFAULT_LESSON_ANNOUNCEMENT_SUBJECT}
        />
      </div>

      <div className="space-y-2">
        <Label>Announcement</Label>
        <MarkdownEditor ref={editorRef} value={bodyMarkdown} onChange={setBodyMarkdown} />
        <p className="text-xs text-muted-foreground text-right">
          {bodyLength.toLocaleString()} / {LESSON_ANNOUNCEMENT_BODY_LIMIT.toLocaleString()}
        </p>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="email-enrolled"
            checked={emailEnrolled}
            disabled={enrolledCount === 0}
            onCheckedChange={(checked) => setEmailEnrolled(checked === true)}
          />
          <Label htmlFor="email-enrolled">Email enrolled members ({enrolledCount})</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="email-waitlisted"
            checked={emailWaitlisted}
            disabled={waitlistedCount === 0}
            onCheckedChange={(checked) => setEmailWaitlisted(checked === true)}
          />
          <Label htmlFor="email-waitlisted">Email waitlisted members ({waitlistedCount})</Label>
        </div>
      </div>

      <Button type="button" disabled={!bodyIsValid} onClick={() => setShowPreview(true)}>
        Preview announcement
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post announcement?</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="font-semibold">
              {subject.trim() || DEFAULT_LESSON_ANNOUNCEMENT_SUBJECT}
            </h3>
            <MarkdownContent markdown={bodyMarkdown} />
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            {willEmailEnrolled && <p>Email {enrolledCount} enrolled members</p>}
            {willEmailWaitlisted && <p>Email {waitlistedCount} waitlisted members</p>}
            {!willEmailEnrolled && !willEmailWaitlisted && <p>Do not send email</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowPreview(false)}>
              Back
            </Button>
            <Button type="button" disabled={mutation.isPending} onClick={post}>
              {mutation.isPending ? 'Posting...' : 'Post announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function PostResultNotice({ result }: { result: PostResult }) {
  if (result.emailFailed) {
    return (
      <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
        Announcement posted, but some or all email copies failed to send.
      </div>
    )
  }

  if (result.emailRequested && !result.emailSent) {
    return (
      <div className="rounded-md border border-border bg-muted p-3 text-sm">
        Announcement posted. No selected members had an email address, so no email was sent.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border bg-muted p-3 text-sm">
        {result.emailSent
          ? `Announcement posted and emailed to ${result.memberRecipientCount} member${result.memberRecipientCount === 1 ? '' : 's'}.`
          : 'Announcement posted without email.'}
        {result.missingMemberEmailCount > 0 && (
          <span>
            {' '}
            {result.missingMemberEmailCount} selected member
            {result.missingMemberEmailCount === 1 ? ' has' : 's have'} no email address.
          </span>
        )}
      </div>
      {result.emailSimulated && <EmailSimulatedNotice />}
    </div>
  )
}
