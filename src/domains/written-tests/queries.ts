import { and, eq } from 'drizzle-orm'
import db from '@/db'
import { writtenTestAttempts, wycDatabase } from '@/db/schema'
import { dinghyNoviceTest } from '@/components/tests/dinghy-test-data'
import {
  isQuestionCorrect,
  PASSING_PERCENTAGE,
  scoreTest,
} from '@/components/tests/dinghy-test-utils'
import type { SavedTestResult, TestSubmission } from './schema'

export async function examinerExists(wycNumber: number) {
  const [member] = await db
    .select({ wycNumber: wycDatabase.wycNumber })
    .from(wycDatabase)
    .where(eq(wycDatabase.wycNumber, wycNumber))
    .limit(1)
  return Boolean(member)
}

async function getAttempt(memberWycNumber: number, attemptId: string) {
  const [attempt] = await db
    .select()
    .from(writtenTestAttempts)
    .where(
      and(
        eq(writtenTestAttempts.memberWycNumber, memberWycNumber),
        eq(writtenTestAttempts.attemptId, attemptId),
      ),
    )
    .limit(1)
  return attempt
}

function toSavedResult(attempt: typeof writtenTestAttempts.$inferSelect): SavedTestResult {
  return {
    score: {
      correct: attempt.correctCount,
      total: attempt.questionCount,
      percentage: attempt.percentage,
      passed: attempt.passed !== 0,
    },
    answers: Object.fromEntries(
      attempt.snapshot.questions.flatMap((question, index) =>
        question.answer === null ? [] : [[index, question.answer]],
      ),
    ),
    correctAnswers: attempt.snapshot.questions.map((question) => question.correct),
  }
}

export async function saveTestAttempt(memberWycNumber: number, data: TestSubmission) {
  const existing = await getAttempt(memberWycNumber, data.attemptId)
  if (existing) return { result: toSavedResult(existing) }
  if (data.mode === 'final' && !(await examinerExists(data.examinerWycNumber!))) {
    return { error: 'No member exists with that examiner WYC ID.' }
  }
  const score = scoreTest(dinghyNoviceTest.questions, data.answers)
  await db
    .insert(writtenTestAttempts)
    .values({
      attemptId: data.attemptId,
      memberWycNumber,
      examinerWycNumber: data.mode === 'final' ? data.examinerWycNumber : null,
      testId: data.testId,
      mode: data.mode,
      correctCount: score.correct,
      questionCount: score.total,
      percentage: score.percentage,
      passed: score.passed ? 1 : 0,
      snapshot: {
        title: dinghyNoviceTest.title,
        passingPercentage: PASSING_PERCENTAGE,
        questions: dinghyNoviceTest.questions.map((question, index) => ({
          ...question,
          answer: data.answers[index] ?? null,
          correct: isQuestionCorrect(question, data.answers[index]),
        })),
      },
    })
    .onDuplicateKeyUpdate({ set: { attemptId: data.attemptId } })
  const saved = await getAttempt(memberWycNumber, data.attemptId)
  if (!saved) throw new Error('Saved test attempt was not found')
  return { result: toSavedResult(saved) }
}
