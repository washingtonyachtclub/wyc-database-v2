import { readFile, writeFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'

const [inputPath, outputPath] = process.argv.slice(2)

if (!inputPath || !outputPath) {
  throw new Error(
    'Usage: node scripts/generate-dinghy-answer-key.mjs <export.json> <answer-key.md>',
  )
}

const activeQuestionIds = [
  154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172,
  173, 174, 175, 176, 177, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
  27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51,
  50, 52, 53, 54, 55, 56, 57, 58, 59, 60,
]

function htmlToText(value = '') {
  const document = new JSDOM(`<body>${value}</body>`).window.document
  document.querySelectorAll('img').forEach((image) => image.remove())
  return document.body.textContent.replace(/\\'/g, "'").replace(/\s+/g, ' ').trim()
}

const rows = JSON.parse(await readFile(inputPath, 'utf8'))
const rowsById = new Map(rows.map((row) => [String(row.id), row]))
const answerLines = activeQuestionIds.map((sourceId, index) => {
  const row = rowsById.get(String(sourceId))
  if (!row) throw new Error(`Question ${sourceId} is missing from the export`)
  const answers = (Array.isArray(row.answers) ? row.answers : [row.answers])
    .filter((answer) => answer.correct === '1')
    .flatMap((answer) => htmlToText(answer.answer).split('%%%'))
    .join(' / ')

  return `${index + 1}. ${htmlToText(row.question)}\n   - **Answer:** ${answers}`
})

await writeFile(
  outputPath,
  `# Dinghy Novice Test Answer Key\n\n${answerLines.join('\n\n')}\n`,
  'utf8',
)
