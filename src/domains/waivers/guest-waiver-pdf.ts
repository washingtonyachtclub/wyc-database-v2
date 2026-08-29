import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import {
  finalGuestWaiverAcknowledgement,
  getGuestWaiverTextSegments,
  guestWaiverSections,
  sectionAcknowledgement,
  type GuestWaiverParagraph,
} from './guest-waiver-content'

export type GuestWaiverPdfInput = {
  acceptanceId: string
  acknowledgements: Record<(typeof guestWaiverSections)[number]['id'], boolean>
  dateOfBirth: string
  email: string
  firstName: string
  lastName: string
  isMock: boolean
  signatureDataUrl: string
  signedAt: string
}

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const BOTTOM_MARGIN = 58

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate
    } else {
      if (line) lines.push(line)
      line = word
    }
  }

  if (line) lines.push(line)
  return lines
}

export async function createGuestWaiverPdf(input: GuestWaiverPdfInput) {
  const document = await PDFDocument.create()
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const signatureImage = await document.embedPng(input.signatureDataUrl)
  let page!: PDFPage
  let y = 0

  document.setTitle(
    input.isMock
      ? 'Mock WYC Guest Participant Agreement'
      : 'Washington Yacht Club Participant Agreement',
  )
  document.setAuthor('Washington Yacht Club')
  document.setSubject(
    input.isMock ? 'Testing-only guest participant agreement' : 'Executed participant agreement',
  )
  document.setCreationDate(new Date(input.signedAt))

  function wrapWaiverText(paragraph: GuestWaiverParagraph, size: number, maxWidth: number) {
    const words = getGuestWaiverTextSegments(paragraph).flatMap((segment) =>
      segment.text
        .split(/\s+/)
        .filter(Boolean)
        .map((text) => ({ text, bold: segment.bold })),
    )
    const lines: Array<typeof words> = []
    const spaceWidth = regular.widthOfTextAtSize(' ', size)
    let line: typeof words = []
    let lineWidth = 0

    for (const word of words) {
      const font = word.bold ? bold : regular
      const wordWidth = font.widthOfTextAtSize(word.text, size)
      const candidateWidth = lineWidth + (line.length > 0 ? spaceWidth : 0) + wordWidth

      if (line.length > 0 && candidateWidth > maxWidth) {
        lines.push(line)
        line = []
        lineWidth = 0
      }

      lineWidth += (line.length > 0 ? spaceWidth : 0) + wordWidth
      line.push(word)
    }

    if (line.length > 0) lines.push(line)
    return lines
  }

  function addPage() {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 52,
      width: PAGE_WIDTH,
      height: 52,
      color: input.isMock ? rgb(0.72, 0.08, 0.1) : rgb(0.08, 0.22, 0.38),
    })
    page.drawText(input.isMock ? 'MOCK WAIVER - TESTING PURPOSES ONLY' : 'WASHINGTON YACHT CLUB', {
      x: MARGIN,
      y: PAGE_HEIGHT - 33,
      size: 15,
      font: bold,
      color: rgb(1, 1, 1),
    })
    page.drawText('Washington Yacht Club Participant Agreement', {
      x: MARGIN,
      y: PAGE_HEIGHT - 76,
      size: 11,
      font: bold,
      color: rgb(0.08, 0.22, 0.38),
    })
    y = PAGE_HEIGHT - 98
  }

  function ensureSpace(height: number) {
    if (y - height < BOTTOM_MARGIN) addPage()
  }

  function drawWaiverText(
    paragraph: GuestWaiverParagraph,
    options: { size?: number; lineHeight?: number; indent?: number } = {},
  ) {
    const size = options.size ?? 9.2
    const lineHeight = options.lineHeight ?? 12.5
    const indent = options.indent ?? 0
    const lines = wrapWaiverText(paragraph, size, CONTENT_WIDTH - indent)
    const spaceWidth = regular.widthOfTextAtSize(' ', size)
    ensureSpace(lines.length * lineHeight)
    for (const line of lines) {
      let x = MARGIN + indent
      for (const [index, word] of line.entries()) {
        const font = word.bold ? bold : regular
        if (index > 0) x += spaceWidth
        page.drawText(word.text, {
          x,
          y,
          size,
          font,
          color: rgb(0.12, 0.15, 0.19),
        })
        x += font.widthOfTextAtSize(word.text, size)
      }
      y -= lineHeight
    }
  }

  function drawSectionHeading(title: string) {
    ensureSpace(38)
    y -= 7
    page.drawText(title, {
      x: MARGIN,
      y,
      size: 12,
      font: bold,
      color: rgb(0.08, 0.22, 0.38),
    })
    y -= 19
  }

  function drawAcknowledgement(checked: boolean) {
    const lines = wrapText(sectionAcknowledgement, regular, 8.7, CONTENT_WIDTH - 24)
    ensureSpace(lines.length * 12 + 20)
    y -= 3
    page.drawRectangle({
      x: MARGIN,
      y: y - 9,
      width: 11,
      height: 11,
      borderWidth: 0.8,
      borderColor: rgb(0.12, 0.15, 0.19),
    })
    if (checked) page.drawText('X', { x: MARGIN + 2, y: y - 7, size: 9, font: bold })
    for (const line of lines) {
      page.drawText(line, {
        x: MARGIN + 22,
        y,
        size: 8.7,
        font: regular,
        color: rgb(0.12, 0.15, 0.19),
      })
      y -= 12
    }
    y -= 8
  }

  addPage()
  if (input.isMock) {
    page.drawRectangle({
      x: MARGIN,
      y: y - 45,
      width: CONTENT_WIDTH,
      height: 45,
      color: rgb(1, 0.94, 0.94),
      borderColor: rgb(0.72, 0.08, 0.1),
      borderWidth: 1,
    })
    page.drawText('THIS IS A STORAGE AND SIGNING TEST. IT IS NOT A VALID WAIVER.', {
      x: MARGIN + 12,
      y: y - 20,
      size: 10,
      font: bold,
      color: rgb(0.62, 0.04, 0.06),
    })
    page.drawText('Use fake information. A development record and test PDF are created.', {
      x: MARGIN + 12,
      y: y - 35,
      size: 8.8,
      font: regular,
      color: rgb(0.62, 0.04, 0.06),
    })
    y -= 64
  }

  for (const section of guestWaiverSections) {
    const firstParagraphLines = wrapWaiverText(section.paragraphs[0], 9.2, CONTENT_WIDTH)
    ensureSpace(34 + firstParagraphLines.length * 12.5)
    drawSectionHeading(section.title)
    for (const [index, paragraph] of section.paragraphs.entries()) {
      if (index === section.paragraphs.length - 1) {
        const paragraphLines = wrapWaiverText(paragraph, 9.2, CONTENT_WIDTH)
        const acknowledgementLines = wrapText(
          sectionAcknowledgement,
          regular,
          8.7,
          CONTENT_WIDTH - 24,
        )
        ensureSpace(paragraphLines.length * 12.5 + acknowledgementLines.length * 12 + 31)
      }
      drawWaiverText(paragraph)
      y -= 8
    }
    drawAcknowledgement(input.acknowledgements[section.id])
  }

  drawSectionHeading('FINAL ACKNOWLEDGEMENT')
  for (const paragraph of finalGuestWaiverAcknowledgement) {
    drawWaiverText(paragraph, { size: 9.2, lineHeight: 12.5 })
    y -= 8
  }

  ensureSpace(input.isMock ? 230 : 210)
  y -= 4
  const signerRows = [
    ['Full legal name', `${input.firstName} ${input.lastName}`],
    ['Email', input.email],
    ['Date of birth', input.dateOfBirth],
    ['Signed at', input.signedAt],
    ['Acceptance ID', input.acceptanceId],
  ]
  for (const [label, value] of signerRows) {
    page.drawText(`${label}:`, { x: MARGIN, y, size: 9, font: bold })
    page.drawText(value, { x: MARGIN + 92, y, size: 9, font: regular })
    y -= 17
  }

  y -= 3
  page.drawText('Drawn signature', { x: MARGIN, y, size: 9, font: bold })
  y -= 106
  page.drawRectangle({
    x: MARGIN,
    y,
    width: 360,
    height: 96,
    borderWidth: 0.8,
    borderColor: rgb(0.55, 0.58, 0.62),
  })
  page.drawImage(signatureImage, { x: MARGIN, y, width: 360, height: 96 })
  if (input.isMock) {
    y -= 18
    page.drawText('X  Signer acknowledged this was a mock test.', {
      x: MARGIN,
      y,
      size: 8.7,
      font: regular,
      color: rgb(0.62, 0.04, 0.06),
    })
  }

  const pages = document.getPages()
  pages.forEach((pdfPage, index) => {
    pdfPage.drawLine({
      start: { x: MARGIN, y: 42 },
      end: { x: PAGE_WIDTH - MARGIN, y: 42 },
      thickness: 0.5,
      color: rgb(0.72, 0.74, 0.77),
    })
    pdfPage.drawText(
      `${input.isMock ? 'MOCK - NOT A VALID WAIVER  |  ' : ''}Page ${index + 1} of ${pages.length}`,
      {
        x: MARGIN,
        y: 27,
        size: 7.8,
        font: regular,
        color: rgb(0.46, 0.49, 0.53),
      },
    )
  })

  return document.save()
}
