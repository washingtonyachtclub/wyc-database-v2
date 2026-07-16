import { cn } from '@/lib/utils'

// Spans newlines, because the warnings these mark up routinely wrap onto a second
// line. Non-greedy, so a stray '**' pairs with the nearest one rather than swallowing
// the description, and an unpaired '**' just renders as itself.
const BOLD = /\*\*([\s\S]+?)\*\*/

/**
 * Lesson descriptions are plain text where newlines matter and `**bold**` is honoured.
 * Always rendered as React nodes, never as HTML. Around 290 old descriptions still hold
 * raw <strong>/<p>/<a> markup from the legacy site, and interpreting it would turn a
 * free text field that instructors edit into an injection hole, so it stays as text.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  // split() on a capturing group puts the captures at the odd indices.
  const parts = text.split(BOLD)
  return (
    <span className={cn('whitespace-pre-line', className)}>
      {parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
    </span>
  )
}
