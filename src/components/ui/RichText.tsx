import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

// Spans newlines, because the warnings these mark up routinely wrap onto a second
// line. Non-greedy, so a stray marker pairs with the nearest one rather than swallowing
// the description, and an unpaired marker just renders as itself. `**` before `*` so bold
// wins over italic. No nesting.
export const RICH_TEXT_TOKEN = /(\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|~~[\s\S]+?~~)/

function renderToken(token: string, key: number): ReactNode {
  if (token.startsWith('**')) return <strong key={key}>{token.slice(2, -2)}</strong>
  if (token.startsWith('~~')) return <s key={key}>{token.slice(2, -2)}</s>
  if (token.startsWith('*')) return <em key={key}>{token.slice(1, -1)}</em>
  return token
}

/**
 * Lesson descriptions are plain text where newlines matter and `**bold**`, `*italic*`,
 * `~~strikethrough~~` are honoured.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  // split() on a capturing group puts the tokens at the odd indices.
  const parts = text.split(RICH_TEXT_TOKEN)
  return (
    <span className={cn('whitespace-pre-line', className)}>
      {parts.map((part, i) => (i % 2 === 1 ? renderToken(part, i) : part))}
    </span>
  )
}
