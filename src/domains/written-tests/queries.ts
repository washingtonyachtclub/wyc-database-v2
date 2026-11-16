import { and, eq } from 'drizzle-orm'
import db from '@/db'
import { writtenTestAttempts, wycDatabase } from '@/db/schema'
import { getWrittenTest, getTestFingerprint } from './registry'
import { validateTestAnswers } from './schema'
import {
  isQuestionCorrect,
  getQuestionEarnedPoints,
  getScorePercentage,
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
  const questions = attempt.snapshot.questions.map((question) =>
    question.type === 'statements' ? question : { ...question, points: question.points ?? 1 },
  )
  return {
    title: attempt.snapshot.title,
    questions,
    earnedPoints: attempt.snapshot.questions.map(
      (question) => question.earnedPoints ?? (question.correct ? 1 : 0),
    ),
    score: {
      correct: attempt.correctCount,
      total: attempt.questionCount,
      earnedPoints: attempt.earnedPoints,
      possiblePoints: attempt.possiblePoints,
      percentage: getScorePercentage(attempt.earnedPoints, attempt.possiblePoints),
      passingPercentage: attempt.snapshot.passingPercentage,
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
  if (existing) {
    if (
      existing.testId !== data.testId ||
      existing.mode !== data.mode ||
      existing.examinerWycNumber !== (data.mode === 'final' ? data.examinerWycNumber : null)
    ) {
      return { error: 'This attempt has already been submitted for a different test or mode.' }
    }
    return { result: toSavedResult(existing) }
  }
  const test = getWrittenTest(data.testId)
  if (!test || getTestFingerprint(test) !== data.fingerprint) {
    return {
      error:
        'This test has changed. Exit this attempt and reload the page to start the updated test.',
    }
  }
  if (!validateTestAnswers(test.questions, data.answers))
    return { error: 'Some answers are invalid. Please review your answers.' }
  if (data.mode === 'final' && !(await examinerExists(data.examinerWycNumber!))) {
    return { error: 'No member exists with that examiner WYC ID.' }
  }
  const score = scoreTest(test.questions, data.answers, test.passingPercentage)
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
      earnedPoints: score.earnedPoints,
      possiblePoints: score.possiblePoints,
      passed: score.passed ? 1 : 0,
      snapshot: {
        title: test.title,
        passingPercentage: test.passingPercentage,
        questions: test.questions.map((question, index) => ({
          ...question,
          answer: data.answers[index] ?? null,
          correct: isQuestionCorrect(question, data.answers[index]),
          earnedPoints: getQuestionEarnedPoints(question, data.answers[index]),
        })),
      },
    })
    .onConflictDoNothing({ target: writtenTestAttempts.attemptId })
  const saved = await getAttempt(memberWycNumber, data.attemptId)
  if (!saved) throw new Error('Saved test attempt was not found')
  if (
    saved.testId !== data.testId ||
    saved.mode !== data.mode ||
    saved.examinerWycNumber !== (data.mode === 'final' ? data.examinerWycNumber : null)
  ) {
    return { error: 'This attempt has already been submitted for a different test or mode.' }
  }
  return { result: toSavedResult(saved) }
}
