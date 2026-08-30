export type WaiverBoldText =
  | string
  | {
      text: string
      occurrences: readonly number[]
    }

export type WaiverParagraph = {
  text: string
  bold: readonly WaiverBoldText[]
}

export type WaiverTextSegment = {
  text: string
  bold: boolean
}

export function waiverParagraph(
  text: string,
  bold: readonly WaiverBoldText[] = [],
): WaiverParagraph {
  return { text, bold }
}

export function getWaiverTextSegments(paragraph: WaiverParagraph): WaiverTextSegment[] {
  const ranges = paragraph.bold
    .flatMap((boldText) => {
      const phrase = typeof boldText === 'string' ? boldText : boldText.text
      const matches: Array<{ start: number; end: number }> = []
      let start = paragraph.text.indexOf(phrase)
      let occurrence = 1

      while (start !== -1) {
        const end = start + phrase.length
        if (typeof boldText === 'string' || boldText.occurrences.includes(occurrence)) {
          matches.push({ start, end })
        }
        start = paragraph.text.indexOf(phrase, end)
        occurrence += 1
      }

      return matches
    })
    .sort((left, right) => left.start - right.start || right.end - left.end)

  const mergedRanges: Array<{ start: number; end: number }> = []
  for (const range of ranges) {
    const previous = mergedRanges.at(-1)
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end)
    } else {
      mergedRanges.push({ ...range })
    }
  }

  const segments: WaiverTextSegment[] = []
  let cursor = 0
  for (const range of mergedRanges) {
    if (range.start > cursor) {
      segments.push({ text: paragraph.text.slice(cursor, range.start), bold: false })
    }
    segments.push({ text: paragraph.text.slice(range.start, range.end), bold: true })
    cursor = range.end
  }

  if (cursor < paragraph.text.length) {
    segments.push({ text: paragraph.text.slice(cursor), bold: false })
  }

  return segments.length > 0 ? segments : [{ text: paragraph.text, bold: false }]
}
