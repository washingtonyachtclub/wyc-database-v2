import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  CircleX,
  Clock3,
  Flag,
  ListChecks,
  RotateCcw,
  Sailboat,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isDevEnvironment } from '@/lib/env'
import { cn } from '@/lib/utils'
import { dinghyNoviceTest, type TestQuestion } from './dinghy-test-data'
import {
  getAnswerText,
  getCorrectAnswerText,
  isQuestionAnswered,
  isQuestionCorrect,
  scoreTest,
  type TestAnswers,
} from './dinghy-test-utils'

const STORAGE_KEY = 'wyc-dinghy-novice-test-draft-v1'
type TestView = 'taking' | 'review' | 'results'

export function DinghyTest() {
  const questions = dinghyNoviceTest.questions
  const [answers, setAnswers] = useState<TestAnswers>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [view, setView] = useState<TestView>('taking')
  const [draftLoaded, setDraftLoaded] = useState(false)

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(STORAGE_KEY)
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as { answers?: TestAnswers; currentIndex?: number }
        setAnswers(parsed.answers ?? {})
        setCurrentIndex(Math.min(Math.max(parsed.currentIndex ?? 0, 0), questions.length - 1))
      }
    } catch (error) {
      console.warn('Unable to restore the saved Dinghy test draft', error)
    } finally {
      setDraftLoaded(true)
    }
  }, [questions.length])

  useEffect(() => {
    if (!draftLoaded || view === 'results') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, currentIndex }))
  }, [answers, currentIndex, draftLoaded, view])

  const answeredCount = useMemo(
    () => questions.filter((question) => isQuestionAnswered(question, answers[question.id])).length,
    [answers, questions],
  )
  const currentQuestion = questions[currentIndex]
  const fillWithDevAnswer = () => {
    setAnswers(
      Object.fromEntries(
        questions.map((question) => [
          question.id,
          question.type === 'multiple' ? ['devtest'] : 'devtest',
        ]),
      ),
    )
  }

  const goToQuestion = (index: number) => {
    setCurrentIndex(index)
    setView('taking')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitTest = () => {
    setView('results')
    window.localStorage.removeItem(STORAGE_KEY)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const restartTest = () => {
    setAnswers({})
    setCurrentIndex(0)
    setView('taking')
    window.localStorage.removeItem(STORAGE_KEY)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <TestHeader answeredCount={answeredCount} onFillWithDevAnswer={fillWithDevAnswer} />

      {view === 'taking' && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <QuestionCard
            answers={answers}
            currentIndex={currentIndex}
            onAnswer={setAnswers}
            onNext={() => {
              if (currentIndex === questions.length - 1) {
                setView('review')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              } else {
                goToQuestion(currentIndex + 1)
              }
            }}
            onPrevious={() => goToQuestion(currentIndex - 1)}
            question={currentQuestion}
            total={questions.length}
          />
          <QuestionNavigator
            answers={answers}
            currentIndex={currentIndex}
            onSelect={goToQuestion}
            questions={questions}
          />
        </div>
      )}

      {view === 'review' && (
        <ReviewScreen
          answers={answers}
          onBack={() => goToQuestion(currentIndex)}
          onSelectQuestion={goToQuestion}
          onSubmit={submitTest}
          questions={questions}
        />
      )}

      {view === 'results' && (
        <ResultsScreen answers={answers} onRestart={restartTest} questions={questions} />
      )}
    </div>
  )
}

function TestHeader({
  answeredCount,
  onFillWithDevAnswer,
}: {
  answeredCount: number
  onFillWithDevAnswer: () => void
}) {
  return (
    <>
      <div className="mb-6 sm:mb-8">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
          <Sailboat aria-hidden="true" className="h-4 w-4" />
          Written tests
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{dinghyNoviceTest.title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{dinghyNoviceTest.description}</p>
        {isDevEnvironment() && (
          <Button
            className="mt-4"
            onClick={onFillWithDevAnswer}
            size="sm"
            type="button"
            variant="outline"
          >
            Fill with devtest
          </Button>
        )}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <TestDetail
          icon={<ListChecks aria-hidden="true" />}
          label="Questions"
          value={String(dinghyNoviceTest.questions.length)}
        />
        <TestDetail
          icon={<Clock3 aria-hidden="true" />}
          label="Estimated time"
          value={dinghyNoviceTest.estimatedMinutes}
        />
        <TestDetail
          icon={<Check aria-hidden="true" />}
          label="Answered"
          value={`${answeredCount} of ${dinghyNoviceTest.questions.length}`}
        />
      </div>
    </>
  )
}

function QuestionCard({
  answers,
  currentIndex,
  onAnswer,
  onNext,
  onPrevious,
  question,
  total,
}: {
  answers: TestAnswers
  currentIndex: number
  onAnswer: React.Dispatch<React.SetStateAction<TestAnswers>>
  onNext: () => void
  onPrevious: () => void
  question: TestQuestion
  total: number
}) {
  const answer = answers[question.id]
  const isAnswered = isQuestionAnswered(question, answer)
  const positionProgress = ((currentIndex + 1) / total) * 100

  const setAnswer = (nextAnswer: string | string[]) => {
    onAnswer((current) => ({ ...current, [question.id]: nextAnswer }))
  }

  const toggleMultipleAnswer = (optionId: string) => {
    const selected = new Set(Array.isArray(answer) ? answer : [])
    if (selected.has(optionId)) selected.delete(optionId)
    else selected.add(optionId)
    setAnswer([...selected])
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-muted/40 px-5 py-4 sm:px-8">
        <div className="mb-3 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span className="font-semibold">
            Question {currentIndex + 1} of {total}
          </span>
          <span className="text-right text-muted-foreground">{question.category}</span>
        </div>
        <div
          aria-label={`Test position: question ${currentIndex + 1} of ${total}`}
          aria-valuemax={total}
          aria-valuemin={1}
          aria-valuenow={currentIndex + 1}
          className="h-2 overflow-hidden rounded-full bg-primary/10"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${positionProgress}%` }}
          />
        </div>
      </div>

      <div className="px-5 py-7 sm:px-8 sm:py-9">
        <p className="mb-2 text-sm font-medium text-muted-foreground">{question.title}</p>
        <h2 className="break-words text-xl font-semibold leading-8 sm:text-2xl">
          {question.prompt}
        </h2>

        {question.image && (
          <div className="mt-6 overflow-hidden rounded-lg border bg-white p-3">
            <img
              alt={question.image.alt}
              className="mx-auto max-h-[32rem] w-auto max-w-full object-contain"
              src={question.image.src}
            />
          </div>
        )}

        <AnswerField
          answer={answer}
          onAnswer={setAnswer}
          onToggle={toggleMultipleAnswer}
          question={question}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 border-t bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8">
        <Button
          className="min-h-11 w-full sm:w-auto"
          disabled={currentIndex === 0}
          onClick={onPrevious}
          type="button"
          variant="outline"
        >
          <ArrowLeft aria-hidden="true" />
          Previous
        </Button>
        <p aria-live="polite" className="hidden text-sm text-muted-foreground sm:block">
          {isAnswered ? 'Answer saved' : 'You can skip this question and return later'}
        </p>
        <Button className="min-h-11 w-full sm:w-auto" onClick={onNext} type="button">
          {currentIndex === total - 1 ? 'Review answers' : 'Next'}
          {currentIndex === total - 1 ? (
            <Flag aria-hidden="true" />
          ) : (
            <ArrowRight aria-hidden="true" />
          )}
        </Button>
      </div>
    </section>
  )
}

function AnswerField({
  answer,
  onAnswer,
  onToggle,
  question,
}: {
  answer: string | string[] | undefined
  onAnswer: (answer: string | string[]) => void
  onToggle: (optionId: string) => void
  question: TestQuestion
}) {
  if (question.type === 'text') {
    return (
      <div className="mt-7">
        <Label className="mb-2 block text-sm font-medium" htmlFor={`answer-${question.id}`}>
          Your answer
        </Label>
        <Input
          autoComplete="off"
          id={`answer-${question.id}`}
          onChange={(event) => onAnswer(event.target.value)}
          placeholder={question.placeholder}
          value={typeof answer === 'string' ? answer : ''}
        />
      </div>
    )
  }

  const isMultiple = question.type === 'multiple'
  const selectedIds = new Set(Array.isArray(answer) ? answer : answer ? [answer] : [])

  return (
    <div className="mt-7">
      <p className="mb-3 text-sm font-medium text-muted-foreground">
        {isMultiple ? 'Choose all that apply.' : 'Choose one answer.'}
      </p>
      <div
        aria-label="Answer choices"
        className="grid gap-3"
        role={isMultiple ? 'group' : 'radiogroup'}
      >
        {question.options.map((option, index) => {
          const isSelected = selectedIds.has(option.id)

          return (
            <Button
              aria-checked={isSelected}
              className={cn(
                'h-auto min-h-14 justify-start whitespace-normal px-4 py-3 text-left text-base shadow-none',
                isSelected &&
                  'border-primary bg-primary/5 text-foreground ring-2 ring-primary/20 hover:bg-primary/10',
              )}
              key={option.id}
              onClick={() => (isMultiple ? onToggle(option.id) : onAnswer(option.id))}
              role={isMultiple ? 'checkbox' : 'radio'}
              type="button"
              variant="outline"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center border text-sm font-semibold',
                  isMultiple ? 'rounded-md' : 'rounded-full',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background text-muted-foreground',
                )}
              >
                {isSelected && isMultiple ? <Check /> : String.fromCharCode(65 + index)}
              </span>
              <span>{option.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function QuestionNavigator({
  answers,
  currentIndex,
  onSelect,
  questions,
}: {
  answers: TestAnswers
  currentIndex: number
  onSelect: (index: number) => void
  questions: readonly TestQuestion[]
}) {
  const answeredCount = questions.filter((question) =>
    isQuestionAnswered(question, answers[question.id]),
  ).length

  return (
    <aside className="rounded-xl border bg-card p-4 shadow-sm sm:p-5 xl:sticky xl:top-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Questions</h2>
        <span className="text-sm text-muted-foreground">
          {answeredCount}/{questions.length}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2 min-[400px]:grid-cols-6 sm:grid-cols-7 xl:grid-cols-5">
        {questions.map((question, index) => {
          const answered = isQuestionAnswered(question, answers[question.id])
          const active = index === currentIndex

          return (
            <Button
              aria-label={`Question ${index + 1}${answered ? ', answered' : ', unanswered'}`}
              className={cn(
                'h-11 w-full p-0 shadow-none',
                active && 'ring-2 ring-primary ring-offset-2',
              )}
              key={question.id}
              onClick={() => onSelect(index)}
              type="button"
              variant={answered ? 'default' : 'outline'}
            >
              {index + 1}
            </Button>
          )
        })}
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Filled numbers are answered. Your progress is saved in this browser.
      </p>
    </aside>
  )
}

function ReviewScreen({
  answers,
  onBack,
  onSelectQuestion,
  onSubmit,
  questions,
}: {
  answers: TestAnswers
  onBack: () => void
  onSelectQuestion: (index: number) => void
  onSubmit: () => void
  questions: readonly TestQuestion[]
}) {
  const unanswered = questions.filter(
    (question) => !isQuestionAnswered(question, answers[question.id]),
  )

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Final check</p>
          <h2 className="mt-1 text-2xl font-bold">Review your answers</h2>
          <p className="mt-2 text-muted-foreground">
            {unanswered.length === 0
              ? 'Every question has an answer. Submit when you are ready.'
              : `${unanswered.length} question${unanswered.length === 1 ? ' is' : 's are'} unanswered. Unanswered questions score as incorrect.`}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="min-h-11 w-full sm:w-auto"
            onClick={onBack}
            type="button"
            variant="outline"
          >
            <ArrowLeft aria-hidden="true" />
            Back to test
          </Button>
          <Button className="min-h-11 w-full sm:w-auto" onClick={onSubmit} type="button">
            <Flag aria-hidden="true" />
            {unanswered.length > 0 ? `Submit with ${unanswered.length} unanswered` : 'Submit test'}
          </Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-11">
        {questions.map((question, index) => {
          const answered = isQuestionAnswered(question, answers[question.id])
          return (
            <Button
              aria-label={`Go to question ${index + 1}, ${answered ? 'answered' : 'unanswered'}`}
              className="h-11 w-full p-0 shadow-none"
              key={question.id}
              onClick={() => onSelectQuestion(index)}
              type="button"
              variant={answered ? 'default' : 'outline'}
            >
              {index + 1}
            </Button>
          )
        })}
      </div>
    </section>
  )
}

function ResultsScreen({
  answers,
  onRestart,
  questions,
}: {
  answers: TestAnswers
  onRestart: () => void
  questions: readonly TestQuestion[]
}) {
  const score = scoreTest(questions, answers)
  const incorrectQuestions = questions.filter(
    (question) => !isQuestionCorrect(question, answers[question.id]),
  )

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card px-5 py-10 text-center shadow-sm sm:px-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Flag aria-hidden="true" className="h-7 w-7" />
        </span>
        <p className="mt-5 text-sm font-medium text-primary">Test submitted</p>
        <h2 className="mt-1 text-3xl font-bold">{score.percentage}%</h2>
        <p className="mt-2 text-lg">
          {score.correct} of {score.total} questions correct
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          This frontend calculates your score locally. The official passing cutoff and recorded test
          attempt will be connected with the backend.
        </p>
        <Button className="mt-6" onClick={onRestart} type="button" variant="outline">
          <RotateCcw aria-hidden="true" />
          Retake test
        </Button>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold">Answer review</h2>
        <p className="mt-1 text-muted-foreground">
          {incorrectQuestions.length === 0
            ? 'Perfect score—every answer is correct.'
            : `${incorrectQuestions.length} answer${incorrectQuestions.length === 1 ? ' needs' : 's need'} review.`}
        </p>

        <div className="mt-6 space-y-4">
          {questions.map((question) => {
            const correct = isQuestionCorrect(question, answers[question.id])
            return (
              <article className="rounded-lg border p-4" key={question.id}>
                <div className="flex gap-3">
                  {correct ? (
                    <CircleCheck
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    />
                  ) : (
                    <CircleX
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">
                      Question {question.number} · {question.category}
                    </p>
                    <h3 className="mt-1 font-semibold">{question.prompt}</h3>
                    <dl className="mt-3 grid gap-2 text-sm">
                      <div>
                        <dt className="font-medium text-muted-foreground">Your answer</dt>
                        <dd>{getAnswerText(question, answers[question.id])}</dd>
                      </div>
                      {!correct && (
                        <div>
                          <dt className="font-medium text-muted-foreground">Correct answer</dt>
                          <dd>{getCorrectAnswerText(question)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function TestDetail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <span>
        <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="font-semibold">{value}</span>
      </span>
    </div>
  )
}
