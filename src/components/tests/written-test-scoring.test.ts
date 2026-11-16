import { afterEach, describe, expect, it, vi } from 'vitest'

import { writtenTests } from '@/domains/written-tests/registry'
import type { StatementTestQuestion, TestQuestion } from '@/domains/written-tests/types'
import {
  getQuestionEarnedPoints,
  isQuestionAnswered,
  isQuestionCorrect,
  isTextAnswerAccepted,
  scoreTest,
  type TestAnswers,
} from './dinghy-test-utils'

const textQuestion: TestQuestion = {
  type: 'text',
  title: 'Boat part',
  category: 'Parts',
  prompt: 'Name this part.',
  placeholder: '',
  acceptedAnswers: ['centerboard', 'dagger board'],
  points: 0.5,
}

const statementQuestion: StatementTestQuestion = {
  type: 'statements',
  title: 'Rescue',
  category: 'Safety',
  prompt: 'Mark each statement true or false.',
  statements: [
    { prompt: 'First statement', correct: false, points: 1 },
    { prompt: 'Second statement', correct: true, points: 1 },
    { prompt: 'Third statement', correct: true, points: 1 },
    { prompt: 'Fourth statement', correct: false, points: 1 },
    { prompt: 'Fifth statement', correct: false, points: 1 },
  ],
}

function completeAnswerKey(questions: readonly TestQuestion[]): TestAnswers {
  return Object.fromEntries(
    questions.map((question, index) => {
      if (question.type === 'text') return [index, question.acceptedAnswers[0]]
      if (question.type === 'statements') {
        return [index, Object.fromEntries(question.statements.map((s, i) => [i, s.correct]))]
      }
      if (question.type === 'multiple') {
        return [index, question.options.flatMap((option, i) => (option.correct ? [i] : []))]
      }
      return [index, question.options.findIndex((option) => option.correct)]
    }),
  )
}

afterEach(() => vi.unstubAllEnvs())

describe('Written test definitions', () => {
  for (const test of writtenTests) {
    it(`${test.title} has complete answers and positive point values`, () => {
      expect(test.questions.length).toBeGreaterThan(0)
      for (const question of test.questions) {
        expect(question.prompt.trim()).not.toBe('')
        if (question.type === 'statements') {
          expect(question.statements.length).toBeGreaterThan(0)
          for (const statement of question.statements) {
            expect(statement.prompt.trim()).not.toBe('')
            expect(statement.points).toBeGreaterThan(0)
          }
        } else {
          expect(question.points).toBeGreaterThan(0)
          if (question.type === 'text') {
            expect(question.acceptedAnswers.length).toBeGreaterThan(0)
            expect(question.acceptedAnswers.every((answer) => answer.trim().length > 0)).toBe(true)
          } else {
            expect(question.options.length).toBeGreaterThan(1)
            const correctCount = question.options.filter((option) => option.correct).length
            if (question.type === 'single') expect(correctCount).toBe(1)
            else expect(correctCount).toBeGreaterThan(0)
          }
        }
      }
    })

    it(`${test.title} awards full credit for its answer key`, () => {
      const result = scoreTest(
        test.questions,
        completeAnswerKey(test.questions),
        test.passingPercentage,
      )
      expect(result.earnedPoints).toBe(result.possiblePoints)
      expect(result).toMatchObject({
        percentage: 100,
        passed: true,
        correct: test.questions.length,
      })
    })
  }
})

describe('Answer matching', () => {
  it('accepts synonyms and ignores case, spacing, and punctuation', () => {
    expect(isQuestionCorrect(textQuestion, 'CENTER-BOARD')).toBe(true)
    expect(isQuestionCorrect(textQuestion, 'dagger board')).toBe(true)
    expect(isQuestionCorrect(textQuestion, 'rudder')).toBe(false)
  })

  it('accepts close misspellings without accepting different sailing terms', () => {
    expect(isTextAnswerAccepted('centerbord', 'centerboard')).toBe(true)
    expect(isTextAnswerAccepted('tillre', 'tiller')).toBe(true)
    expect(isTextAnswerAccepted('mainshet', 'mainsheet')).toBe(true)
    expect(isTextAnswerAccepted('mask', 'mast')).toBe(false)
    expect(isTextAnswerAccepted('rudder', 'tiller')).toBe(false)
    expect(isTextAnswerAccepted('close reach', 'close hauled')).toBe(false)
  })

  it('requires the exact correct checkbox set, regardless of selection order', () => {
    const question: TestQuestion = {
      ...textQuestion,
      type: 'multiple',
      points: 3,
      options: [
        { label: 'A', correct: true },
        { label: 'B', correct: false },
        { label: 'C', correct: true },
      ],
    }
    expect(getQuestionEarnedPoints(question, [2, 0])).toBe(3)
    for (const answer of [[], [0], [0, 1, 2]]) {
      expect(getQuestionEarnedPoints(question, answer)).toBe(0)
    }
  })

  it('allows the development shortcut only in development environments', () => {
    vi.stubEnv('DEV', true)
    expect(getQuestionEarnedPoints(textQuestion, 'devtest')).toBe(0.5)
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_APP_ENV', 'dev')
    expect(getQuestionEarnedPoints(textQuestion, 'devtest')).toBe(0.5)
    vi.stubEnv('VITE_APP_ENV', '')
    expect(getQuestionEarnedPoints(textQuestion, 'devtest')).toBe(0)
    expect(getQuestionEarnedPoints(statementQuestion, 'devtest')).toBe(0)
  })
})

describe('Point scoring', () => {
  it('separates question counts from weighted points, including fractional points', () => {
    expect(
      scoreTest([textQuestion, { ...textQuestion, points: 4.5 }], { 0: 'centerboard' }),
    ).toMatchObject({
      correct: 1,
      total: 2,
      earnedPoints: 0.5,
      possiblePoints: 5,
      percentage: 10,
      passed: false,
    })
  })

  it('scores a group as one question with independently earned statement points', () => {
    const answers = { 0: false, 1: true, 2: true, 3: false, 4: true }
    expect(scoreTest([statementQuestion], { 0: answers })).toMatchObject({
      correct: 0,
      total: 1,
      earnedPoints: 4,
      possiblePoints: 5,
      percentage: 80,
      passed: false,
    })
    expect(getQuestionEarnedPoints(statementQuestion, { ...answers, 4: false })).toBe(5)
    expect(isQuestionCorrect(statementQuestion, { ...answers, 4: false })).toBe(true)
  })

  it('does not interpret unanswered statements as false', () => {
    expect(getQuestionEarnedPoints(statementQuestion, undefined)).toBe(0)
    expect(getQuestionEarnedPoints(statementQuestion, {})).toBe(0)
    expect(getQuestionEarnedPoints(statementQuestion, { 0: false })).toBe(1)
    expect(isQuestionAnswered(statementQuestion, { 0: false })).toBe(false)
    expect(isQuestionCorrect(statementQuestion, {})).toBe(false)
  })

  it('passes at exactly 90 percent and fails below it even when the display rounds to 90', () => {
    const questions = [
      { ...textQuestion, points: 89.96 },
      { ...textQuestion, points: 0.04 },
      { ...textQuestion, points: 10 },
    ]
    expect(scoreTest(questions, { 0: 'centerboard' })).toMatchObject({
      percentage: 90,
      passed: false,
    })
    expect(scoreTest(questions, { 0: 'centerboard', 1: 'centerboard' })).toMatchObject({
      earnedPoints: 90,
      possiblePoints: 100,
      passingPercentage: 90,
      passed: true,
    })
  })

  it('uses the supplied passing threshold', () => {
    expect(
      scoreTest([statementQuestion], { 0: { 0: false, 1: true, 2: true, 3: false } }, 80),
    ).toMatchObject({ percentage: 80, passingPercentage: 80, passed: true })
  })

  it('gives an unanswered test zero points and does not pass an empty test', () => {
    expect(scoreTest([textQuestion, statementQuestion], {})).toMatchObject({
      earnedPoints: 0,
      percentage: 0,
      passed: false,
    })
    expect(scoreTest([], {})).toMatchObject({
      earnedPoints: 0,
      possiblePoints: 0,
      percentage: 0,
      passed: false,
    })
  })
})
