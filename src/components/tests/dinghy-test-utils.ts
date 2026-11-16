import { isDevEnvironment } from '@/lib/env'
import type { TestQuestion } from '@/domains/written-tests/types'

export const PASSING_PERCENTAGE = 90

export type StatementAnswers = Record<number, boolean>
export type TestAnswer = string | number | number[] | StatementAnswers
export type TestAnswers = Partial<Record<number, TestAnswer>>

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

export function isQuestionAnswered(question: TestQuestion, answer: TestAnswer | undefined) {
  if (isDevelopmentAnswer(answer)) return true
  if (question.type === 'statements') {
    return (
      isStatementAnswers(answer) &&
      question.statements.every((_, index) => typeof answer[index] === 'boolean')
    )
  }
  if (question.type === 'text') return typeof answer === 'string' && answer.trim().length > 0
  if (question.type === 'multiple') return Array.isArray(answer) && answer.length > 0
  return typeof answer === 'number'
}

export function isQuestionCorrect(question: TestQuestion, answer: TestAnswer | undefined) {
  if (isDevelopmentAnswer(answer)) return true
  if (question.type === 'statements') {
    return (
      isStatementAnswers(answer) &&
      question.statements.every((statement, index) => answer[index] === statement.correct)
    )
  }
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

export function isStatementAnswers(answer: TestAnswer | undefined): answer is StatementAnswers {
  return typeof answer === 'object' && answer !== null && !Array.isArray(answer)
}

export function getQuestionPoints(question: TestQuestion) {
  return question.type === 'statements'
    ? question.statements.reduce((total, statement) => total + statement.points, 0)
    : question.points
}

export function getQuestionEarnedPoints(question: TestQuestion, answer: TestAnswer | undefined) {
  if (isDevelopmentAnswer(answer)) return getQuestionPoints(question)
  if (question.type === 'statements') {
    return question.statements.reduce(
      (total, statement, index) =>
        total +
        (isStatementAnswers(answer) && answer[index] === statement.correct ? statement.points : 0),
      0,
    )
  }
  return isQuestionCorrect(question, answer) ? getQuestionPoints(question) : 0
}

export function getPossiblePoints(questions: readonly TestQuestion[]) {
  return questions.reduce((total, question) => total + getQuestionPoints(question), 0)
}

export function getScorePercentage(earnedPoints: number, possiblePoints: number) {
  return possiblePoints > 0 ? Math.round((earnedPoints / possiblePoints) * 1000) / 10 : 0
}

export function scoreTest(
  questions: readonly TestQuestion[],
  answers: TestAnswers,
  passingPercentage = PASSING_PERCENTAGE,
) {
  const correct = questions.filter((question, index) =>
    isQuestionCorrect(question, answers[index]),
  ).length
  const earnedPoints = questions.reduce(
    (total, question, index) => total + getQuestionEarnedPoints(question, answers[index]),
    0,
  )
  const possiblePoints = getPossiblePoints(questions)
  return {
    correct,
    total: questions.length,
    earnedPoints,
    possiblePoints,
    percentage: getScorePercentage(earnedPoints, possiblePoints),
    passingPercentage,
    passed: possiblePoints > 0 && earnedPoints * 100 >= possiblePoints * passingPercentage,
  }
}

export function getAnswerText(question: TestQuestion, answer: TestAnswer | undefined) {
  if (isDevelopmentAnswer(answer)) return 'devtest'
  if (question.type === 'statements') {
    return question.statements
      .map(
        (_, index) =>
          `${index + 1}: ${isStatementAnswers(answer) && typeof answer[index] === 'boolean' ? (answer[index] ? 'True' : 'False') : 'Not answered'}`,
      )
      .join('; ')
  }
  if (!isQuestionAnswered(question, answer)) return 'Not answered'
  if (question.type === 'text') return answer as string

  const selectedIndices = new Set(Array.isArray(answer) ? answer : [answer as number])
  return question.options
    .filter((_, index) => selectedIndices.has(index))
    .map((option) => option.label)
    .join('; ')
}

export function getCorrectAnswerText(question: TestQuestion) {
  if (question.type === 'statements')
    return question.statements
      .map((statement, index) => `${index + 1}: ${statement.correct ? 'True' : 'False'}`)
      .join('; ')
  if (question.type === 'text') return question.acceptedAnswers.join(' / ')
  return question.options
    .filter((option) => option.correct)
    .map((option) => option.label)
    .join('; ')
}
