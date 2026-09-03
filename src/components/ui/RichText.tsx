import { cn } from '@/lib/utils'
import { parseRichTextLink, RICH_TEXT_TOKEN } from '@/lib/rich-text'
import type { ReactNode } from 'react'

function renderToken(token: string, key: number): ReactNode {
  const link = parseRichTextLink(token)
  if (link) {
    return (
      <a
        key={key}
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline underline-offset-2"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {link.label}
      </a>
    )
  }
  if (token.startsWith('**')) return <strong key={key}>{token.slice(2, -2)}</strong>
  if (token.startsWith('~~')) return <s key={key}>{token.slice(2, -2)}</s>
  if (token.startsWith('*')) return <em key={key}>{token.slice(1, -1)}</em>
  return token
}

/**
 * Lesson descriptions are plain text where newlines matter and `**bold**`, `*italic*`,
 * `~~strikethrough~~`, and Markdown links are honoured.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(RICH_TEXT_TOKEN)
  return (
    <span className={cn('whitespace-pre-line', className)}>
      {parts.map((part, index) => (index % 2 === 1 ? renderToken(part, index) : part))}
    </span>
  )
}
