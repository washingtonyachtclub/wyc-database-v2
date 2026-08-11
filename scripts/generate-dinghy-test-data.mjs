import { readFile, writeFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'

const [inputPath, outputPath] = process.argv.slice(2)

if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/generate-dinghy-test-data.mjs <export.json> <output.ts>')
}

const activeQuestionIds = [
  154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172,
  173, 174, 175, 176, 177, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
  27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51,
  50, 52, 53, 54, 55, 56, 57, 58, 59, 60,
]

const imageByQuestionId = {
  ...Object.fromEntries(
    Array.from({ length: 24 }, (_, index) => [
      String(154 + index),
      {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
    ]),
  ),
  ...Object.fromEntries(
    Array.from({ length: 6 }, (_, index) => [
      String(8 + index),
      {
        src: '/test-images/sailboat-positions.png',
        alt: 'Diagram of three sailboats labeled A, B, and C relative to the wind',
      },
    ]),
  ),
  33: {
    src: '/test-images/sailing-maneuver-1.png',
    alt: 'Sailing maneuver diagram 1',
  },
  34: {
    src: '/test-images/sailing-maneuver-2.png',
    alt: 'Sailing maneuver diagram 2',
  },
  35: {
    src: '/test-images/sailing-maneuver-3.png',
    alt: 'Sailing maneuver diagram 3',
  },
  36: {
    src: '/test-images/sailing-maneuver-4.png',
    alt: 'Sailing maneuver diagram 4',
  },
}

function htmlToText(value = '') {
  const document = new JSDOM(`<body>${value}</body>`).window.document
  document.querySelectorAll('img').forEach((image) => image.remove())
  return document.body.textContent.replace(/\\'/g, "'").replace(/\s+/g, ' ').trim()
}

function textAliases(value) {
  return [
    ...new Set(
      value.split('%%%').flatMap((answer) => {
        const cleaned = htmlToText(answer)
        const withoutParenthetical = cleaned
          .replace(/\s*\([^)]*\)\s*/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        return withoutParenthetical && withoutParenthetical !== cleaned
          ? [cleaned, withoutParenthetical]
          : [cleaned]
      }),
    ),
  ]
}

const rows = JSON.parse(await readFile(inputPath, 'utf8'))
const rowsById = new Map(rows.map((row) => [String(row.id), row]))

const questions = activeQuestionIds.map((sourceId, index) => {
  const row = rowsById.get(String(sourceId))
  if (!row) throw new Error(`Question ${sourceId} is missing from the export`)

  const base = {
    id: `dinghy-${sourceId}`,
    sourceId: String(sourceId),
    number: index + 1,
    title: htmlToText(row.question_title),
    category: htmlToText(row.category) || 'Dinghy Novice',
    prompt: htmlToText(row.question),
    ...(imageByQuestionId[sourceId] ? { image: imageByQuestionId[sourceId] } : {}),
  }

  if (row.type === 'short_text') {
    const answer = Array.isArray(row.answers) ? row.answers[0] : row.answers
    return {
      ...base,
      type: 'text',
      acceptedAnswers: textAliases(answer.answer),
      placeholder: htmlToText(answer.placeholder) || 'Type your answer',
    }
  }

  if (row.type === 'radio' || row.type === 'true_or_false' || row.type === 'checkbox') {
    return {
      ...base,
      type: row.type === 'checkbox' ? 'multiple' : 'single',
      options: row.answers
        .toSorted((a, b) => Number(a.ordering) - Number(b.ordering))
        .map((answer) => ({
          id: String(answer.id),
          label: htmlToText(answer.answer),
          correct: answer.correct === '1',
        })),
    }
  }

  throw new Error(`Unsupported question type ${row.type} for question ${sourceId}`)
})

const output = `export type TestImage = {\n  src: string\n  alt: string\n}\n\nexport type TestQuestionOption = {\n  id: string\n  label: string\n  correct: boolean\n}\n\ntype TestQuestionBase = {\n  id: string\n  sourceId: string\n  number: number\n  title: string\n  category: string\n  prompt: string\n  image?: TestImage\n}\n\nexport type TextTestQuestion = TestQuestionBase & {\n  type: 'text'\n  acceptedAnswers: string[]\n  placeholder: string\n}\n\nexport type ChoiceTestQuestion = TestQuestionBase & {\n  type: 'single' | 'multiple'\n  options: TestQuestionOption[]\n}\n\nexport type TestQuestion = TextTestQuestion | ChoiceTestQuestion\n\nexport const dinghyNoviceTest = {\n  id: 'dinghy-novice',\n  title: 'Dinghy Novice Test',\n  description: 'Club policies, safety, sailing fundamentals, and right-of-way rules.',\n  estimatedMinutes: '30–45 min',\n  questions: ${JSON.stringify(questions, null, 2)},\n} as const satisfies {\n  id: string\n  title: string\n  description: string\n  estimatedMinutes: string\n  questions: readonly TestQuestion[]\n}\n`

await writeFile(outputPath, output, 'utf8')
console.log(`Generated ${questions.length} questions at ${outputPath}`)
