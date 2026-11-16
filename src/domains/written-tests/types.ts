export type TestImage = {
  src: string
  alt: string
}

export type TestQuestionOption = {
  label: string
  correct: boolean
}

type TestQuestionBase = {
  title: string
  category: string
  prompt: string
  points: number
  image?: TestImage
}

export type TextTestQuestion = TestQuestionBase & {
  type: 'text'
  acceptedAnswers: string[]
  placeholder: string
}

export type ChoiceTestQuestion = TestQuestionBase & {
  type: 'single' | 'multiple'
  options: TestQuestionOption[]
}

export type StatementTestQuestion = Omit<TestQuestionBase, 'points'> & {
  type: 'statements'
  statements: { prompt: string; correct: boolean; points: number }[]
}

export type TestQuestion = TextTestQuestion | ChoiceTestQuestion | StatementTestQuestion

export type TestDefinition = {
  id: string
  title: string
  description: string
  passingPercentage: number
  questions: readonly TestQuestion[]
}
