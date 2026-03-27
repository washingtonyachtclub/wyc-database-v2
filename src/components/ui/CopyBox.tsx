import { useState } from 'react'
import { Button } from './button'

export function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative mt-2 rounded border bg-muted">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="absolute top-2 left-2"
      >
        {copied ? 'Copied!' : 'Copy'}
      </Button>
      <pre className="whitespace-pre-wrap p-4 pl-20 text-sm">{text}</pre>
    </div>
  )
}
