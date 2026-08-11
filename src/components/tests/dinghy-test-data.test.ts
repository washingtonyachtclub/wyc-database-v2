import { describe, expect, it } from 'vitest'

import { dinghyNoviceTest } from './dinghy-test-data'
import { isQuestionCorrect, scoreTest, type TestAnswers } from './dinghy-test-utils'

describe('dinghyNoviceTest', () => {
  it('contains the exact active 77-question test in source order', () => {
    expect(dinghyNoviceTest.questions).toHaveLength(77)
    expect(dinghyNoviceTest.questions[0].sourceId).toBe('154')
    expect(dinghyNoviceTest.questions[30].sourceId).toBe('14')
    expect(dinghyNoviceTest.questions[76].sourceId).toBe('60')
    expect(dinghyNoviceTest.questions.map((question) => question.number)).toEqual(
      Array.from({ length: 77 }, (_, index) => index + 1),
    )
  })

  it('supports every question type present in the active test', () => {
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

  it('accepts devtest for local development testing', () => {
    expect(isQuestionCorrect(dinghyNoviceTest.questions[0], 'devtest')).toBe(true)
  })

  it('requires the exact correct set for the multi-select damage question', () => {
    const damageQuestion = dinghyNoviceTest.questions.find((question) => question.sourceId === '41')
    if (!damageQuestion || damageQuestion.type !== 'multiple') {
      throw new Error('Damage question is missing')
    }

    const correctIds = damageQuestion.options
      .filter((option) => option.correct)
      .map((option) => option.id)

    expect(isQuestionCorrect(damageQuestion, correctIds)).toBe(true)
    expect(isQuestionCorrect(damageQuestion, correctIds.slice(0, 1))).toBe(false)
  })

  it('can produce a complete 100 percent answer key', () => {
    const answers = Object.fromEntries(
      dinghyNoviceTest.questions.map((question) => {
        if (question.type === 'text') return [question.id, question.acceptedAnswers[0]]
        if (question.type === 'multiple') {
          return [
            question.id,
            question.options.filter((option) => option.correct).map((option) => option.id),
          ]
        }
        return [question.id, question.options.find((option) => option.correct)?.id ?? '']
      }),
    ) as TestAnswers

    expect(scoreTest(dinghyNoviceTest.questions, answers)).toEqual({
      correct: 77,
      total: 77,
      percentage: 100,
    })
  })
})
