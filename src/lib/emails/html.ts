export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function emailLink(url: string, label = url): string {
  try {
    if (!['https:', 'http:'].includes(new URL(url).protocol)) return escapeHtml(label)
  } catch {
    return escapeHtml(label)
  }
  return `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`
}

export function emailTextToHtml(text: string): string {
  const pattern =
    /https?:\/\/[^\s<>"']+|(?<![\w.@-])(?:discord\.)?washingtonyachtclub\.org(?:\/[^\s<>"']*)?/g
  let html = ''
  let offset = 0
  for (const match of text.matchAll(pattern)) {
    let url = match[0].replace(/[.,;:!?]+$/, '')
    while (url.endsWith(')') && url.split(')').length > url.split('(').length) {
      url = url.slice(0, -1)
    }
    html += escapeHtml(text.slice(offset, match.index))
    html += emailLink(/^https?:/i.test(url) ? url : `https://${url}`, url)
    offset = match.index + url.length
  }
  return (html + escapeHtml(text.slice(offset))).replaceAll('\n', '<br>')
}

export function plainTextEmailHtml(text: string): string {
  return `<div style="font-family:Arial,sans-serif;line-height:1.5">${emailTextToHtml(text)}</div>`
}
