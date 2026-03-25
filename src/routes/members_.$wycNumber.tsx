import type { Member, MemberProfileUpdate } from '@/db/types'
import { MemberLessonsSection } from '@/components/members/MemberLessonsSection'
import { MemberPositionsSection } from '@/components/members/MemberPositionsSection'
import { MemberRatingsGivenSection } from '@/components/members/MemberRatingsGivenSection'
import { MemberRatingsSection } from '@/components/members/MemberRatingsSection'
import { MemberProfileUpdateSchema } from '@/db/member-schema'
import { useAppForm } from '@/hooks/form'
import {
  getCategoriesQueryOptions,
  getMemberByIdQueryOptions,
  getMemberLessonsSignedUpQueryOptions,
  getMemberLessonsTaughtQueryOptions,
  getQuartersQueryOptions,
  useUpdateMemberProfileMutation,
} from '@/lib/members-query-options'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/members_/$wycNumber')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: '/members' },
      })
    }
  },
  component: MemberDetailPage,
})

function memberToDefaults(member: Member): MemberProfileUpdate {
  const { wycNumber, expireQtrIndex, categoryId, ...rest } = member
  return rest
}

function useTwelveMonthsAgo() {
  return useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    return d.toISOString().slice(0, 10)
  }, [])
}

function MemberDetailPage() {
  const { wycNumber } = Route.useParams()
  const { data: member } = useSuspenseQuery(getMemberByIdQueryOptions(Number(wycNumber)))
  const since = useTwelveMonthsAgo()

  if (!member) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">Member not found.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-8">
      <h1 className="text-2xl font-bold">
        WYC #{member.wycNumber} — {member.first} {member.last}
      </h1>

      <MemberReadOnlyFields member={member} />
      <MemberEditForm member={member} />
      <MemberRatingsSection wycNumber={member.wycNumber} />
      <MemberRatingsGivenSection wycNumber={member.wycNumber} since={since} />
      <MemberLessonsSection
        title="Lessons Taught (Past 12 Months)"
        queryOptions={getMemberLessonsTaughtQueryOptions(member.wycNumber, since)}
      />
      <MemberLessonsSection
        title="Lessons Signed Up For (Past 12 Months)"
        queryOptions={getMemberLessonsSignedUpQueryOptions(member.wycNumber, since)}
      />
      <MemberPositionsSection wycNumber={member.wycNumber} />
    </div>
  )
}

function MemberReadOnlyFields({ member }: { member: Member }) {
  const { data: quarters = [] } = useQuery(getQuartersQueryOptions())
  const { data: categories = [] } = useQuery(getCategoriesQueryOptions())

  const quarterLabel =
    quarters.find((q) => q.index === member.expireQtrIndex)?.school ||
    `Quarter ${member.expireQtrIndex}`
  const categoryLabel =
    categories.find((c) => c.index === member.categoryId)?.text || 'None'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <p className="text-sm text-muted-foreground">WYC Number</p>
        <p className="text-lg font-medium">{member.wycNumber}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Expire Quarter</p>
        <p className="text-lg font-medium">{quarterLabel}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Category</p>
        <p className="text-lg font-medium">{categoryLabel}</p>
      </div>
    </div>
  )
}

function MemberEditForm({ member }: { member: Member }) {
  const [saveMessage, setSaveMessage] = useState('')

  const updateMutation = useUpdateMemberProfileMutation()

  const form = useAppForm({
    defaultValues: memberToDefaults(member),
    validators: {
      onSubmit: MemberProfileUpdateSchema,
    },
    onSubmit: async ({ value }) => {
      setSaveMessage('')
      await updateMutation.mutateAsync({ data: { wycNumber: member.wycNumber, ...value } })
      setSaveMessage('Member saved.')
    },
  })

  const mutationError = updateMutation.error?.message

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      {mutationError && (
        <div className="rounded-md bg-destructive/10 p-4 border border-destructive">
          <div className="text-sm text-destructive">{mutationError}</div>
        </div>
      )}

      {saveMessage && (
        <div className="rounded-md bg-green-500/10 p-4 border border-green-500">
          <div className="text-sm text-green-700">{saveMessage}</div>
        </div>
      )}

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
          children={(field) => (
            <field.TextField label="Street Address" className="md:col-span-2" />
          )}
        />

        <form.AppField name="city" children={(field) => <field.TextField label="City" />} />

        <form.AppField name="state" children={(field) => <field.TextField label="State" />} />

        <form.AppField
          name="zipCode"
          children={(field) => <field.TextField label="Zip Code" />}
        />

        <form.AppField name="phone1" children={(field) => <field.TextField label="Phone 1" />} />

        <form.AppField name="phone2" children={(field) => <field.TextField label="Phone 2" />} />

        <form.AppField
          name="studentId"
          children={(field) => <field.NumberField label="Student ID" />}
        />

        <form.AppField
          name="outToSea"
          children={(field) => <field.BooleanSelectField label="Out to Sea" />}
        />
      </div>

      <div className="flex justify-start gap-2 pt-4 border-t">
        <form.AppForm>
          <form.SubmitButton label="Update Member" submittingLabel="Saving..." />
        </form.AppForm>
      </div>
    </form>
  )
}
