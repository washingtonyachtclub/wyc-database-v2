import { describe, expect, it } from 'vitest'

import { dinghyNoviceTest } from './dinghy-test-data'
import {
  isQuestionCorrect,
  isTextAnswerAccepted,
  scoreTest,
  type TestAnswers,
} from './dinghy-test-utils'

function completeAnswerKey(): TestAnswers {
  return Object.fromEntries(
    dinghyNoviceTest.questions.map((question, questionIndex) => {
      if (question.type === 'text') return [questionIndex, question.acceptedAnswers[0]]
      if (question.type === 'multiple') {
        return [
          questionIndex,
          question.options.flatMap((option, optionIndex) => (option.correct ? [optionIndex] : [])),
        ]
      }
      return [questionIndex, question.options.findIndex((option) => option.correct)]
    }),
  )
}

describe('dinghyNoviceTest', () => {
  it('contains the current 77 questions in display order', () => {
    expect(dinghyNoviceTest.questions).toHaveLength(77)
    expect(dinghyNoviceTest.questions[0].prompt).toContain('sailboat part A')
    expect(dinghyNoviceTest.questions[30].prompt).toBe('Club dinghies may be sailed:')
    expect(dinghyNoviceTest.questions[76].prompt).toContain('The channel is busy')
  })

  it('contains complete question and answer data', () => {
    for (const question of dinghyNoviceTest.questions) {
      expect(question.title.trim()).not.toBe('')
      expect(question.category.trim()).not.toBe('')
      expect(question.prompt.trim()).not.toBe('')
      if (question.type === 'text') {
        expect(question.acceptedAnswers.length).toBeGreaterThan(0)
      } else {
        expect(question.options.length).toBeGreaterThan(1)
        expect(question.options.some((option) => option.correct)).toBe(true)
      }
    }
  })

  it('supports every question type present in the current test', () => {
    const typeCounts = dinghyNoviceTest.questions.reduce<Record<string, number>>(
      (counts, question) => ({ ...counts, [question.type]: (counts[question.type] ?? 0) + 1 }),
      {},
    )

    expect(typeCounts.text).toBe(27)
    expect(typeCounts.single).toBe(49)
    expect(typeCounts.multiple).toBe(1)
  })

  it('includes diagrams on every question that depends on one', () => {
    expect(dinghyNoviceTest.questions.filter((question) => 'image' in question)).toHaveLength(34)
    expect(dinghyNoviceTest.questions.slice(0, 24).every((question) => 'image' in question)).toBe(
      true,
    )
  })
})

describe('Dinghy test scoring', () => {
  it('scores text answers without case, spacing, or punctuation sensitivity', () => {
    const firstQuestion = dinghyNoviceTest.questions[0]

    expect(isQuestionCorrect(firstQuestion, 'CENTER-BOARD')).toBe(true)
    expect(isQuestionCorrect(firstQuestion, 'dagger board')).toBe(true)
    expect(isQuestionCorrect(firstQuestion, 'rudder')).toBe(false)
  })

  it('accepts hiking stick for question 4', () => {
    expect(isQuestionCorrect(dinghyNoviceTest.questions[3], 'hiking stick')).toBe(true)
  })

  it('accepts close misspellings without accepting different sailing terms', () => {
    expect(isTextAnswerAccepted('centerbord', 'centerboard')).toBe(true)
    expect(isTextAnswerAccepted('tillre', 'tiller')).toBe(true)
    expect(isTextAnswerAccepted('mainshet', 'mainsheet')).toBe(true)
    expect(isTextAnswerAccepted('mask', 'mast')).toBe(false)
    expect(isTextAnswerAccepted('rudder', 'tiller')).toBe(false)
    expect(isTextAnswerAccepted('close reach', 'close hauled')).toBe(false)
  })

  it('accepts devtest for local development testing', () => {
    expect(isQuestionCorrect(dinghyNoviceTest.questions[0], 'devtest')).toBe(true)
  })

  it('requires the exact correct set for the multi-select question', () => {
    const question = dinghyNoviceTest.questions[57]
    if (question.type !== 'multiple') throw new Error('Multi-select question is missing')

    const correctIndices = question.options.flatMap((option, index) =>
      option.correct ? [index] : [],
    )

    expect(isQuestionCorrect(question, correctIndices)).toBe(true)
    expect(isQuestionCorrect(question, correctIndices.slice(0, 1))).toBe(false)
  })

  it('uses an exact 90 percent passing cutoff', () => {
    const passingAnswers = completeAnswerKey()
    const failingAnswers = completeAnswerKey()
    for (let index = 0; index < 7; index += 1) delete passingAnswers[index]
    for (let index = 0; index < 8; index += 1) delete failingAnswers[index]

    expect(scoreTest(dinghyNoviceTest.questions, passingAnswers).passed).toBe(true)
    expect(scoreTest(dinghyNoviceTest.questions, failingAnswers)).toMatchObject({
      percentage: 90,
      passed: false,
    })
  })

  it('can produce a complete 100 percent answer key', () => {
    expect(scoreTest(dinghyNoviceTest.questions, completeAnswerKey())).toEqual({
      correct: 77,
      total: 77,
      percentage: 100,
      passed: true,
    })
  })
})
