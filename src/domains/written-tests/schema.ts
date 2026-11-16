import { z } from 'zod'
import type { TestQuestion } from './types'
import { getWrittenTest } from './registry'
import { isDevelopmentAnswer, isStatementAnswers } from '@/components/tests/dinghy-test-utils'
import type { TestAnswer, TestAnswers, scoreTest } from '@/components/tests/dinghy-test-utils'

export const examinerNumberSchema = z.number().int().positive().max(2147483647)

export const submitTestSchema = z
  .object({
    attemptId: z.uuid(),
    testId: z
      .string()
      .max(64)
      .refine((id) => Boolean(getWrittenTest(id)), 'Unknown test'),
    fingerprint: z.string().max(64),
    mode: z.enum(['practice', 'final']),
    examinerWycNumber: examinerNumberSchema.nullable(),
    answers: z.record(
      z.string().regex(/^\d{1,3}$/),
      z.union([
        z.string().max(2000),
        z.record(z.string().regex(/^\d{1,3}$/), z.boolean()),
        z.number().int().nonnegative(),
        z.array(z.number().int().nonnegative()).max(100),
      ]),
    ),
  })
  .refine((data) => data.mode === 'practice' || data.examinerWycNumber !== null, {
    message: 'An examiner is required for a final test',
  })

export function validateTestAnswers(questions: readonly TestQuestion[], answers: TestAnswers) {
  return Object.entries(answers).every(([key, answer]) => {
    const index = Number(key)
    const question = questions[index]
    if (!question || String(index) !== key) return false
    if (isDevelopmentAnswer(answer)) return true
    if (question.type === 'text') return typeof answer === 'string'
    if (question.type === 'statements') {
      return (
        isStatementAnswers(answer) &&
        Object.keys(answer).every(
          (key) =>
            String(Number(key)) === key &&
            Number(key) >= 0 &&
            Number(key) < question.statements.length,
        )
      )
    }
    const validOption = (index: number) =>
      Number.isInteger(index) && index >= 0 && index < question.options.length
    return question.type === 'single'
      ? typeof answer === 'number' && validOption(answer)
      : Array.isArray(answer) && new Set(answer).size === answer.length && answer.every(validOption)
  })
}

export type TestSubmission = z.infer<typeof submitTestSchema>
export type TestScore = ReturnType<typeof scoreTest>
type SnapshotQuestion<T = TestQuestion> = T extends TestQuestion
  ? Omit<T, 'points'> & {
      points?: number
      answer: TestAnswer | null
      correct: boolean
      earnedPoints?: number
    }
  : never

export type TestSnapshot = {
  title: string
  passingPercentage: number
  questions: SnapshotQuestion[]
}
export type SavedTestResult = {
  title: string
  questions: TestQuestion[]
  earnedPoints: number[]
  score: TestScore
  answers: TestAnswers
  correctAnswers: boolean[]
}
