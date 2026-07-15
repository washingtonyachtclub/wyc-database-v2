export type StatCategoryKey = 'student' | 'facultyStaff' | 'public'

export const STAT_CATEGORY_LABELS: Record<StatCategoryKey, string> = {
  student: 'Student',
  facultyStaff: 'Faculty / Staff',
  public: 'Public / Other',
}

export const STAT_CATEGORY_ORDER: StatCategoryKey[] = ['student', 'facultyStaff', 'public']

export type StatRow = Record<StatCategoryKey, number>

export type MembershipStats = {
  currentQuarterIndex: number
  currentQuarterText: string
  paid: StatRow
  exempt: StatRow
}

// memcat 1 and 2 are Student and Faculty / Staff. Alumni, Spouse, Racing Team, Public,
// and uncategorized members all collapse into Public / Other.
function categoryKey(categoryId: number | null): StatCategoryKey {
  if (categoryId === 1) return 'student'
  if (categoryId === 2) return 'facultyStaff'
  return 'public'
}

export function computeMembershipStats(input: {
  currentQuarterIndex: number
  currentQuarterText: string
  members: { wycNumber: number; categoryId: number | null }[]
  exemptWycNumbers: Set<number>
}): MembershipStats {
  const paid: StatRow = { student: 0, facultyStaff: 0, public: 0 }
  const exempt: StatRow = { student: 0, facultyStaff: 0, public: 0 }

  for (const member of input.members) {
    const row = input.exemptWycNumbers.has(member.wycNumber) ? exempt : paid
    row[categoryKey(member.categoryId)]++
  }

  return {
    currentQuarterIndex: input.currentQuarterIndex,
    currentQuarterText: input.currentQuarterText,
    paid,
    exempt,
  }
}
