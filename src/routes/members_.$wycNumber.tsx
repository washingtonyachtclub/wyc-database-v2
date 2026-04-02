import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { MemberCheckoutsSection } from '@/components/members/MemberCheckoutsSection'
import { MemberLessonsSection } from '@/components/members/MemberLessonsSection'
import { MemberPositionsSection } from '@/components/members/MemberPositionsSection'
import { MemberRatingsGivenSection } from '@/components/members/MemberRatingsGivenSection'
import { MemberRatingsSection } from '@/components/members/MemberRatingsSection'
import { Button } from '@/components/ui/button'
import { MemberProfileUpdate, MemberProfileUpdateSchema } from '@/domains/members/schema'
import type { Member } from '@/domains/members/schema'
import { useAppForm } from '@/hooks/form'
import { isMembershipActive } from '@/db/membership-utils'
import { getCurrentQuarterQueryOptions } from '@/domains/lessons/query-options'
import { cn } from '@/lib/utils'
import {
  getCategoriesQueryOptions,
  getMemberByIdQueryOptions,
  getMemberLessonsSignedUpQueryOptions,
  getMemberLessonsTaughtQueryOptions,
  getQuartersQueryOptions,
  useUpdateMemberProfileMutation,
} from '@/domains/members/query-options'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense, useMemo, useState } from 'react'
import { useCurrentUser } from '@/lib/auth/auth-query-options'
import { hasPrivilege } from '../lib/permissions'

export const Route = createFileRoute('/members_/$wycNumber')({
  beforeLoad: ({ context, params }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
    const isOwnProfile = context.user?.wycNumber === Number(params.wycNumber)
    if (!isOwnProfile && !hasPrivilege(context.privileges, ['db'])) {
      throw redirect({ to: '/forbidden' })
    }
  },
  component: MemberDetailPage,
})

function memberToDefaults(member: Member): MemberProfileUpdate {
  const { wycNumber, joinDate, ...rest } = member
  return rest
}

function useTwelveMonthsAgo() {
  return useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    return d.toISOString().slice(0, 10)
  }, [])
}

function ShowAllToggle({
  showAll,
  onToggle,
}: {
  showAll: boolean
  onToggle: (value: boolean) => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-sm h-auto py-0.5 px-2"
      onClick={() => onToggle(!showAll)}
    >
      {showAll ? 'Past 12 Months' : 'Show All'}
    </Button>
  )
}

function MemberDetailPage() {
  const { wycNumber } = Route.useParams()
  const { data: member } = useSuspenseQuery(getMemberByIdQueryOptions(Number(wycNumber)))
  const { privileges } = useCurrentUser()
  const hasDb = hasPrivilege(privileges, ['db'])
  const since = useTwelveMonthsAgo()
  const [isEditing, setIsEditing] = useState(false)
  const [showAllRatingsGiven, setShowAllRatingsGiven] = useState(false)
  const [showAllLessonsTaught, setShowAllLessonsTaught] = useState(false)
  const [showAllLessonsSignedUp, setShowAllLessonsSignedUp] = useState(false)
  const [showAllCheckouts, setShowAllCheckouts] = useState(false)

  if (!member) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">Member not found.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            WYC #{member.wycNumber} — {member.first} {member.last}
          </h1>
          {!isEditing && <Button onClick={() => setIsEditing(true)}>Edit Info</Button>}
        </div>
        <MemberExpireQuarter expireQtrIndex={member.expireQtrIndex} />
      </div>

      {isEditing ? (
        <MemberEditForm member={member} hasDb={hasDb} onCancel={() => setIsEditing(false)} />
      ) : (
        <MemberReadOnlyInfo member={member} />
      )}

      <MemberRatingsSection wycNumber={member.wycNumber} />
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <MemberRatingsGivenSection
          wycNumber={member.wycNumber}
          since={showAllRatingsGiven ? undefined : since}
          title={`Ratings Given (${showAllRatingsGiven ? 'All Time' : 'Past 12 Months'})`}
          action={<ShowAllToggle showAll={showAllRatingsGiven} onToggle={setShowAllRatingsGiven} />}
        />
      </Suspense>
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <MemberLessonsSection
          title={`Lessons Taught (${showAllLessonsTaught ? 'All Time' : 'Past 12 Months'})`}
          queryOptions={getMemberLessonsTaughtQueryOptions(member.wycNumber, showAllLessonsTaught ? undefined : since)}
          action={<ShowAllToggle showAll={showAllLessonsTaught} onToggle={setShowAllLessonsTaught} />}
        />
      </Suspense>
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <MemberLessonsSection
          title={`Lessons Signed Up For (${showAllLessonsSignedUp ? 'All Time' : 'Past 12 Months'})`}
          queryOptions={getMemberLessonsSignedUpQueryOptions(member.wycNumber, showAllLessonsSignedUp ? undefined : since)}
          action={<ShowAllToggle showAll={showAllLessonsSignedUp} onToggle={setShowAllLessonsSignedUp} />}
        />
      </Suspense>
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <MemberCheckoutsSection
          wycNumber={member.wycNumber}
          since={showAllCheckouts ? undefined : since}
          title={`Boat Checkouts (${showAllCheckouts ? 'All Time' : 'Past 12 Months'})`}
          action={<ShowAllToggle showAll={showAllCheckouts} onToggle={setShowAllCheckouts} />}
        />
      </Suspense>
      <MemberPositionsSection wycNumber={member.wycNumber} />
    </div>
  )
}

function MemberExpireQuarter({ expireQtrIndex }: { expireQtrIndex: number }) {
  const { data: quarters = [] } = useQuery(getQuartersQueryOptions())
  const { data: currentQuarter } = useQuery(getCurrentQuarterQueryOptions())
  const quarterLabel =
    quarters.find((q) => q.index === expireQtrIndex)?.school || `Quarter ${expireQtrIndex}`

  const isActive = currentQuarter != null ? isMembershipActive(expireQtrIndex, currentQuarter) : null

  return (
    <p
      className={cn(
        'text-xl font-semibold mt-1',
        isActive === true && 'text-green-600 dark:text-green-400',
        isActive === false && 'text-destructive',
        isActive === null && 'text-muted-foreground',
      )}
    >
      {isActive === false ? `Membership expired: ${quarterLabel}` : `Membership active through: ${quarterLabel}`}
    </p>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-base">{value || '—'}</p>
    </div>
  )
}

function MemberReadOnlyInfo({ member }: { member: Member }) {
  const { data: categories = [] } = useQuery(getCategoriesQueryOptions())

  const categoryLabel = categories.find((c) => c.index === member.categoryId)?.text || 'None'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ReadOnlyField label="First Name" value={member.first} />
        <ReadOnlyField label="Last Name" value={member.last} />
        <ReadOnlyField label="Email" value={member.email} />
        <ReadOnlyField label="Student ID" value={member.studentId?.toString() ?? ''} />
        <ReadOnlyField label="Street Address" value={member.streetAddress} />
        <ReadOnlyField label="City" value={member.city} />
        <ReadOnlyField label="State" value={member.state} />
        <ReadOnlyField label="Zip Code" value={member.zipCode} />
        <ReadOnlyField label="Phone 1" value={member.phone1} />
        <ReadOnlyField label="Phone 2" value={member.phone2} />
        <ReadOnlyField label="Category" value={categoryLabel} />
        <ReadOnlyField label="Out to Sea" value={member.outToSea ? 'Yes' : 'No'} />
        <ReadOnlyField label="Join Date" value={new Date(member.joinDate).toLocaleDateString()} />
      </div>
    </div>
  )
}

function MemberEditForm({
  member,
  hasDb,
  onCancel,
}: {
  member: Member
  hasDb: boolean
  onCancel: () => void
}) {
  const { data: quarters = [] } = useQuery(getQuartersQueryOptions())
  const { data: categories = [] } = useQuery(getCategoriesQueryOptions())

  const updateMutation = useUpdateMemberProfileMutation()

  const form = useAppForm({
    defaultValues: memberToDefaults(member),
    validators: {
      onSubmit: MemberProfileUpdateSchema,
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync({ data: { wycNumber: member.wycNumber, ...value } })
      onCancel()
    },
  })

  const mutationError = updateMutation.error?.message

  const categoryOptions = categories.map((c) => ({
    value: c.index,
    label: c.text || `Category ${c.index}`,
  }))

  const quarterOptions = quarters.map((q) => ({
    value: q.index,
    label: q.school || q.text || `Quarter ${q.index}`,
  }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      <ErrorAlert error={mutationError} action="Updating member" />

      <ReadOnlyField label="Join Date" value={new Date(member.joinDate).toLocaleDateString()} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form.AppField
          name="first"
          children={(field) => <field.TextField label="First Name" required />}
        />

        <form.AppField
          name="last"
          children={(field) => <field.TextField label="Last Name" required />}
        />

        <form.AppField
          name="email"
          children={(field) => (
            <field.TextField label="Email" type="email" className="md:col-span-2" />
          )}
        />

        <form.AppField
          name="streetAddress"
          children={(field) => <field.TextField label="Street Address" className="md:col-span-2" />}
        />

        <form.AppField name="city" children={(field) => <field.TextField label="City" />} />

        <form.AppField name="state" children={(field) => <field.TextField label="State" />} />

        <form.AppField name="zipCode" children={(field) => <field.TextField label="Zip Code" />} />

        <form.AppField name="phone1" children={(field) => <field.TextField label="Phone 1" />} />

        <form.AppField name="phone2" children={(field) => <field.TextField label="Phone 2" />} />

        <form.AppField
          name="studentId"
          children={(field) => <field.NumberField label="Student ID" />}
        />

        {hasDb && (
          <>
            <form.AppField
              name="categoryId"
              children={(field) => (
                <field.SelectField
                  label="Category"
                  placeholder="Select category"
                  options={categoryOptions}
                />
              )}
            />

            <form.AppField
              name="expireQtrIndex"
              children={(field) => (
                <field.SelectField
                  label="Expire Quarter"
                  required
                  placeholder="Select quarter"
                  options={quarterOptions}
                />
              )}
            />

            <form.AppField
              name="outToSea"
              children={(field) => <field.CheckboxField label="Out to Sea" />}
            />
          </>
        )}
      </div>

      <div className="flex justify-start gap-2 pt-4 border-t">
        <form.AppForm>
          <form.SubmitButton label="Update Member" submittingLabel="Saving..." />
        </form.AppForm>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
