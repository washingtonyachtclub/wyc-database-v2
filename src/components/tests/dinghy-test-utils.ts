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
    const normalized = normalizeTextAnswer(answer as string)
    return question.acceptedAnswers.some(
      (acceptedAnswer) => normalizeTextAnswer(acceptedAnswer) === normalized,
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
