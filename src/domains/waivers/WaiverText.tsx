import { getWaiverTextSegments, type WaiverParagraph } from './waiver-content'

export function WaiverText({ paragraph }: { paragraph: WaiverParagraph }) {
  return getWaiverTextSegments(paragraph).map((segment, index) =>
    segment.bold ? (
      <strong key={index}>{segment.text}</strong>
    ) : (
      <span key={index}>{segment.text}</span>
    ),
  )
}
