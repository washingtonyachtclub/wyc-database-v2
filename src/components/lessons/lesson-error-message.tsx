import { Link } from '@tanstack/react-router'

export function lessonErrorMessage(message: string | null | undefined) {
  const suffix = 'Quarters.'
  if (!message?.endsWith(' in ' + suffix)) return message
  return (
    <>
      {message.slice(0, -suffix.length)}
      <Link to="/quarters" target="_blank" rel="noopener" className="underline">
        Quarters
      </Link>
      .
    </>
  )
}
