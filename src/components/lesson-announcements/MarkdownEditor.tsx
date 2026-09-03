import { Textarea } from '@/components/ui/textarea'
import type { MDXEditorMethods } from '@mdxeditor/editor'
import { ClientOnly } from '@tanstack/react-router'
import { forwardRef, lazy, Suspense } from 'react'

const MarkdownEditorClient = lazy(() => import('./MarkdownEditor.client'))

export const MarkdownEditor = forwardRef<
  MDXEditorMethods,
  { value: string; onChange: (value: string) => void }
>(({ value, onChange }, ref) => {
  const fallback = <Textarea className="min-h-56" value={value} disabled />

  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <MarkdownEditorClient ref={ref} value={value} onChange={onChange} />
      </Suspense>
    </ClientOnly>
  )
})

MarkdownEditor.displayName = 'MarkdownEditor'
