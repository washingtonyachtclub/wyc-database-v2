import { isDevEnvironment } from '@/lib/env'
import type { TestQuestion } from './dinghy-test-data'

export const PASSING_PERCENTAGE = 90

export type TestAnswer = string | number | number[]
export type TestAnswers = Partial<Record<number, TestAnswer>>

const sailingGuidePartAnswers = [
  ['Rudder'],
  ['Tiller'],
  ['Hiking Stick', 'Tiller Extension'],
  ['Centerboard'],
  ['Mast'],
  ['Boom'],
  ['Main Sail'],
  ['Jib Sail'],
  ['Main Halyard'],
  ['Jib Halyard'],
  ['Outhaul'],
  ['Main Sheet'],
  ['Boom Vang'],
  ['Downhaul'],
  ['Jib Sheets'],
  ['Battens'],
  ['Hull'],
  ['Forestay'],
  ['Shroud'],
  ['Main Head'],
  ['Main Luff'],
  ['Main Tack'],
  ['Main Foot'],
  ['Clew'],
] as const

export function normalizeTextAnswer(value: string) {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function getEditDistance(left: string, right: string) {
  const distances = Array.from({ length: left.length + 1 }, () =>
    Array.from({ length: right.length + 1 }, () => 0),
  )

  for (let leftIndex = 0; leftIndex <= left.length; leftIndex += 1) {
    distances[leftIndex][0] = leftIndex
  }
  for (let rightIndex = 0; rightIndex <= right.length; rightIndex += 1) {
    distances[0][rightIndex] = rightIndex
  }

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      distances[leftIndex][rightIndex] = Math.min(
        distances[leftIndex - 1][rightIndex] + 1,
        distances[leftIndex][rightIndex - 1] + 1,
        distances[leftIndex - 1][rightIndex - 1] + substitutionCost,
      )

      if (
        leftIndex > 1 &&
        rightIndex > 1 &&
        left[leftIndex - 1] === right[rightIndex - 2] &&
        left[leftIndex - 2] === right[rightIndex - 1]
      ) {
        distances[leftIndex][rightIndex] = Math.min(
          distances[leftIndex][rightIndex],
          distances[leftIndex - 2][rightIndex - 2] + 1,
        )
      }
    }
  }

  return distances[left.length][right.length]
}

function getMaximumEditDistance(length: number) {
  if (length <= 4) return 0
  if (length <= 7) return 1
  if (length <= 12) return 2
  return 3
}

export function isTextAnswerAccepted(answer: string, acceptedAnswer: string) {
  const normalizedAnswer = normalizeTextAnswer(answer)
  const normalizedAcceptedAnswer = normalizeTextAnswer(acceptedAnswer)
  if (normalizedAnswer === normalizedAcceptedAnswer) return true

  const maximumEditDistance = getMaximumEditDistance(normalizedAcceptedAnswer.length)
  if (Math.abs(normalizedAnswer.length - normalizedAcceptedAnswer.length) > maximumEditDistance) {
    return false
  }

  return getEditDistance(normalizedAnswer, normalizedAcceptedAnswer) <= maximumEditDistance
}

export function isDevelopmentAnswer(answer: TestAnswer | undefined) {
  const values = Array.isArray(answer) ? answer : [answer]
  return (
    isDevEnvironment() &&
    values.some((value) => typeof value === 'string' && normalizeTextAnswer(value) === 'devtest')
  )
}

export function getCopiedGuideQuestionIndices(
  questions: readonly TestQuestion[],
  answers: TestAnswers,
) {
  return questions.flatMap((question, questionIndex) => {
    const guideAnswers = sailingGuidePartAnswers[questionIndex]
    const answer = answers[questionIndex]
    return question.type === 'text' &&
      typeof answer === 'string' &&
      guideAnswers?.some((guideAnswer) => isTextAnswerAccepted(answer, guideAnswer))
      ? [questionIndex]
      : []
  })
}

export function isQuestionAnswered(question: TestQuestion, answer: TestAnswer | undefined) {
  if (isDevelopmentAnswer(answer)) return true
  if (question.type === 'text') return typeof answer === 'string' && answer.trim().length > 0
  if (question.type === 'multiple') return Array.isArray(answer) && answer.length > 0
  return typeof answer === 'number'
}

export function isQuestionCorrect(question: TestQuestion, answer: TestAnswer | undefined) {
  if (isDevelopmentAnswer(answer)) return true
  if (!isQuestionAnswered(question, answer)) return false

  if (question.type === 'text') {
    return question.acceptedAnswers.some((acceptedAnswer) =>
      isTextAnswerAccepted(answer as string, acceptedAnswer),
    )
  }

  if (question.type === 'single') {
    return question.options[answer as number]?.correct === true
  }

  const selectedIndices = new Set(answer as number[])
  const correctIndices = question.options.flatMap((option, index) =>
    option.correct ? [index] : [],
  )

  return (
    selectedIndices.size === correctIndices.length &&
    correctIndices.every((index) => selectedIndices.has(index))
  )
}

export function scoreTest(questions: readonly TestQuestion[], answers: TestAnswers) {
  const correct = questions.filter((question, index) =>
    isQuestionCorrect(question, answers[index]),
  ).length
  const copiedGuideQuestionIndices = getCopiedGuideQuestionIndices(questions, answers)
  const cheatingPenalty = copiedGuideQuestionIndices.length
  const points = Math.max(0, correct - cheatingPenalty)
  const percentage = Math.round((points / questions.length) * 100)

  return {
    correct,
    points,
    total: questions.length,
    percentage,
    passed: (points / questions.length) * 100 >= PASSING_PERCENTAGE,
    cheatingPenalty,
    copiedGuideQuestionIndices,
  }
}

export function getAnswerText(question: TestQuestion, answer: TestAnswer | undefined) {
  if (isDevelopmentAnswer(answer)) return 'devtest'
  if (!isQuestionAnswered(question, answer)) return 'Not answered'
  if (question.type === 'text') return answer as string

  const selectedIndices = new Set(Array.isArray(answer) ? answer : [answer as number])
  return question.options
    .filter((_, index) => selectedIndices.has(index))
    .map((option) => option.label)
    .join('; ')
}

export function getCorrectAnswerText(question: TestQuestion) {
  if (question.type === 'text') return question.acceptedAnswers.join(' / ')
  return question.options
    .filter((option) => option.correct)
    .map((option) => option.label)
    .join('; ')
}
