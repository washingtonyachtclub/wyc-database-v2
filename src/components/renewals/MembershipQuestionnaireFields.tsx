import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { PlusOneResponse, UwStatus } from '@/domains/renewals/questionnaire'

const UW_STATUS_OPTIONS: { value: UwStatus; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'employee_retiree', label: 'Employee/Retiree' },
  { value: 'public', label: 'Public (none of the above)' },
]

const SPONSOR_OPTIONS: { value: PlusOneResponse; label: string }[] = [
  { value: 'sponsor_yes', label: 'Yes' },
  {
    value: 'sponsor_already',
    label: 'I am already sponsoring a WYC member and can coordinate with them on my own',
  },
  { value: 'sponsor_no', label: 'No' },
]

const SPONSEE_OPTIONS: { value: PlusOneResponse; label: string }[] = [
  { value: 'sponsee_yes', label: 'Yes' },
  {
    value: 'sponsee_already',
    label: "No, I don't need to be paired",
  },
  {
    value: 'sponsee_no_facilities',
    label: 'No, I will not use the WAC docks or facilities',
  },
]

const IMA_PURCHASE_URL = 'https://www.washington.edu/ima/member/'
const IMA_STATUS_DETAILS: Record<UwStatus, string> = {
  student:
    'UW Seattle students who pay the Services and Activities Fee already have a Rec Membership.',
  alumni:
    'Alumni can get a Rec Membership through the Alumni Association or a Plus One Rec Membership (see below).',
  employee_retiree: 'Employees and retirees are eligible to purchase a Rec Membership.',
  public:
    'You need an eligible UW student, employee, or retiree sponsor to get a Plus One Rec Membership. See below to get paired.',
}
const SPONSOR_HELPER =
  'We will pair you with a WYC member via email so you can coordinate a time to visit the IMA together.'
const SPONSEE_HELPER =
  'We will pair you with a WYC member via email so you can coordinate a time to visit the IMA together.'

function ChoiceGroup<T extends string>({
  error,
  helper,
  id,
  label,
  onChange,
  options,
  value,
}: {
  error?: string
  helper?: string
  id?: string
  label: string
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  value: T | null
}) {
  return (
    <div id={id} className="space-y-2">
      <Label className="text-base">{label} *</Label>
      <div className="grid gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={value === option.value ? 'default' : 'outline'}
            onClick={() => onChange(option.value)}
            className="h-auto justify-start whitespace-normal border-2 px-4 py-3 text-left text-base font-normal"
          >
            {option.label}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {helper && <p className="text-sm text-muted-foreground">{helper}</p>}
    </div>
  )
}

export function MembershipQuestionnaireFields({
  errors,
  idPrefix = 'membership',
  onPlusOneChange,
  onUwStatusChange,
  plusOne,
  uwStatus,
}: {
  errors?: {
    plusOne?: string
    uwStatus?: string
  }
  idPrefix?: string
  onPlusOneChange: (value: PlusOneResponse) => void
  onUwStatusChange: (value: UwStatus) => void
  plusOne: PlusOneResponse | null
  uwStatus: UwStatus | null
}) {
  return (
    <>
      <ChoiceGroup
        id={`${idPrefix}-uw-status`}
        error={errors?.uwStatus}
        label="What is your UW status?"
        options={UW_STATUS_OPTIONS}
        value={uwStatus}
        onChange={onUwStatusChange}
      />

      {uwStatus && (
        <p className="text-base">
          An{' '}
          <a
            href={IMA_PURCHASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline"
          >
            Rec Membership
          </a>
          {' is required to use the WAC docks and facilities. '}
          {IMA_STATUS_DETAILS[uwStatus]}
        </p>
      )}

      {(uwStatus === 'student' || uwStatus === 'employee_retiree') && (
        <ChoiceGroup
          id={`${idPrefix}-plus-one`}
          error={errors?.plusOne}
          label="Are you willing to sponsor a WYC member for a Plus One Rec Membership?"
          helper={SPONSOR_HELPER}
          options={SPONSOR_OPTIONS}
          value={plusOne}
          onChange={onPlusOneChange}
        />
      )}

      {(uwStatus === 'alumni' || uwStatus === 'public') && (
        <ChoiceGroup
          id={`${idPrefix}-plus-one`}
          error={errors?.plusOne}
          label="Would you like to be paired with a sponsor for a Plus One Rec Membership?"
          helper={SPONSEE_HELPER}
          options={SPONSEE_OPTIONS}
          value={plusOne}
          onChange={onPlusOneChange}
        />
      )}
    </>
  )
}
