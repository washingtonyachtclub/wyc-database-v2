import { isDevEnvironment } from '@/lib/env'
import type { TestQuestion } from './dinghy-test-data'

export type TestAnswer = string | string[]
export type TestAnswers = Record<string, TestAnswer>

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
    isDevEnvironment() && values.some((value) => normalizeTextAnswer(value ?? '') === 'devtest')
  )
}

export function isQuestionAnswered(question: TestQuestion, answer: TestAnswer | undefined) {
  if (isDevelopmentAnswer(answer)) return true
  if (question.type === 'multiple') return Array.isArray(answer) && answer.length > 0
  return typeof answer === 'string' && answer.trim().length > 0
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
    return question.options.some((option) => option.id === answer && option.correct)
  }

  const selectedIds = new Set(answer as string[])
  const correctIds = question.options.filter((option) => option.correct).map((option) => option.id)

  return selectedIds.size === correctIds.length && correctIds.every((id) => selectedIds.has(id))
}

export function scoreTest(questions: readonly TestQuestion[], answers: TestAnswers) {
  const correct = questions.filter((question) =>
    isQuestionCorrect(question, answers[question.id]),
  ).length

  return {
    correct,
    total: questions.length,
    percentage: Math.round((correct / questions.length) * 100),
  }
}

export function getAnswerText(question: TestQuestion, answer: TestAnswer | undefined) {
  if (isDevelopmentAnswer(answer)) return 'devtest'
  if (!isQuestionAnswered(question, answer)) return 'Not answered'
  if (question.type === 'text') return answer as string

  const selectedIds = new Set(Array.isArray(answer) ? answer : [answer])
  return question.options
    .filter((option) => selectedIds.has(option.id))
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
