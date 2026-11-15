import { z } from 'zod'
import type { TestQuestion } from '@/components/tests/dinghy-test-data'
import type { TestAnswer, TestAnswers, scoreTest } from '@/components/tests/dinghy-test-utils'

export const examinerNumberSchema = z.number().int().positive().max(2147483647)

export const submitTestSchema = z
  .object({
    attemptId: z.uuid(),
    testId: z.literal('dinghy-novice'),
    mode: z.enum(['practice', 'final']),
    examinerWycNumber: examinerNumberSchema.nullable(),
    answers: z.record(
      z.string().regex(/^\d{1,3}$/),
      z.union([
        z.string().max(2000),
        z.number().int().nonnegative(),
        z.array(z.number().int().nonnegative()).max(100),
      ]),
    ),
  })
  .refine((data) => data.mode === 'practice' || data.examinerWycNumber !== null, {
    message: 'An examiner is required for a final test',
  })

export type TestSubmission = z.infer<typeof submitTestSchema>
export type TestScore = ReturnType<typeof scoreTest>
export type TestSnapshot = {
  title: string
  passingPercentage: number
  questions: (TestQuestion & { answer: TestAnswer | null; correct: boolean })[]
}
export type SavedTestResult = {
  score: TestScore
  answers: TestAnswers
  correctAnswers: boolean[]
}
