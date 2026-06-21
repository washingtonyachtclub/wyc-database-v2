import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmailSimulatedNotice } from '@/components/ui/EmailSimulatedNotice'
import { CopyBox } from '@/components/ui/CopyBox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { adminRecordRenewal } from '@/domains/renewals/server-fns'
import type { RenewalDuration } from '@/domains/renewals/compute-renewal'
import type { MemberProfileUpdate } from '@/domains/members/schema'
import { isMembershipActive } from '@/db/membership-utils'
import { getCurrentQuarterQueryOptions } from '@/domains/lessons/query-options'
import {
  getAllMembersLiteQueryOptions,
  getProcessedEntryIdsQueryOptions,
} from '@/domains/members/query-options'
import { getQuartersQueryOptions } from '@/domains/quarters/query-options'
import { createMember, markEntryProcessed } from '@/domains/members/server-fns'
import { isDevEnvironment } from '@/lib/env'
import { newMemberEmailFallback } from '@/lib/email-templates'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import Papa from 'papaparse'
import { Fragment, useMemo, useState } from 'react'
import { ManualAddMemberModal } from '@/components/members/ManualAddMemberModal'
import { requirePrivilegeForRoute } from '../lib/route-guards'

export const Route = createFileRoute('/membership-processing')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/membership-processing')
  },
  component: MembershipProcessingPage,
})

type ParseResult =
  | { kind: 'NewMember'; member: MemberProfileUpdate }
  | { kind: 'Error'; error: ParseError }

type ParseError =
  | { code: 'INVALID_FIELD'; message: string }
  | { code: 'DATA_LOADING'; message: string }

type DuplicateMatch = {
  wycNumber: number
  first: string | null
  last: string | null
  email: string | null
  matchMethod: string
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
      emailSimulated: boolean
    }
  | {
      kind: 'RenewedExisting'
      wycNumber: number
      quarterLabel: string
      emailSent: boolean
      emailSimulated: boolean
      emailAddress: string | null
    }
  | { kind: 'Error'; error: ParseError }

const REQUIRED_COLUMNS_CSV = `"Name: First","Name: Last",Email,"Quarterly or Annual Membership","What is your UW Status for the duration of your WYC membership?","Address: Address Line 1","Address: Address Line 2","Address: City","Address: State","Address: Zip/Postal Code","Address: Country","Primary Phone Number","Entry ID"`
const REQUIRED_COLUMNS = Papa.parse<string[]>(REQUIRED_COLUMNS_CSV, { header: false }).data[0]

function buildColumnMap(
  inputHeader: string[],
): { ok: true; map: Map<string, number> } | { ok: false; message: string } {
  const map = new Map<string, number>()
  const missing: string[] = []
  for (const col of REQUIRED_COLUMNS) {
    const idx = inputHeader.findIndex((h) => h.trim() === col)
    if (idx === -1) missing.push(col)
    else map.set(col, idx)
  }
  if (missing.length === REQUIRED_COLUMNS.length) {
    return {
      ok: false,
      message: 'No header row detected. The first row must contain column names.',
    }
  }
  if (missing.length > 0) {
    return { ok: false, message: `Missing required columns: ${missing.join(', ')}` }
  }
  return { ok: true, map }
}

function filterCsvForDisplay(csvLine: string, colMap: Map<string, number>): string {
  const cells = Papa.parse<string[]>(csvLine, { header: false }).data[0]
  const filtered = REQUIRED_COLUMNS.map((col) => {
    const idx = colMap.get(col)
    return idx !== undefined ? (cells[idx] ?? '') : ''
  })
  return Papa.unparse([filtered], { header: false })
}

const CATEGORY_VALUES = [
  'Student',
  'Student, but graduating, taking quarter off, etc.',
  'Employee/Retiree',
  'Neither',
] as const
type CategoryText = (typeof CATEGORY_VALUES)[number]

// Strip diacritics, punctuation, and whitespace so "O'Brien" / "OBrien" / "Jose" / "José" collapse.
function normalizeName(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

// Canonicalize for comparison; gmail ignores dots and +suffixes, so two spellings hit one inbox.
function canonicalEmail(raw: string): string {
  const e = raw.toLowerCase().trim()
  const at = e.indexOf('@')
  if (at === -1) return e
  const local = e.slice(0, at)
  const domain = e.slice(at + 1)
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${local.split('+')[0].replace(/\./g, '')}@gmail.com`
  }
  return `${local}@${domain}`
}

function MembershipProcessingPage() {
  const { data: allMembers } = useQuery(getAllMembersLiteQueryOptions())
  const { data: currentQuarter } = useQuery(getCurrentQuarterQueryOptions())
  const { data: quarters } = useQuery(getQuartersQueryOptions())
  const [memberState, setMemberState] = useState<PageState>({ kind: 'Initial' })
  const [batchInput, setBatchInput] = useState<string>('')
  const [activeLineInput, setActiveLineInput] = useState<string>('')
  const [batchItems, setBatchItems] = useState<BatchItem[]>([])
  const [activeBatchIndex, setActiveBatchIndex] = useState<number | null>(null)
  const [skipWycNumber, setSkipWycNumber] = useState<string>('')
  const [skippingIndex, setSkippingIndex] = useState<number | null>(null)
  const [columnMap, setColumnMap] = useState<Map<string, number> | null>(null)
  const [batchError, setBatchError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { data: processedEntryIds } = useQuery(getProcessedEntryIdsQueryOptions())
  const processedSet = useMemo(() => new Set(processedEntryIds ?? []), [processedEntryIds])
  const [showManualAddModal, setShowManualAddModal] = useState(false)

  // "Renew instead": record a renewal against a member surfaced as a duplicate.
  const [renewingDupeWyc, setRenewingDupeWyc] = useState<number | null>(null)
  const [renewDuration, setRenewDuration] = useState<RenewalDuration>('quarterly')
  const [renewAmount, setRenewAmount] = useState<string>('')
  const [renewSquareOrderId, setRenewSquareOrderId] = useState<string>('')
  const [renewSquarePaymentId, setRenewSquarePaymentId] = useState<string>('')
  const [renewSendEmail, setRenewSendEmail] = useState<boolean>(true)
  const [renewError, setRenewError] = useState<string | null>(null)
  const [renewSubmitting, setRenewSubmitting] = useState<boolean>(false)

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

  function findDuplicates(
    first: string,
    last: string,
    email: string,
    phone: string,
  ): DuplicateMatch[] {
    if (!allMembers || currentQuarter == null) return []
    const nFirst = normalizeName(first)
    const nLast = normalizeName(last)
    const cEmail = email.trim() ? canonicalEmail(email) : ''
    const nPhone = cleanPhone(phone)

    const matches: DuplicateMatch[] = []
    for (const m of allMembers) {
      const mFirst = normalizeName(m.first ?? '')
      const mLast = normalizeName(m.last ?? '')
      const reasons: string[] = []

      if (nFirst !== '' && nLast !== '' && mFirst === nFirst && mLast === nLast) {
        reasons.push('name')
      } else if (
        nLast !== '' &&
        mLast === nLast &&
        nFirst !== '' &&
        mFirst !== '' &&
        mFirst[0] === nFirst[0]
      ) {
        // Same last name + first initial catches nicknames like Mike/Michael.
        reasons.push('name (initial)')
      }

      if (cEmail !== '' && m.email && canonicalEmail(m.email) === cEmail) reasons.push('email')

      if (
        nPhone !== '' &&
        ((m.phone1 && cleanPhone(m.phone1) === nPhone) ||
          (m.phone2 && cleanPhone(m.phone2) === nPhone))
      ) {
        reasons.push('phone')
      }

      if (reasons.length > 0) {
        matches.push({
          wycNumber: m.wycNumber,
          first: m.first,
          last: m.last,
          email: m.email,
          matchMethod: reasons.join(' + '),
          status: isMembershipActive(m.expireQtrIndex, currentQuarter) ? 'active' : 'expired',
        })
      }
    }
    return matches
  }

  function parseInput(input: string, quartersData: QuarterRow[]): ParseResult {
    if (!columnMap) {
      return {
        kind: 'Error',
        error: { code: 'DATA_LOADING', message: 'Process batch data first' },
      }
    }

    const inputRow = Papa.parse<string[]>(input, { header: false }).data[0]

    const get = (key: string) => {
      const idx = columnMap.get(key)
      if (idx === undefined) throw new Error(`Unknown column: ${key}`)
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
    const email = get('Email')
    const rawCategory = get('What is your UW Status for the duration of your WYC membership?')
    const rawQuartersText = get('Quarterly or Annual Membership')

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

    // Renewals are self-service (/renew-membership), so the form only yields new
    // members. Returning members who sign up here are surfaced via findDuplicates.
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
        phone2: '',
        email,
        categoryId: extractCategoryID(category),
        expireQtrIndex,
        studentId: null,
        outToSea: false,
      } satisfies MemberProfileUpdate,
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

  function handleBatchProcess(overrideInput?: string): void {
    const raw = overrideInput ?? batchInput
    const parsed = Papa.parse<string[]>(raw, { header: false })
    const rows = parsed.data.filter((row) => row.some((cell) => cell.trim() !== ''))

    if (rows.length === 0) {
      setBatchError('No data found')
      setBatchItems([])
      return
    }

    const result = buildColumnMap(rows[0])
    if (!result.ok) {
      setBatchError(result.message)
      setBatchItems([])
      return
    }

    const map = result.map
    setColumnMap(map)
    setBatchError(null)

    const dataRows = rows.slice(1)
    const firstIdx = map.get('Name: First')!
    const lastIdx = map.get('Name: Last')!
    const emailIdx = map.get('Email')!
    const entryIdIdx = map.get('Entry ID')!

    const items: BatchItem[] = dataRows
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
    const result = parseInput(lineInput, quarters ?? [])
    if (result.kind === 'NewMember') {
      const duplicates = findDuplicates(
        result.member.first,
        result.member.last,
        result.member.email,
        result.member.phone1,
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
        emailSimulated: result.emailSimulated,
      })
    } catch (error: any) {
      setMemberState({
        kind: 'Error',
        error: { code: 'INVALID_FIELD', message: error.message ?? 'Failed to create member' },
      })
    }
  }

  function openRenewInstead(wycNumber: number): void {
    setRenewingDupeWyc(wycNumber)
    setRenewDuration('quarterly')
    setRenewAmount('')
    setRenewSquareOrderId('')
    setRenewSquarePaymentId('')
    setRenewSendEmail(true)
    setRenewError(null)
  }

  async function handleRenewInstead(): Promise<void> {
    if (memberState.kind !== 'NewMember' || renewingDupeWyc == null) return
    const amount = Number(renewAmount)
    if (!Number.isFinite(amount) || amount < 0) {
      setRenewError('Enter the amount paid (in dollars).')
      return
    }
    // categoryId 1 = student.
    const tier = memberState.member.categoryId === 1 ? 'student' : 'nonstudent'
    setRenewSubmitting(true)
    setRenewError(null)
    try {
      const result = await adminRecordRenewal({
        data: {
          wycNumber: renewingDupeWyc,
          targetExpireQtr: memberState.member.expireQtrIndex,
          tier,
          duration: renewDuration,
          amountCents: Math.round(amount * 100),
          squareOrderId: renewSquareOrderId.trim() || null,
          squarePaymentId: renewSquarePaymentId.trim() || null,
          formEmail: memberState.member.email,
          sendEmail: renewSendEmail,
        },
      })
      const activeBatchItem = activeBatchIndex != null ? classifiedBatch[activeBatchIndex] : null
      if (activeBatchItem) {
        await markEntryProcessed({
          data: { entryId: activeBatchItem.entryId, wycNumber: result.wycNumber },
        })
      }
      setRenewingDupeWyc(null)
      setMemberState({
        kind: 'RenewedExisting',
        wycNumber: result.wycNumber,
        quarterLabel: result.quarterLabel,
        emailSent: result.emailSent,
        emailSimulated: result.emailSimulated,
        emailAddress: result.emailAddress,
      })
    } catch (error: any) {
      setRenewError(error?.message ?? 'Failed to record the renewal')
    } finally {
      setRenewSubmitting(false)
    }
  }

  const newMemberExampleData = `Sahil,Chowdhury,sahilch@uw.edu,"Summer 2026",Student,"217 245th pl ne",,Sammamish,WA,98074,US,'+14255892521,9999`
  return (
    <div className="p-8">
      {isDevEnvironment() && (
        <div className="mb-4 rounded border border-yellow-400 bg-yellow-50 p-4 text-yellow-900 font-semibold">
          Development database — testing only
        </div>
      )}
      <div className="flex gap-2 mb-4">
        <Button onClick={() => setShowManualAddModal(true)}>Manual Add</Button>
        <Button
          variant="secondary"
          onClick={() => {
            const input = REQUIRED_COLUMNS_CSV + '\n' + newMemberExampleData
            setBatchInput(input)
            handleBatchProcess(input)
          }}
        >
          Set new member example
        </Button>
      </div>
      <Label>Paste CSV with header row</Label>
      <Textarea
        value={batchInput}
        onChange={(e) => setBatchInput(e.target.value)}
        rows={6}
        className="font-mono text-xs"
      />
      <Button className="mt-4" onClick={() => handleBatchProcess()}>
        Process
      </Button>
      {batchError && <p className="mt-2 text-red-600">{batchError}</p>}

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

      {activeBatchIndex != null && memberState.kind !== 'Initial' && columnMap && (
        <pre className="mt-4 p-3 rounded bg-muted text-xs font-mono whitespace-pre-wrap break-all">
          {filterCsvForDisplay(classifiedBatch[activeBatchIndex]?.csvLine, columnMap)}
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
                    <div className="flex items-center gap-2">
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
                        variant="secondary"
                        onClick={() =>
                          renewingDupeWyc === d.wycNumber
                            ? setRenewingDupeWyc(null)
                            : openRenewInstead(d.wycNumber)
                        }
                      >
                        Renew #{d.wycNumber} instead
                      </Button>
                    </div>
                    {renewingDupeWyc === d.wycNumber && (
                      <div className="mt-2 ml-1 flex flex-col gap-2 rounded border border-input bg-background p-3 text-foreground">
                        <p className="text-sm text-muted-foreground">
                          Records a renewal against WYC #{d.wycNumber} with no Square charge. Pull
                          the order/payment IDs from the Square dashboard if you want them linked.
                        </p>
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <Label className="text-xs">Duration</Label>
                            <Select
                              value={renewDuration}
                              onValueChange={(v) => setRenewDuration(v as RenewalDuration)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="annual">Annual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Amount paid ($)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={renewAmount}
                              onChange={(e) => setRenewAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-32"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Square order ID (optional)</Label>
                            <Input
                              value={renewSquareOrderId}
                              onChange={(e) => setRenewSquareOrderId(e.target.value)}
                              className="w-56"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Square payment ID (optional)</Label>
                            <Input
                              value={renewSquarePaymentId}
                              onChange={(e) => setRenewSquarePaymentId(e.target.value)}
                              className="w-56"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={renewSendEmail}
                            onCheckedChange={(c) => setRenewSendEmail(c === true)}
                          />
                          Send renewal confirmation email
                        </label>
                        {renewError && <p className="text-sm text-red-600">{renewError}</p>}
                        <div>
                          <Button size="sm" onClick={handleRenewInstead} disabled={renewSubmitting}>
                            {renewSubmitting ? 'Recording…' : 'Confirm renewal'}
                          </Button>
                        </div>
                      </div>
                    )}
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
            <>
              <p className="text-green-600">Welcome email sent to {memberState.member.email}</p>
              {memberState.emailSimulated && <EmailSimulatedNotice />}
            </>
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
      {memberState.kind === 'RenewedExisting' && (
        <div className="mt-4">
          <p className="text-green-600 font-semibold">
            Renewed WYC #{memberState.wycNumber} through {memberState.quarterLabel}
          </p>
          {memberState.emailSent ? (
            <>
              <p className="text-green-600">
                Confirmation email sent
                {memberState.emailAddress ? ` to ${memberState.emailAddress}` : ''}
              </p>
              {memberState.emailSimulated && <EmailSimulatedNotice />}
            </>
          ) : (
            <p className="text-muted-foreground">No confirmation email sent.</p>
          )}
          {batchItems.length > 0 && (
            <Button className="mt-4" onClick={handleDone}>
              Done
            </Button>
          )}
        </div>
      )}
      {memberState.kind === 'Error' && (
        <p className="mt-4 text-red-600">{memberState.error.message}</p>
      )}
      {showManualAddModal && (
        <ManualAddMemberModal
          onClose={() => setShowManualAddModal(false)}
          onSubmit={(member) => {
            const duplicates = findDuplicates(
              member.first,
              member.last,
              member.email,
              member.phone1,
            )
            setMemberState({ kind: 'NewMember', member, duplicates })
            setActiveBatchIndex(null)
          }}
        />
      )}
    </div>
  )
}
