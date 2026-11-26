import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { MemberLite } from '@/components/ui/MemberCombobox'
import { getCheckoutFormMembersQueryOptions } from '@/domains/checkouts/query-options'
import { searchCheckoutMembers } from '@/domains/checkouts/server-fns'

const emptyMembers: MemberLite[] = []

function searchAllMembers(query: string) {
  return searchCheckoutMembers({ data: { query } })
}

export function useCheckoutMemberOptions(existingMembers = emptyMembers) {
  const { data: members = emptyMembers } = useQuery(getCheckoutFormMembersQueryOptions())
  const [additionalMembers, setAdditionalMembers] = useState<MemberLite[]>([])
  const selectableMembers = useMemo(() => {
    const byWycNumber = new Map<number, MemberLite>()
    for (const member of [...existingMembers, ...members, ...additionalMembers]) {
      byWycNumber.set(member.wycNumber, member)
    }
    return [...byWycNumber.values()]
  }, [existingMembers, members, additionalMembers])

  const rememberMember = (member: MemberLite) => {
    setAdditionalMembers((current) =>
      current.some((candidate) => candidate.wycNumber === member.wycNumber)
        ? current
        : [...current, member],
    )
  }

  return { selectableMembers, searchAllMembers, rememberMember }
}
