import { useState } from 'react'
import { Button } from './button'

export function CopyBox({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (label) {
    return (
      <div className="rounded-md border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy All'}
          </Button>
        </div>
        <pre className="text-sm whitespace-pre-wrap break-all">{text}</pre>
      </div>
    )
  }

  return (
    <div className="relative mt-2 rounded border bg-muted">
      <Button variant="outline" size="sm" onClick={handleCopy} className="absolute top-2 left-2">
        {copied ? 'Copied!' : 'Copy'}
      </Button>
      <pre className="whitespace-pre-wrap p-4 pl-20 text-sm">{text}</pre>
    </div>
  )
}
