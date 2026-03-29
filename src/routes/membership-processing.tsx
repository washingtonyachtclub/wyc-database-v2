import { Button } from '@/components/ui/button'
import { CopyBox } from '@/components/ui/CopyBox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { MemberProfileUpdate } from '@/db/member-schema'
import { isMembershipActive } from '@/db/membership-utils'
import { getCurrentQuarterQueryOptions } from '@/lib/lessons-query-options'
import {
  getAllMembersLiteQueryOptions,
  getProcessedEntryIdsQueryOptions,
  getQuartersQueryOptions,
} from '@/lib/members-query-options'
import {
  createMember,
  getDatabaseName,
  markEntryProcessed,
  renewMember,
} from '@/lib/members-server-fns'
import { newMemberEmailFallback, returningMemberEmail } from '@/lib/email-templates'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import Papa from 'papaparse'
import { Fragment, useMemo, useState } from 'react'
import { requirePrivilegeForRoute } from '../lib/route-guards'

export const Route = createFileRoute('/membership-processing')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/membership-processing')
  },
  component: MembershipProcessingPage,
})

export type OldMember = {
  wycNumber: number
  newExpireQtr: number
  first: string
  last: string
  email: string
}
type ParseResult =
  | { kind: 'NewMember'; member: MemberProfileUpdate }
  | { kind: 'OldMember'; member: OldMember }
  | { kind: 'Error'; error: ParseError }

type ParseError =
  | { code: 'DATABASE_NOT_PROD'; message: string; rawInput: string }
  | { code: 'MISSING_WYC_NUMBER'; message: string; rawInput: string; duplicates: DuplicateMatch[] }
  | { code: 'COLUMN_COUNT_MISMATCH'; message: string }
  | { code: 'WYC_NOT_FOUND'; message: string }
  | { code: 'NAME_MISMATCH'; message: string }
  | { code: 'INVALID_FIELD'; message: string }
  | { code: 'DATA_LOADING'; message: string }

type DuplicateMatch = {
  wycNumber: number
  first: string | null
  last: string | null
  email: string | null
  matchMethod: 'name' | 'email' | 'name+email'
  status: 'active' | 'expired'
}

type BatchItemStatus = 'pending' | 'filtered'

type BatchItem = {
  csvLine: string
  first: string
  last: string
  email: string
  entryId: number
  status: BatchItemStatus
}

type PageState =
  | { kind: 'Initial' }
  | {
      kind: 'NewMember'
      member: MemberProfileUpdate
      duplicates: DuplicateMatch[]
    }
  | {
      kind: 'NewMemberCreated'
      member: MemberProfileUpdate
      wycNumber: number
      emailSent: boolean
    }
  | { kind: 'OldMember'; member: OldMember }
  | { kind: 'OldMemberRenewed'; member: OldMember; emailSent: boolean }
  | { kind: 'Error'; error: ParseError }

const CATEGORY_VALUES = [
  'Student',
  'Student, but graduating, taking quarter off, etc.',
  'Employee/Retiree',
  'Neither',
] as const
type CategoryText = (typeof CATEGORY_VALUES)[number]

const MEMBERSHIP_STATUS_VALUES = [
  'New member',
  'Current member looking to renew',
  'Previous member looking to rejoin',
] as const

function MembershipProcessingPage() {
  const { data: allMembers } = useQuery(getAllMembersLiteQueryOptions())
  const { data: currentQuarter } = useQuery(getCurrentQuarterQueryOptions())
  const { data: quarters } = useQuery(getQuartersQueryOptions())
  const [memberState, setMemberState] = useState<PageState>({ kind: 'Initial' })
  const [batchInput, setBatchInput] = useState<string>('')
  const [activeLineInput, setActiveLineInput] = useState<string>('')
  const [wycNumberEntry, setWycNumberEntry] = useState<string>('')
  const [batchItems, setBatchItems] = useState<BatchItem[]>([])
  const [activeBatchIndex, setActiveBatchIndex] = useState<number | null>(null)
  const [skipWycNumber, setSkipWycNumber] = useState<string>('')
  const [skippingIndex, setSkippingIndex] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { data: processedEntryIds } = useQuery(getProcessedEntryIdsQueryOptions())
  const processedSet = useMemo(() => new Set(processedEntryIds ?? []), [processedEntryIds])

  const headerString = `"Name: First","Name: Last",Email,"Quarterly or Annual Membership","What is your UW Status for the duration of your WYC membership?","What best describes your WYC membership status?","What is your WYC number?","Address: Address Line 1","Address: Address Line 2","Address: City","Address: State","Address: Zip/Postal Code","Address: Country","Primary Phone Number","Alternative Phone Number","Entry ID"`
  const headerRow = Papa.parse<string[]>(headerString, { header: false }).data[0]
  const wycNumberIndex = headerRow.indexOf('What is your WYC number?')

  type Ok<T> = { ok: true; value: T }
  type Err = { ok: false; error: string }
  type Result<T> = Ok<T> | Err
  function parseOneOf<T extends string>(
    value: string,
    allowed: readonly T[],
    fieldName: string,
  ): Result<T> {
    if ((allowed as readonly string[]).includes(value)) {
      return { ok: true, value: value as T }
    }
    return { ok: false, error: `Invalid ${fieldName}: "${value}"` }
  }

  type QuarterRow = { index: number; school: string | null }

  function resolveExpireQtr(
    rawQuartersText: string,
    quartersData: QuarterRow[],
  ): { ok: true; index: number } | { ok: false; error: string } {
    const parts = rawQuartersText.split(',').map((s) => s.trim())
    const lastSchoolText = parts[parts.length - 1]
    const match = quartersData.find((q) => q.school === lastSchoolText)
    if (!match) {
      return { ok: false, error: `Quarter "${lastSchoolText}" not found in database` }
    }
    return { ok: true, index: match.index }
  }

  function getSchoolText(quarterIndex: number, quartersData: QuarterRow[]): string {
    return (
      quartersData.find((q) => q.index === quarterIndex)?.school ??
      `Unknown quarter ${quarterIndex}`
    )
  }

  function cleanPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (digits.length > 10) return digits.slice(-10)
    return digits
  }

  function extractCategoryID(text: CategoryText) {
    switch (text) {
      case 'Student':
        return 1
      case 'Student, but graduating, taking quarter off, etc.':
        return 1
      case 'Employee/Retiree':
        return 2
      case 'Neither':
        return 6
    }
  }

  function findDuplicates(first: string, last: string, email: string): DuplicateMatch[] {
    if (!allMembers || currentQuarter == null) return []
    const normFirst = first.toLowerCase().trim()
    const normLast = last.toLowerCase().trim()
    const normEmail = email.toLowerCase().trim()
    const matches: DuplicateMatch[] = []
    for (const m of allMembers) {
      const nameMatch =
        m.first?.toLowerCase().trim() === normFirst && m.last?.toLowerCase().trim() === normLast
      const emailMatch =
        normEmail !== '' && m.email != null && m.email.toLowerCase().trim() === normEmail
      if (nameMatch || emailMatch) {
        matches.push({
          wycNumber: m.wycNumber,
          first: m.first,
          last: m.last,
          email: m.email,
          matchMethod: nameMatch && emailMatch ? 'name+email' : nameMatch ? 'name' : 'email',
          status: isMembershipActive(m.expireQtrIndex, currentQuarter) ? 'active' : 'expired',
        })
      }
    }
    return matches
  }

  function reprocessWithWycNumber(wycNumberEntry: string): void {
    const cells = Papa.parse<string[]>(activeLineInput, { header: false }).data[0]
    cells[wycNumberIndex] = wycNumberEntry
    const newInput = Papa.unparse([cells], { header: false })
    setActiveLineInput(newInput)
    handleProcess(newInput)
  }

  function parseInput(input: string, quartersData: QuarterRow[]): ParseResult {
    const inputRow = Papa.parse<string[]>(input, { header: false }).data[0]

    const get = (key: string) => {
      const idx = headerRow.indexOf(key)
      if (idx === -1) throw new Error(`Unknown column: ${key}`)
      return inputRow[idx] ?? ''
    }

    const first = get('Name: First')
    const last = get('Name: Last')
    const addressLine1 = get('Address: Address Line 1')
    const addressLine2 = get('Address: Address Line 2')
    const city = get('Address: City')
    const state = get('Address: State')
    const zipCode = get('Address: Zip/Postal Code')
    const phone1 = cleanPhone(get('Primary Phone Number'))
    const phone2 = cleanPhone(get('Alternative Phone Number'))
    const email = get('Email')
    const rawCategory = get('What is your UW Status for the duration of your WYC membership?')
    const rawQuartersText = get('Quarterly or Annual Membership')
    const wycNumber = get('What is your WYC number?')
    const rawMembershipStatus = get('What best describes your WYC membership status?')

    const categoryResult = parseOneOf(rawCategory, CATEGORY_VALUES, 'category')
    if (!categoryResult.ok)
      return {
        kind: 'Error',
        error: { code: 'INVALID_FIELD', message: categoryResult.error },
      }
    const category = categoryResult.value

    const expireQtrResult = resolveExpireQtr(rawQuartersText, quartersData)
    if (!expireQtrResult.ok)
      return {
        kind: 'Error',
        error: { code: 'INVALID_FIELD', message: expireQtrResult.error },
      }
    const expireQtrIndex = expireQtrResult.index

    const membershipStatusResult = parseOneOf(
      rawMembershipStatus,
      MEMBERSHIP_STATUS_VALUES,
      'membership status',
    )
    if (!membershipStatusResult.ok)
      return {
        kind: 'Error',
        error: { code: 'INVALID_FIELD', message: membershipStatusResult.error },
      }
    const membershipStatus = membershipStatusResult.value

    // input validation
    if (inputRow.length !== headerRow.length) {
      return {
        kind: 'Error',
        error: {
          code: 'COLUMN_COUNT_MISMATCH',
          message: 'Expected ' + headerRow.length + ' cells, got ' + inputRow.length,
        },
      }
    } else if (membershipStatus !== 'New member' && !wycNumber) {
      return {
        kind: 'Error',
        error: {
          code: 'MISSING_WYC_NUMBER',
          message: 'Returning member but no WYC number provided',
          rawInput: input,
          duplicates: findDuplicates(first, last, email),
        },
      }
    } else if (wycNumber && isNaN(Number(wycNumber))) {
      return {
        kind: 'Error',
        error: {
          code: 'INVALID_FIELD',
          message: 'Invalid WYC number provided',
        },
      }
      // todo: better wycNumber validation
    }

    if (!allMembers)
      return {
        kind: 'Error',
        error: { code: 'DATA_LOADING', message: 'Member data still loading' },
      }

    if (!quartersData.length)
      return {
        kind: 'Error',
        error: { code: 'DATA_LOADING', message: 'Quarter data still loading' },
      }

    if (wycNumber) {
      const dbMember = allMembers?.find((m) => m.wycNumber === Number(wycNumber))
      if (!dbMember) {
        return {
          kind: 'Error',
          error: {
            code: 'WYC_NOT_FOUND',
            message: `WYC number ${wycNumber} not found in database`,
          },
        }
      }
      if (
        dbMember.first?.toLowerCase() !== first.toLowerCase() ||
        dbMember.last?.toLowerCase() !== last.toLowerCase()
      ) {
        return {
          kind: 'Error',
          error: {
            code: 'NAME_MISMATCH',
            message: `Name mismatch for WYC #${wycNumber}:\n  Form: "${first} ${last}"\n  Database: "${dbMember.first} ${dbMember.last}"`,
          },
        }
      }
      return {
        kind: 'OldMember',
        member: {
          wycNumber: Number(wycNumber),
          newExpireQtr: expireQtrIndex,
          first: first,
          last: last,
          email: email,
        },
      }
    } else {
      return {
        kind: 'NewMember',
        member: {
          last,
          first,
          streetAddress: [addressLine1, addressLine2].filter(Boolean).join(' '),
          city,
          state,
          zipCode,
          phone1,
          phone2,
          email,
          categoryId: extractCategoryID(category),
          expireQtrIndex,
          studentId: null,
          outToSea: false,
        } satisfies MemberProfileUpdate,
      }
    }
  }

  const classifiedBatch = useMemo(() => {
    return batchItems.map((item) => ({
      ...item,
      status: processedSet.has(item.entryId) ? ('filtered' as const) : ('pending' as const),
    }))
  }, [batchItems, processedSet])

  const visibleBatch = classifiedBatch.filter((item) => item.status !== 'filtered')
  const filteredCount = classifiedBatch.length - visibleBatch.length

  function handleBatchProcess(): void {
    const parsed = Papa.parse<string[]>(batchInput, { header: false })
    const rows = parsed.data.filter((row) => row.length === headerRow.length)

    const firstIdx = headerRow.indexOf('Name: First')
    const lastIdx = headerRow.indexOf('Name: Last')
    const emailIdx = headerRow.indexOf('Email')
    const entryIdIdx = headerRow.indexOf('Entry ID')

    const items: BatchItem[] = rows
      .map((row) => {
        const entryIdStr = (row[entryIdIdx] ?? '').trim()
        const entryId = entryIdStr && !isNaN(Number(entryIdStr)) ? Number(entryIdStr) : null
        if (entryId == null) return null
        return {
          csvLine: Papa.unparse([row], { header: false }),
          first: (row[firstIdx] ?? '').trim(),
          last: (row[lastIdx] ?? '').trim(),
          email: (row[emailIdx] ?? '').trim(),
          entryId,
          status: 'pending' as BatchItemStatus,
        }
      })
      .filter((item): item is BatchItem => item != null)

    setBatchItems(items)
    setActiveBatchIndex(null)
    setSkippingIndex(null)
    setMemberState({ kind: 'Initial' })
  }

  function handleSelectBatchItem(index: number): void {
    const item = classifiedBatch[index]
    setActiveBatchIndex(index)
    setActiveLineInput(item.csvLine)
    handleProcess(item.csvLine)
  }

  async function handleDone(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['members', 'lite'] })
    await queryClient.invalidateQueries({ queryKey: ['processedEntryIds'] })
    setMemberState({ kind: 'Initial' })
    setActiveBatchIndex(null)
  }

  async function handleSkip(index: number): Promise<void> {
    const item = classifiedBatch[index]
    const wycNum = skipWycNumber.trim()
    const wycNumber = wycNum && !isNaN(Number(wycNum)) ? Number(wycNum) : null
    await markEntryProcessed({ data: { entryId: item.entryId, wycNumber } })
    await queryClient.invalidateQueries({ queryKey: ['processedEntryIds'] })
    setSkippingIndex(null)
    setSkipWycNumber('')
  }

  async function handleProcess(overrideInput?: string): Promise<void> {
    const lineInput = overrideInput ?? activeLineInput
    const dbName = await getDatabaseName()
    if (dbName !== 'production') {
      setMemberState({
        kind: 'Error',
        error: {
          code: 'DATABASE_NOT_PROD',
          message: `Connected to "${dbName}" — switch to prod before processing`,
          rawInput: lineInput,
        },
      })
      return
    }
    const result = parseInput(lineInput, quarters ?? [])
    if (result.kind === 'NewMember') {
      const duplicates = findDuplicates(
        result.member.first,
        result.member.last,
        result.member.email,
      )
      setMemberState({ ...result, duplicates })
    } else {
      setMemberState(result)
    }
  }

  async function handleCreateMember(): Promise<void> {
    if (memberState.kind !== 'NewMember') return
    try {
      const result = await createMember({
        data: { member: memberState.member, sendEmail: true },
      })
      const activeBatchItem = activeBatchIndex != null ? classifiedBatch[activeBatchIndex] : null
      if (activeBatchItem) {
        await markEntryProcessed({
          data: { entryId: activeBatchItem.entryId, wycNumber: result.wycNumber },
        })
      }
      setMemberState({
        kind: 'NewMemberCreated',
        member: memberState.member,
        wycNumber: result.wycNumber,
        emailSent: result.emailSent,
      })
    } catch (error: any) {
      setMemberState({
        kind: 'Error',
        error: { code: 'INVALID_FIELD', message: error.message ?? 'Failed to create member' },
      })
    }
  }

  async function handleRenewMember(): Promise<void> {
    if (memberState.kind !== 'OldMember') return
    try {
      const result = await renewMember({
        data: {
          wycNumber: memberState.member.wycNumber,
          expireQtrIndex: memberState.member.newExpireQtr,
          sendEmail: true,
        },
      })
      const activeBatchItem = activeBatchIndex != null ? classifiedBatch[activeBatchIndex] : null
      if (activeBatchItem) {
        await markEntryProcessed({
          data: { entryId: activeBatchItem.entryId, wycNumber: memberState.member.wycNumber },
        })
      }
      setMemberState({
        kind: 'OldMemberRenewed',
        member: memberState.member,
        emailSent: result.emailSent,
      })
    } catch (error: any) {
      setMemberState({
        kind: 'Error',
        error: { code: 'INVALID_FIELD', message: error.message ?? 'Failed to renew member' },
      })
    }
  }

  const newMemberExampleInput = `Sahil,Chowdhury,sahilch@uw.edu,"Spring 2026",Student,"New member",,"217 245th pl ne",,Sammamish,WA,98074,US,'+14255892521,,9999`
  const oldMemberExampleInput = `Luka,Ukrainczyk,lukrainczyk@gmail.com,"Spring 2026",Neither,"Current member looking to renew",17323,,,,,,,,,9998`
  return (
    <div className="p-8">
      <div className="flex gap-2 mb-4">
        <Button
          variant="secondary"
          onClick={() => {
            setBatchInput(newMemberExampleInput)
            setActiveLineInput(newMemberExampleInput)
            handleProcess(newMemberExampleInput)
          }}
        >
          Set new member example
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setBatchInput(oldMemberExampleInput)
            setActiveLineInput(oldMemberExampleInput)
            handleProcess(oldMemberExampleInput)
          }}
        >
          Set old member example
        </Button>
      </div>
      <Label>Paste CSV lines (no header)</Label>
      <Textarea
        value={batchInput}
        onChange={(e) => setBatchInput(e.target.value)}
        rows={6}
        className="font-mono text-xs"
      />
      <Button className="mt-4" onClick={handleBatchProcess}>
        Process
      </Button>

      {classifiedBatch.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">
            {filteredCount} already processed · {visibleBatch.length} remaining
          </p>
          <ul className="space-y-1">
            {classifiedBatch.map((item, i) => {
              if (item.status === 'filtered') return null
              return (
                <li key={i}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectBatchItem(i)}
                      className={cn(
                        'flex-1 text-left px-3 py-2 rounded text-sm',
                        activeBatchIndex === i ? 'bg-accent' : 'hover:bg-muted',
                      )}
                    >
                      {item.first} {item.last} — {item.email}
                      <span className="text-muted-foreground ml-2">Entry#{item.entryId}</span>
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSkippingIndex(skippingIndex === i ? null : i)
                        setSkipWycNumber('')
                      }}
                    >
                      Skip
                    </Button>
                  </div>
                  {skippingIndex === i && (
                    <div className="flex items-center gap-2 ml-3 mt-1">
                      <Input
                        type="text"
                        value={skipWycNumber}
                        onChange={(e) => setSkipWycNumber(e.target.value)}
                        placeholder="WYC # (optional)"
                        className="w-40 h-8 text-sm"
                      />
                      <Button size="sm" onClick={() => handleSkip(i)}>
                        Confirm Skip
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {activeBatchIndex != null && memberState.kind !== 'Initial' && (
        <pre className="mt-4 p-3 rounded bg-muted text-xs font-mono whitespace-pre-wrap break-all">
          {classifiedBatch[activeBatchIndex]?.csvLine}
        </pre>
      )}

      {memberState.kind === 'NewMember' && (
        <div className="mt-4">
          {memberState.duplicates.length > 0 && (
            <div className="mb-4 rounded border border-yellow-400 bg-yellow-50 p-4 text-yellow-900">
              <p className="font-semibold">Possible duplicate(s) found:</p>
              <ul className="mt-2 list-disc pl-5">
                {memberState.duplicates.map((d) => (
                  <li key={d.wycNumber}>
                    WYC #{d.wycNumber} — {d.first} {d.last}
                    {d.email ? ` (${d.email})` : ''}
                    {' — matched by '}
                    <span className="font-medium">{d.matchMethod}</span>
                    {' — '}
                    <span
                      className={
                        d.status === 'active'
                          ? 'text-green-700 font-medium'
                          : 'text-red-700 font-medium'
                      }
                    >
                      {d.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <h3 className="font-semibold">New Member</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4">
            {Object.entries(memberState.member).map(([key, value]) => (
              <Fragment key={key}>
                <dt className="font-semibold text-right">{key}:</dt>
                <dd>{String(value)}</dd>
              </Fragment>
            ))}
          </dl>
          <Button className="mt-4" onClick={handleCreateMember}>
            Create Member
          </Button>
        </div>
      )}
      {memberState.kind === 'NewMemberCreated' && (
        <div className="mt-4">
          <p className="text-green-600 font-semibold">
            Member created — WYC #{memberState.wycNumber}
          </p>
          {memberState.emailSent ? (
            <p className="text-green-600">Welcome email sent to {memberState.member.email}</p>
          ) : (
            <>
              <p className="text-destructive font-semibold">
                Email failed to send. Copy and send manually:
              </p>
              <CopyBox text={memberState.member.email} />
              <CopyBox
                text={newMemberEmailFallback({
                  ...memberState.member,
                  wycNumber: memberState.wycNumber,
                })}
              />
            </>
          )}
          {batchItems.length > 0 && (
            <Button className="mt-4" onClick={handleDone}>
              Done
            </Button>
          )}
        </div>
      )}
      {memberState.kind === 'OldMember' && (
        <div className="mt-4">
          <h3 className="font-semibold">Returning Member</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4">
            {Object.entries(memberState.member).map(([key, value]) => (
              <Fragment key={key}>
                <dt className="font-semibold text-right">{key}:</dt>
                <dd>{String(value)}</dd>
              </Fragment>
            ))}
          </dl>
          <Button className="mt-4" onClick={handleRenewMember}>
            Renew Membership
          </Button>
        </div>
      )}
      {memberState.kind === 'OldMemberRenewed' && (
        <div className="mt-4">
          <p className="text-green-600 font-semibold">
            Membership renewed for WYC #{memberState.member.wycNumber}
          </p>
          {memberState.emailSent ? (
            <p className="text-green-600">Renewal email sent to {memberState.member.email}</p>
          ) : (
            <>
              <p className="text-destructive font-semibold">
                Email failed to send. Copy and send manually:
              </p>
              <CopyBox text={memberState.member.email} />
              <CopyBox
                text={returningMemberEmail(
                  memberState.member.first,
                  memberState.member.last,
                  memberState.member.wycNumber,
                  getSchoolText(memberState.member.newExpireQtr, quarters ?? []),
                )}
              />
            </>
          )}
          {batchItems.length > 0 && (
            <Button className="mt-4" onClick={handleDone}>
              Done
            </Button>
          )}
        </div>
      )}
      {memberState.kind === 'Error' && (
        <>
          <p className="mt-4 text-red-600">{memberState.error.message}</p>
          {memberState.error.code === 'MISSING_WYC_NUMBER' && (
            <div className="mt-4">
              {memberState.error.duplicates.length > 0 && (
                <div className="mb-4 rounded border border-yellow-400 bg-yellow-50 p-4 text-yellow-900">
                  <p className="font-semibold">Possible matches:</p>
                  <ul className="mt-2 list-disc pl-5">
                    {memberState.error.duplicates.map((d) => (
                      <li key={d.wycNumber} className="flex items-center gap-2">
                        <span>
                          WYC #{d.wycNumber} — {d.first} {d.last}
                          {d.email ? ` (${d.email})` : ''}
                          {' — matched by '}
                          <span className="font-medium">{d.matchMethod}</span>
                          {' — '}
                          <span
                            className={
                              d.status === 'active'
                                ? 'text-green-700 font-medium'
                                : 'text-red-700 font-medium'
                            }
                          >
                            {d.status}
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reprocessWithWycNumber(String(d.wycNumber))}
                        >
                          Use #{d.wycNumber}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={wycNumberEntry}
                  onChange={(e) => setWycNumberEntry(e.target.value)}
                  placeholder="WYC Number"
                />
                <Button onClick={() => reprocessWithWycNumber(wycNumberEntry)}>
                  Set WYC Number
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
