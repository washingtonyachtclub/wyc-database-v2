const MARKDOWN_LINK = String.raw`\[[^\]\n]+\]\((?:[^()\s]|\([^()\s]*\))+\)`

export const RICH_TEXT_TOKEN = new RegExp(
  `(${MARKDOWN_LINK}|\\*\\*[\\s\\S]+?\\*\\*|\\*[\\s\\S]+?\\*|~~[\\s\\S]+?~~)`,
)

export function parseRichTextLink(token: string): { label: string; href: string } | null {
  const match = /^\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)$/.exec(token)
  if (!match) return null

  const [, label, href] = match
  const protocol = /^([a-z][a-z\d+.-]*):/i.exec(href)?.[1].toLowerCase()
  if (protocol && !['http', 'https', 'mailto'].includes(protocol)) return null

  return { label, href }
}
