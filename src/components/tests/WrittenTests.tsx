import { submitWrittenTest, validateTestExaminer } from '@/domains/written-tests/server-fns'
import type { SavedTestResult } from '@/domains/written-tests/schema'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  CircleX,
  Flag,
  ListChecks,
  RotateCcw,
  Sailboat,
} from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isDevEnvironment } from '@/lib/env'
import { cn } from '@/lib/utils'
import type { TestDefinition, TestQuestion } from '@/domains/written-tests/types'
import { writtenTests, getTestFingerprint } from '@/domains/written-tests/registry'
import {
  getAnswerText,
  getCorrectAnswerText,
  isQuestionAnswered,
  getQuestionPoints,
  getPossiblePoints,
  isStatementAnswers,
  isDevelopmentAnswer,
  type TestAnswer,
  type TestAnswers,
} from './dinghy-test-utils'

type TestMode = 'practice' | 'final'
type TestStage = 'catalog' | 'mode' | 'taking' | 'review' | 'results'
type TestAttempt = {
  attemptId: string
  testId: string
  fingerprint: string
  mode: TestMode
  memberWycNumber: number
  examinerWycNumber: number | null
}

export function WrittenTests({ memberWycNumber }: { memberWycNumber: number }) {
  const [test, setTest] = useState<TestDefinition | null>(null)
  if (!test) return <TestCatalog onSelect={setTest} />
  return (
    <WrittenTestAttempt
      key={test.id}
      memberWycNumber={memberWycNumber}
      test={test}
      onChooseTest={() => setTest(null)}
    />
  )
}

function WrittenTestAttempt({
  memberWycNumber,
  test,
  onChooseTest,
}: {
  memberWycNumber: number
  test: TestDefinition
  onChooseTest: () => void
}) {
  const questions = test.questions
  const fingerprint = getTestFingerprint(test)
  const storageKey = `wyc-written-test-${memberWycNumber}-${test.id}`
  const [answers, setAnswers] = useState<TestAnswers>({})
  const [attempt, setAttempt] = useState<TestAttempt | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stage, setStage] = useState<TestStage>('mode')
  const [returnToReview, setReturnToReview] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [saveError, setSaveError] = useState('')
  const [savedResult, setSavedResult] = useState<SavedTestResult | null>(null)

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(storageKey)
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as {
          answers?: TestAnswers
          attempt?: TestAttempt
          currentIndex?: number
        }
        if (
          parsed.attempt?.memberWycNumber === memberWycNumber &&
          parsed.attempt.testId === test.id &&
          parsed.attempt.fingerprint === fingerprint
        ) {
          setAnswers(parsed.answers ?? {})
          setAttempt({
            ...parsed.attempt,
            attemptId: parsed.attempt.attemptId ?? crypto.randomUUID(),
          })
          setCurrentIndex(Math.min(Math.max(parsed.currentIndex ?? 0, 0), questions.length - 1))
          setStage('taking')
        }
      }
    } catch (error) {
      console.warn('Unable to restore the saved test draft', error)
    } finally {
      setDraftLoaded(true)
    }
  }, [memberWycNumber, questions.length, fingerprint, storageKey, test.id])

  useEffect(() => {
    if (!draftLoaded || !attempt || (stage !== 'taking' && stage !== 'review')) return
    window.localStorage.setItem(storageKey, JSON.stringify({ answers, attempt, currentIndex }))
  }, [answers, attempt, currentIndex, draftLoaded, stage, storageKey])

  const answeredCount = useMemo(
    () =>
      questions.filter((question, index) => isQuestionAnswered(question, answers[index])).length,
    [answers, questions],
  )

  const startTest = (mode: TestMode, examinerWycNumber: number | null) => {
    setAnswers({})
    setSaveError('')
    setSavedResult(null)
    setAttempt({
      attemptId: crypto.randomUUID(),
      testId: test.id,
      fingerprint,
      mode,
      memberWycNumber,
      examinerWycNumber,
    })
    setCurrentIndex(0)
    setReturnToReview(false)
    setStage('taking')
  }

  const fillWithDevAnswer = () => {
    setAnswers(Object.fromEntries(questions.map((_, index) => [index, 'devtest'])))
  }

  const goToQuestion = (index: number, fromReview = false) => {
    setCurrentIndex(index)
    setReturnToReview(fromReview)
    setStage('taking')
  }

  const submitTest = async () => {
    if (!attempt || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setSaveError('')
    try {
      const response = await submitWrittenTest({ data: { ...attempt, answers } })
      if (!response.result) {
        setSaveError(response.error)
        return
      }
      setSavedResult(response.result)
      setAnswers(response.result.answers)
      setStage('results')
      setReturnToReview(false)
      try {
        window.localStorage.removeItem(storageKey)
      } catch (error) {
        console.warn('Unable to clear the saved test draft', error)
      }
    } catch {
      setSaveError('Unable to save test. Your answers are retained. Please try again.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const resetAttempt = (nextStage: TestStage) => {
    setAnswers({})
    setAttempt(null)
    setCurrentIndex(0)
    setReturnToReview(false)
    setStage(nextStage)
    window.localStorage.removeItem(storageKey)
    if (nextStage === 'catalog') onChooseTest()
  }

  if (stage === 'mode') {
    return (
      <ModeSelection
        test={test}
        memberWycNumber={memberWycNumber}
        onBack={onChooseTest}
        onStart={startTest}
      />
    )
  }

  if (!attempt) return null

  const currentQuestion = questions[currentIndex]

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <TestHeader
        test={
          savedResult
            ? { ...test, title: savedResult.title, questions: savedResult.questions }
            : test
        }
        answeredCount={answeredCount}
        attempt={attempt}
        onExit={
          !saving && (stage === 'taking' || stage === 'review')
            ? () => resetAttempt('mode')
            : undefined
        }
        onFill={saving ? undefined : fillWithDevAnswer}
      />

      {stage === 'taking' && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <QuestionCard
            answer={answers[currentIndex]}
            currentIndex={currentIndex}
            onAnswer={(answer) => setAnswers((current) => ({ ...current, [currentIndex]: answer }))}
            onBackToReview={returnToReview ? () => setStage('review') : undefined}
            onNext={() => {
              if (currentIndex === questions.length - 1) {
                setReturnToReview(false)
                setStage('review')
              } else {
                goToQuestion(currentIndex + 1, returnToReview)
              }
            }}
            onPrevious={() => goToQuestion(currentIndex - 1, returnToReview)}
            question={currentQuestion}
            total={questions.length}
          />
          <QuestionNavigator
            answers={answers}
            currentIndex={currentIndex}
            onSelect={(index) => goToQuestion(index, returnToReview)}
            questions={questions}
          />
        </div>
      )}

      {stage === 'review' && (
        <ReviewScreen
          answers={answers}
          onSelectQuestion={(index) => goToQuestion(index, true)}
          onSubmit={submitTest}
          saving={saving}
          saveError={saveError}
          questions={questions}
        />
      )}

      {stage === 'results' && savedResult && (
        <ResultsScreen
          result={savedResult}
          answers={answers}
          attempt={attempt}
          onChooseTest={() => resetAttempt('catalog')}
          onRetake={() => resetAttempt('mode')}
          questions={savedResult.questions}
        />
      )}
    </div>
  )
}

function TestCatalog({ onSelect }: { onSelect: (test: TestDefinition) => void }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Written Tests</h1>
      </div>

      <div className="space-y-4">
        {writtenTests.map((test) => (
          <Button
            key={test.id}
            aria-label={`Choose ${test.title}`}
            className="h-auto w-full cursor-pointer flex-col items-start gap-0 whitespace-normal rounded-xl bg-card p-6 text-left text-base font-normal text-card-foreground shadow-sm transition-[background-color,border-color,box-shadow,transform] hover:border-primary/40 hover:shadow-inner active:scale-[0.99] active:shadow-inner motion-reduce:transform-none motion-reduce:transition-none sm:p-8"
            onClick={() => onSelect(test)}
            type="button"
            variant="outline"
          >
            <span className="text-2xl font-bold">{test.title}</span>
            <span className="mt-2 max-w-2xl text-muted-foreground">{test.description}</span>
            <span className="mt-4 text-sm font-medium">
              {test.questions.length} questions · {getPossiblePoints(test.questions)} points
            </span>
          </Button>
        ))}
      </div>
    </main>
  )
}

function ModeSelection({
  test,
  memberWycNumber,
  onBack,
  onStart,
}: {
  test: TestDefinition
  memberWycNumber: number
  onBack: () => void
  onStart: (mode: TestMode, examinerWycNumber: number | null) => void
}) {
  const [examinerInput, setExaminerInput] = useState('')
  const [examinerError, setExaminerError] = useState('')
  const [checking, setChecking] = useState(false)
  const checkingRef = useRef(false)

  const startFinal = async () => {
    if (checkingRef.current) return
    const examinerWycNumber = Number(examinerInput)
    if (!Number.isInteger(examinerWycNumber) || examinerWycNumber <= 0) {
      setExaminerError('Enter the WYC ID of the examiner who is present.')
      return
    }
    checkingRef.current = true
    setChecking(true)
    setExaminerError('')
    try {
      const { valid } = await validateTestExaminer({ data: examinerWycNumber })
      if (!valid) {
        setExaminerError('No member exists with that WYC ID.')
        return
      }
      onStart('final', examinerWycNumber)
    } catch {
      setExaminerError('Unable to check examiner. Please try again.')
    } finally {
      checkingRef.current = false
      setChecking(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Button disabled={checking} onClick={onBack} type="button" variant="ghost">
        <ArrowLeft aria-hidden="true" />
        All tests
      </Button>
      <div className="mt-6">
        <p className="text-sm font-medium text-primary">{test.title}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Choose a mode</h1>
        <p className="mt-2 text-muted-foreground">Taking as WYC #{memberWycNumber}</p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className="flex flex-col rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold">Practice</h2>
          <p className="mt-2 flex-1 text-muted-foreground">
            Take the complete test and review the correct answers after submitting.
          </p>
          <Button
            className="mt-6 min-h-11"
            disabled={checking}
            onClick={() => onStart('practice', null)}
            type="button"
          >
            Start practice
          </Button>
        </section>

        <section className="flex flex-col rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold">Final test</h2>
          <p className="mt-2 text-muted-foreground">
            A Ratings Examiner or Chief must be physically present while you take the test.
          </p>
          <div className="mt-5">
            <Label htmlFor="examiner-wyc-number">Examiner WYC ID</Label>
            <Input
              aria-describedby={examinerError ? 'examiner-error' : undefined}
              aria-invalid={Boolean(examinerError)}
              className="mt-2"
              id="examiner-wyc-number"
              disabled={checking}
              inputMode="numeric"
              onChange={(event) => {
                setExaminerInput(event.target.value)
                setExaminerError('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') startFinal()
              }}
              value={examinerInput}
            />
            {examinerError && (
              <p className="mt-2 text-sm text-destructive" id="examiner-error">
                {examinerError}
              </p>
            )}
          </div>
          <Button className="mt-6 min-h-11" disabled={checking} onClick={startFinal} type="button">
            {checking ? 'Checking…' : 'Start final test'}
          </Button>
        </section>
      </div>
    </main>
  )
}

function TestHeader({
  test,
  answeredCount,
  attempt,
  onExit,
  onFill,
}: {
  test: TestDefinition
  answeredCount: number
  attempt: TestAttempt
  onExit?: () => void
  onFill?: () => void
}) {
  return (
    <>
      <div className="mb-6 sm:mb-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sailboat aria-hidden="true" className="h-4 w-4" />
            {attempt.mode === 'practice' ? 'Practice' : 'Final test'}
          </div>
          {onExit && <ExitAttemptButton onExit={onExit} />}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{test.title}</h1>
        {isDevEnvironment() && onFill && (
          <Button className="mt-4" onClick={onFill} size="sm" type="button" variant="outline">
            Fill with devtest
          </Button>
        )}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <TestDetail
          icon={<ListChecks aria-hidden="true" />}
          label="Total"
          value={`${test.questions.length} questions · ${getPossiblePoints(test.questions)} points`}
        />
        <TestDetail
          icon={<Check aria-hidden="true" />}
          label="Answered"
          value={`${answeredCount} of ${test.questions.length}`}
        />
      </div>
    </>
  )
}

function ExitAttemptButton({ onExit }: { onExit: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          Exit attempt
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Exit this attempt?</AlertDialogTitle>
          <AlertDialogDescription>Your answers will be discarded.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onExit}
          >
            Exit attempt
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function QuestionCard({
  answer,
  currentIndex,
  onAnswer,
  onBackToReview,
  onNext,
  onPrevious,
  question,
  total,
}: {
  answer: TestAnswer | undefined
  currentIndex: number
  onAnswer: (answer: TestAnswer) => void
  onBackToReview?: () => void
  onNext: () => void
  onPrevious: () => void
  question: TestQuestion
  total: number
}) {
  const answerChoicesRef = useRef<HTMLDivElement>(null)
  const isAnswered = isQuestionAnswered(question, answer)

  const selectOption = (optionIndex: number) => {
    if (question.type === 'text' || question.type === 'statements') return
    if (question.type === 'multiple') {
      const selected = new Set(Array.isArray(answer) ? answer : [])
      if (selected.has(optionIndex)) selected.delete(optionIndex)
      else selected.add(optionIndex)
      onAnswer([...selected])
      return
    }
    onAnswer(optionIndex)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTextInput =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement

      if (event.key === 'Enter' && target?.tagName !== 'BUTTON') {
        event.preventDefault()
        onNext()
        return
      }

      if (
        question.type === 'text' ||
        question.type === 'statements' ||
        isTextInput ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return
      }

      const letterIndex = event.key.toLowerCase().charCodeAt(0) - 97
      if (event.key.length === 1 && letterIndex >= 0 && letterIndex < question.options.length) {
        event.preventDefault()
        selectOption(letterIndex)
        answerChoicesRef.current?.querySelectorAll('button')[letterIndex]?.focus()
        return
      }

      if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return
      event.preventDefault()
      const buttons = [...(answerChoicesRef.current?.querySelectorAll('button') ?? [])]
      const focusedIndex = buttons.findIndex((button) => button === document.activeElement)
      const selectedIndex = typeof answer === 'number' ? answer : 0
      const currentOptionIndex = focusedIndex >= 0 ? focusedIndex : selectedIndex
      const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1
      const nextIndex =
        (currentOptionIndex + direction + question.options.length) % question.options.length
      buttons[nextIndex]?.focus()
      if (question.type === 'single') onAnswer(nextIndex)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [answer, onAnswer, onNext, question])

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <QuestionHeading currentIndex={currentIndex} question={question} total={total} />
      <QuestionContent question={question}>
        <AnswerField
          answer={answer}
          answerChoicesRef={answerChoicesRef}
          onAnswer={onAnswer}
          onSelectOption={selectOption}
          question={question}
          questionIndex={currentIndex}
        />
      </QuestionContent>

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
        {onBackToReview ? (
          <Button
            className="min-h-11 w-full sm:w-auto"
            onClick={onBackToReview}
            type="button"
            variant="outline"
          >
            Back to review
          </Button>
        ) : (
          <p aria-live="polite" className="hidden text-sm text-muted-foreground sm:block">
            {isAnswered ? 'Answer saved' : 'Not answered'}
          </p>
        )}
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

function QuestionHeading({
  currentIndex,
  question,
  total,
}: {
  currentIndex: number
  question: TestQuestion
  total: number
}) {
  const positionProgress = ((currentIndex + 1) / total) * 100

  return (
    <div className="border-b bg-muted/40 px-5 py-4 sm:px-8">
      <div className="mb-3 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span className="font-semibold">
          Question {currentIndex + 1} of {total} · {getQuestionPoints(question)}{' '}
          {getQuestionPoints(question) === 1 ? 'point' : 'points'}
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
  )
}

function QuestionContent({
  children,
  question,
}: {
  children: React.ReactNode
  question: TestQuestion
}) {
  return (
    <div className="px-5 py-7 sm:px-8 sm:py-9">
      <p className="mb-2 text-sm font-medium text-muted-foreground">{question.title}</p>
      <h2 className="break-words text-xl font-semibold leading-8 sm:text-2xl">{question.prompt}</h2>
      {question.image && (
        <div className="mt-6 overflow-hidden rounded-lg border bg-white p-3">
          <img
            alt={question.image.alt}
            className="mx-auto max-h-[32rem] w-auto max-w-full object-contain"
            src={question.image.src}
          />
        </div>
      )}
      {children}
    </div>
  )
}

function AnswerField({
  answer,
  answerChoicesRef,
  onAnswer,
  onSelectOption,
  question,
  questionIndex,
}: {
  answer: TestAnswer | undefined
  answerChoicesRef: React.RefObject<HTMLDivElement | null>
  onAnswer: (answer: TestAnswer) => void
  onSelectOption: (optionIndex: number) => void
  question: TestQuestion
  questionIndex: number
}) {
  if (question.type === 'statements') {
    return (
      <div className="mt-7 space-y-5">
        {question.statements.map((statement, index) => {
          const selected = isStatementAnswers(answer) ? answer[index] : undefined
          return (
            <fieldset key={index} className="rounded-lg border p-4">
              <legend className="px-1 text-sm font-medium">
                {index + 1} · {statement.points} {statement.points === 1 ? 'point' : 'points'}
              </legend>
              <p id={`statement-${questionIndex}-${index}`} className="mb-3">
                {statement.prompt}
              </p>
              <div
                role="radiogroup"
                aria-labelledby={`statement-${questionIndex}-${index}`}
                className="flex gap-3"
              >
                {[true, false].map((value) => (
                  <Button
                    key={String(value)}
                    type="button"
                    role="radio"
                    aria-checked={selected === value}
                    variant={selected === value ? 'default' : 'outline'}
                    className="min-h-11 min-w-20"
                    tabIndex={
                      selected === undefined ? (value ? 0 : -1) : selected === value ? 0 : -1
                    }
                    onKeyDown={(event) => {
                      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
                        return
                      event.preventDefault()
                      onAnswer({ ...(isStatementAnswers(answer) ? answer : {}), [index]: !value })
                      const buttons = event.currentTarget.parentElement?.querySelectorAll('button')
                      buttons?.[value ? 1 : 0]?.focus()
                    }}
                    onClick={() =>
                      onAnswer({ ...(isStatementAnswers(answer) ? answer : {}), [index]: value })
                    }
                  >
                    {value ? 'True' : 'False'}
                  </Button>
                ))}
              </div>
            </fieldset>
          )
        })}
      </div>
    )
  }
  if (question.type === 'text') {
    return (
      <div className="mt-7">
        <Label className="mb-2 block text-sm font-medium" htmlFor={`answer-${questionIndex}`}>
          Your answer
        </Label>
        <Input
          autoComplete="off"
          id={`answer-${questionIndex}`}
          onChange={(event) => onAnswer(event.target.value)}
          placeholder={question.placeholder}
          value={typeof answer === 'string' ? answer : ''}
        />
      </div>
    )
  }

  const isMultiple = question.type === 'multiple'
  const selectedIndices = new Set(
    Array.isArray(answer) ? answer : typeof answer === 'number' ? [answer] : [],
  )

  return (
    <div className="mt-7">
      <p className="mb-3 text-sm font-medium text-muted-foreground">
        {isMultiple ? 'Choose all that apply.' : 'Choose one answer.'}
      </p>
      <div
        aria-label="Answer choices"
        className="grid gap-3"
        ref={answerChoicesRef}
        role={isMultiple ? 'group' : 'radiogroup'}
      >
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedIndices.has(optionIndex)
          return (
            <Button
              aria-checked={isSelected}
              className={cn(
                'h-auto min-h-14 justify-start whitespace-normal px-4 py-3 text-left text-base shadow-none',
                isSelected &&
                  'border-primary bg-primary/5 text-foreground ring-2 ring-primary/20 hover:bg-primary/10',
              )}
              key={optionIndex}
              onClick={() => onSelectOption(optionIndex)}
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
                {isSelected && isMultiple ? <Check /> : String.fromCharCode(65 + optionIndex)}
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
  const categories = groupQuestionIndicesByCategory(questions)
  const answeredCount = questions.filter((question, index) =>
    isQuestionAnswered(question, answers[index]),
  ).length

  return (
    <aside className="rounded-xl border bg-card p-4 shadow-sm sm:p-5 xl:sticky xl:top-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Questions</h2>
        <span className="text-sm text-muted-foreground">
          {answeredCount}/{questions.length}
        </span>
      </div>
      <div className="mt-4 space-y-4">
        {categories.map(([category, indices]) => (
          <section key={category}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {category}
            </h3>
            <div className="grid grid-cols-5 gap-2 min-[400px]:grid-cols-6 sm:grid-cols-7 xl:grid-cols-5">
              {indices.map((index) => {
                const answered = isQuestionAnswered(questions[index], answers[index])
                return (
                  <Button
                    aria-label={`Question ${index + 1}, ${answered ? 'answered' : 'unanswered'}`}
                    className={cn(
                      'h-11 w-full p-0 shadow-none',
                      index === currentIndex && 'ring-2 ring-primary ring-offset-2',
                    )}
                    key={index}
                    onClick={() => onSelect(index)}
                    type="button"
                    variant={answered ? 'default' : 'outline'}
                  >
                    {index + 1}
                  </Button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  )
}

function ReviewScreen({
  answers,
  onSelectQuestion,
  onSubmit,
  saving,
  saveError,
  questions,
}: {
  answers: TestAnswers
  onSelectQuestion: (index: number) => void
  onSubmit: () => void
  saving: boolean
  saveError: string
  questions: readonly TestQuestion[]
}) {
  const unansweredCount = questions.filter(
    (question, index) => !isQuestionAnswered(question, answers[index]),
  ).length
  const categories = groupQuestionIndicesByCategory(questions)

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Final check</p>
          <h2 className="mt-1 text-2xl font-bold">Review your answers</h2>
          <p className="mt-2 text-muted-foreground">
            {unansweredCount === 0
              ? 'Every question has an answer. Submit when you are ready.'
              : `${unansweredCount} question${unansweredCount === 1 ? ' is' : 's are'} unanswered. Unanswered questions score as incorrect.`}
          </p>
        </div>
        <Button className="min-h-11" disabled={saving} onClick={onSubmit} type="button">
          <Flag aria-hidden="true" />
          {saving
            ? 'Saving…'
            : unansweredCount > 0
              ? `Submit with ${unansweredCount} unanswered`
              : 'Submit test'}
        </Button>
      </div>

      {saveError && (
        <p role="alert" className="mt-4 text-destructive">
          {saveError}
        </p>
      )}
      <div className="mt-8 space-y-8">
        {categories.map(([category, indices]) => (
          <section key={category}>
            <h3 className="text-lg font-bold">{category}</h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {indices.map((index) => {
                const answered = isQuestionAnswered(questions[index], answers[index])
                return (
                  <Button
                    className="h-auto min-h-16 justify-start whitespace-normal px-4 py-3 text-left shadow-none"
                    key={index}
                    disabled={saving}
                    onClick={() => onSelectQuestion(index)}
                    type="button"
                    variant="outline"
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                          answered
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-input bg-background text-muted-foreground',
                        )}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 font-medium">{questions[index].prompt}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {answered ? 'Answered' : 'Not answered'}
                        </span>
                      </span>
                    </span>
                  </Button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}

function ResultsScreen({
  result,
  answers,
  attempt,
  onChooseTest,
  onRetake,
  questions,
}: {
  answers: TestAnswers
  attempt: TestAttempt
  result: SavedTestResult
  onChooseTest: () => void
  onRetake: () => void
  questions: readonly TestQuestion[]
}) {
  const score = result.score
  const scoredQuestionIndices = questions.map((_, index) => ({
    correct: result.correctAnswers[index],
    index,
  }))
  const answerSections = [
    {
      title: 'Incorrect Answers',
      questions: scoredQuestionIndices.filter(({ correct }) => !correct),
    },
    {
      title: 'Correct Answers',
      questions: scoredQuestionIndices.filter(({ correct }) => correct),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card px-5 py-10 text-center shadow-sm sm:px-8">
        <span
          className={cn(
            'mx-auto flex h-14 w-14 items-center justify-center rounded-full',
            score.passed ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
          )}
        >
          {score.passed ? (
            <CircleCheck aria-hidden="true" className="h-7 w-7" />
          ) : (
            <CircleX aria-hidden="true" className="h-7 w-7" />
          )}
        </span>
        <p className="mt-5 text-sm font-medium text-muted-foreground">
          {attempt.mode === 'practice' ? 'Practice complete' : 'Final test submitted'}
        </p>
        <h2 className={cn('mt-1 text-3xl font-bold', !score.passed && 'text-destructive')}>
          {score.passed ? 'Passed' : 'Not passed'}
        </h2>
        <p className="mt-3 text-2xl font-semibold">{score.percentage}%</p>
        <p className="mt-1 text-muted-foreground">
          {score.earnedPoints} / {score.possiblePoints} points · {score.passingPercentage}% required
          to pass
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={onRetake} type="button" variant="outline">
            <RotateCcw aria-hidden="true" />
            Retake test
          </Button>
          <Button onClick={onChooseTest} type="button" variant="outline">
            Choose another test
          </Button>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold">Answer review</h2>
        <div className="mt-6 space-y-8">
          {answerSections.map(
            (section) =>
              section.questions.length > 0 && (
                <section key={section.title}>
                  <h3 className="text-lg font-bold">{section.title}</h3>
                  <div className="mt-4 space-y-5">
                    {section.questions.map(({ correct, index }) => (
                      <ReadOnlyQuestionCard
                        answer={answers[index]}
                        correct={correct}
                        earnedPoints={result.earnedPoints[index]}
                        key={index}
                        question={questions[index]}
                        questionIndex={index}
                        revealCorrectAnswer={attempt.mode === 'practice'}
                        total={questions.length}
                      />
                    ))}
                  </div>
                </section>
              ),
          )}
        </div>
      </section>
    </div>
  )
}

function ReadOnlyQuestionCard({
  answer,
  correct,
  question,
  questionIndex,
  revealCorrectAnswer,
  earnedPoints,
  total,
}: {
  answer: TestAnswer | undefined
  correct: boolean
  question: TestQuestion
  questionIndex: number
  revealCorrectAnswer: boolean
  earnedPoints: number
  total: number
}) {
  return (
    <article className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <QuestionHeading currentIndex={questionIndex} question={question} total={total} />
      <QuestionContent question={question}>
        <div className="mt-7 rounded-lg border p-4">
          <div className="flex items-center gap-2 font-semibold">
            {correct ? (
              <CircleCheck aria-hidden="true" className="h-5 w-5 text-primary" />
            ) : (
              <CircleX aria-hidden="true" className="h-5 w-5 text-destructive" />
            )}
            {correct ? 'Correct' : earnedPoints > 0 ? 'Partially correct' : 'Incorrect'}
            <span className="ml-auto text-sm font-medium">
              {earnedPoints} / {getQuestionPoints(question)} points
            </span>
          </div>
          {question.type === 'statements' ? (
            <div className="mt-4 space-y-4">
              {question.statements.map((statement, index) => {
                const selected = isStatementAnswers(answer) ? answer[index] : undefined
                const statementCorrect =
                  isDevelopmentAnswer(answer) || selected === statement.correct
                return (
                  <div key={index} className="border-t pt-4 text-sm">
                    <p className="font-medium">{statement.prompt}</p>
                    <p className="mt-1">
                      Your answer:{' '}
                      {isDevelopmentAnswer(answer)
                        ? 'devtest'
                        : selected === undefined
                          ? 'Not answered'
                          : selected
                            ? 'True'
                            : 'False'}{' '}
                      · {statementCorrect ? statement.points : 0} / {statement.points} points
                    </p>
                    {revealCorrectAnswer && !statementCorrect && (
                      <p className="mt-1 text-muted-foreground">
                        Correct answer: {statement.correct ? 'True' : 'False'}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Your answer</dt>
                <dd className="mt-1">{getAnswerText(question, answer)}</dd>
              </div>
              {revealCorrectAnswer && !correct && (
                <div>
                  <dt className="font-medium text-muted-foreground">Correct answer</dt>
                  <dd className="mt-1">{getCorrectAnswerText(question)}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </QuestionContent>
    </article>
  )
}

function groupQuestionIndicesByCategory(questions: readonly TestQuestion[]) {
  const groups = new Map<string, number[]>()
  questions.forEach((question, index) => {
    groups.set(question.category, [...(groups.get(question.category) ?? []), index])
  })
  return [...groups.entries()]
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
