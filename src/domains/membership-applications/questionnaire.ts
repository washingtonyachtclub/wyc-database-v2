import { z } from 'zod'

// Add a frozen completion-form implementation before advancing this version.
export const CURRENT_NEW_MEMBER_QUESTIONNAIRE_VERSION = 'new-member-v1' as const

type QuestionnaireOption = {
  id: string
  label: string
}

type QuestionnaireQuestion = {
  id: string
  label: string
  options?: readonly QuestionnaireOption[]
  showWhen?: { questionId: string; optionId: string }
  type: 'multiple_choice' | 'single_choice' | 'text'
}

type QuestionnaireDefinition = {
  questions: readonly QuestionnaireQuestion[]
  version: string
}

export const residentialStatusOptions = [
  { id: 'domestic_in_state', label: 'Domestic, in-state (U.S.)' },
  { id: 'domestic_out_of_state', label: 'Domestic, out-of-state (U.S.)' },
  { id: 'international', label: 'International' },
] as const

export const studentStatusOptions = [
  { id: 'undergraduate', label: 'Undergraduate student' },
  { id: 'graduate_professional', label: 'Graduate or professional student' },
  { id: 'not_applicable', label: 'Not applicable' },
] as const

export const genderIdentityOptions = [
  { id: 'woman', label: 'Woman' },
  { id: 'man', label: 'Man' },
  { id: 'non_binary', label: 'Non-binary' },
  { id: 'prefer_not_to_say', label: 'Prefer to not say' },
  { id: 'self_describe', label: 'Prefer to self-describe' },
] as const

export const communityOptions = [
  { id: 'bipoc', label: 'Black, Indigenous, or Person of Color (BIPOC)' },
  { id: 'lgbtqia', label: 'LGBTQIA+ (Queer)' },
  { id: 'neurodivergent', label: 'Neurodivergent (e.g., ADHD, autism, dyslexia)' },
  { id: 'physical_chronic_disability', label: 'Having a physical or chronic disability' },
  { id: 'first_generation', label: 'First-generation college student' },
  { id: 'low_income', label: 'From a low-income background' },
  { id: 'none', label: 'None of the above' },
] as const

export const referralSourceOptions = [
  { id: 'friend_member', label: 'Friend or current WYC member' },
  { id: 'uw_event', label: 'UW club fair or campus event' },
  { id: 'uw_listing', label: 'UW, IMA, or student-organization listing' },
  { id: 'wyc_activity', label: 'WYC event or sailing activity' },
  { id: 'web', label: 'Web search or WYC website' },
  { id: 'social_media', label: 'Social media' },
  { id: 'other', label: 'Other' },
] as const

const newMemberQuestionnaireV1 = {
  version: CURRENT_NEW_MEMBER_QUESTIONNAIRE_VERSION,
  questions: [
    {
      id: 'residential_status',
      label: 'Which of the following best describes your residential status?',
      type: 'multiple_choice',
      options: residentialStatusOptions,
    },
    {
      id: 'student_status',
      label: 'Which of the following best describes your student status?',
      type: 'multiple_choice',
      options: studentStatusOptions,
    },
    {
      id: 'gender_identity',
      label: 'Which of the following best describes your gender identity?',
      type: 'multiple_choice',
      options: genderIdentityOptions,
    },
    {
      id: 'gender_self_description',
      label: 'If you would prefer to self-describe:',
      type: 'text',
      showWhen: { questionId: 'gender_identity', optionId: 'self_describe' },
    },
    {
      id: 'communities',
      label: 'Do you identify with any of the following communities or experiences?',
      type: 'multiple_choice',
      options: communityOptions,
    },
    {
      id: 'referral_source',
      label: 'How did you hear about the club?',
      type: 'multiple_choice',
      options: referralSourceOptions,
    },
    {
      id: 'referral_other',
      label: 'How did you hear about the club?',
      type: 'text',
      showWhen: { questionId: 'referral_source', optionId: 'other' },
    },
  ],
} as const satisfies QuestionnaireDefinition

export const newMemberQuestionnaireVersions = {
  [CURRENT_NEW_MEMBER_QUESTIONNAIRE_VERSION]: newMemberQuestionnaireV1,
} as const satisfies Record<string, QuestionnaireDefinition>

export type NewMemberQuestionnaireVersion = keyof typeof newMemberQuestionnaireVersions

const residentialStatusIds = residentialStatusOptions.map((option) => option.id) as [
  (typeof residentialStatusOptions)[number]['id'],
  ...(typeof residentialStatusOptions)[number]['id'][],
]
const studentStatusIds = studentStatusOptions.map((option) => option.id) as [
  (typeof studentStatusOptions)[number]['id'],
  ...(typeof studentStatusOptions)[number]['id'][],
]
const genderIdentityIds = genderIdentityOptions.map((option) => option.id) as [
  (typeof genderIdentityOptions)[number]['id'],
  ...(typeof genderIdentityOptions)[number]['id'][],
]
const communityIds = communityOptions.map((option) => option.id) as [
  (typeof communityOptions)[number]['id'],
  ...(typeof communityOptions)[number]['id'][],
]
const referralSourceIds = referralSourceOptions.map((option) => option.id) as [
  (typeof referralSourceOptions)[number]['id'],
  ...(typeof referralSourceOptions)[number]['id'][],
]

const newMemberQuestionnaireV1InputSchema = z
  .object({
    residential_status: z
      .array(z.enum(residentialStatusIds))
      .max(residentialStatusOptions.length)
      .optional(),
    student_status: z.array(z.enum(studentStatusIds)).max(studentStatusOptions.length).optional(),
    gender_identity: z
      .array(z.enum(genderIdentityIds))
      .max(genderIdentityOptions.length)
      .optional(),
    gender_self_description: z.string().trim().max(200).optional(),
    communities: z.array(z.enum(communityIds)).max(communityOptions.length).optional(),
    referral_source: z
      .array(z.enum(referralSourceIds))
      .max(referralSourceOptions.length)
      .optional(),
    referral_other: z.string().trim().max(300).optional(),
  })
  .strict()
  .superRefine((responses, context) => {
    if (
      responses.gender_identity?.includes('self_describe') &&
      !responses.gender_self_description
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Please describe your gender identity.',
        path: ['gender_self_description'],
      })
    }
    if (
      !responses.gender_identity?.includes('self_describe') &&
      responses.gender_self_description
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The self-description does not apply to the selected gender identity.',
        path: ['gender_self_description'],
      })
    }
    if (responses.referral_source?.includes('other') && !responses.referral_other) {
      context.addIssue({
        code: 'custom',
        message: 'Please enter how you heard about the club.',
        path: ['referral_other'],
      })
    }
    if (!responses.referral_source?.includes('other') && responses.referral_other) {
      context.addIssue({
        code: 'custom',
        message: 'The referral description does not apply to the selected source.',
        path: ['referral_other'],
      })
    }

    const exclusiveOptions = [
      ['student_status', responses.student_status, 'not_applicable'],
      ['gender_identity', responses.gender_identity, 'prefer_not_to_say'],
      ['communities', responses.communities, 'none'],
    ] as const
    for (const [path, values, exclusive] of exclusiveOptions) {
      if ((values?.length ?? 0) > 1 && values?.includes(exclusive as never)) {
        context.addIssue({
          code: 'custom',
          message: 'This option cannot be selected with another option.',
          path: [path],
        })
      }
    }

    const multipleChoiceResponses = [
      ['residential_status', responses.residential_status],
      ['student_status', responses.student_status],
      ['gender_identity', responses.gender_identity],
      ['communities', responses.communities],
      ['referral_source', responses.referral_source],
    ] as const
    for (const [path, values] of multipleChoiceResponses) {
      if (values && new Set(values).size !== values.length) {
        context.addIssue({
          code: 'custom',
          message: 'An option cannot be selected more than once.',
          path: [path],
        })
      }
    }
  })

export type NewMemberQuestionnaireInput = z.input<typeof newMemberQuestionnaireV1InputSchema>

export type NewMemberQuestionnaireAnswer =
  | {
      questionId: string
      questionLabel: string
      selectedOption: QuestionnaireOption
      type: 'single_choice'
    }
  | {
      questionId: string
      questionLabel: string
      selectedOptions: QuestionnaireOption[]
      type: 'multiple_choice'
    }
  | {
      questionId: string
      questionLabel: string
      type: 'text'
      value: string
    }

export type NewMemberQuestionnaireSnapshot = {
  answers: NewMemberQuestionnaireAnswer[]
  version: NewMemberQuestionnaireVersion
}

export function getNewMemberQuestionnaire(version: NewMemberQuestionnaireVersion) {
  return newMemberQuestionnaireVersions[version]
}

function selectedOption(options: readonly QuestionnaireOption[], id: string): QuestionnaireOption {
  const option = options.find((candidate) => candidate.id === id)
  if (!option) throw new Error('Invalid questionnaire option')
  return option
}

export function parseNewMemberQuestionnaire(
  version: NewMemberQuestionnaireVersion,
  input: unknown,
): NewMemberQuestionnaireSnapshot {
  const responses: Record<string, unknown> = (() => {
    switch (version) {
      case 'new-member-v1':
        return newMemberQuestionnaireV1InputSchema.parse(input)
    }
  })()
  const answers: NewMemberQuestionnaireAnswer[] = []

  const definition: QuestionnaireDefinition = getNewMemberQuestionnaire(version)
  for (const question of definition.questions) {
    const value = responses[question.id]
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0))
      continue

    if (question.type === 'single_choice') {
      answers.push({
        questionId: question.id,
        questionLabel: question.label,
        selectedOption: selectedOption(question.options!, value as string),
        type: question.type,
      })
    } else if (question.type === 'multiple_choice') {
      answers.push({
        questionId: question.id,
        questionLabel: question.label,
        selectedOptions: (value as string[]).map((id) => selectedOption(question.options!, id)),
        type: question.type,
      })
    } else {
      answers.push({
        questionId: question.id,
        questionLabel: question.label,
        type: question.type,
        value: value as string,
      })
    }
  }

  return { answers, version }
}
