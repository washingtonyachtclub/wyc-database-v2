import { Member } from '@/db/types';
import { getAllMembersLiteQueryOptions } from '@/lib/members-query-options';
import { getDatabaseName, getNextWycNumber } from '@/lib/members-server-fns';
import { newMemberEmail } from '@/lib/membership-processing/new-member-email-template';
import { PASSWORD_WORDLIST } from '@/lib/membership-processing/password-wordlist';
import { returningMemberEmail } from '@/lib/membership-processing/returning-member-email-template';
import { newMemberSQLQuery, returningMemberSQLQuery } from '@/lib/membership-processing/sql-queries';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import Papa from "papaparse";
import { Fragment, useState } from 'react';

export const Route = createFileRoute('/membership-processing')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: '/membership-processing' },
      })
    }
  },
  component: MembershipProcessingPage,
})

type NewMember = Member
export type OldMember = {
  wycNumber: number;
  newExpireQtr: number;
  first: string;
  last: string;
  email: string;
}
type ParseResult =
| {kind: 'NewMember', member: NewMember}
| {kind: 'OldMember', member: OldMember}
| {kind: 'Error', error: string}

type PageState =
| {kind: 'Initial'}
| {kind: 'NewMember', member: NewMember, password: string}
| {kind: 'OldMember', member: OldMember}
| {kind: 'Error', error: string}

const CATEGORY_VALUES = ['Student', 'Employee/Retiree', 'Neither'] as const
type CategoryText = (typeof CATEGORY_VALUES)[number]

const QUARTER_VALUES = ['Spring 2026', 'Spring 2026, Summer 2026, Fall 2026, Winter 2027'] as const
type QuarterText = (typeof QUARTER_VALUES)[number]

const MEMBERSHIP_STATUS_VALUES = ['New member', 'Current member looking to renew', 'Previous member looking to rejoin'] as const

function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative mt-2 rounded border bg-muted">
      <button
        onClick={handleCopy}
        className="absolute top-2 left-2 rounded border bg-background px-2 py-1 text-xs hover:bg-accent"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre className="whitespace-pre-wrap p-4 pl-20 text-sm">{text}</pre>
    </div>
  );
}

function MembershipProcessingPage() {

  const { data: allMembers } = useQuery(getAllMembersLiteQueryOptions());
  const [memberState, setMemberState] = useState<PageState>({kind: 'Initial'});
  const [input, setInput] = useState<string>('');

  const headerString = `"Name: First","Name: Last",Email,"Quarterly or Annual Membership","What is your UW Status for the duration of your WYC membership?","What best describes your WYC membership status?","What is your WYC number?","Address: Address Line 1","Address: Address Line 2","Address: City","Address: State","Address: Zip/Postal Code","Address: Country","Primary Phone Number","Alternative Phone Number"`;
  const headerRow = Papa.parse<string[]>(headerString, {header: false}).data[0];

  type Ok<T> = { ok: true; value: T };
  type Err = { ok: false; error: string };
  type Result<T> = Ok<T> | Err;
  function parseOneOf<T extends string>(
    value: string,
    allowed: readonly T[],
    fieldName: string
  ): Result<T> {
    if ((allowed as readonly string[]).includes(value)) {
      return { ok: true, value: value as T };
    }
    return { ok: false, error: `Invalid ${fieldName}: "${value}"` };
  }

  function generatePassword(): string {
    const array = new Uint32Array(3);
    crypto.getRandomValues(array);
    const capitalize = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
    const word1 = capitalize(PASSWORD_WORDLIST[array[0] % PASSWORD_WORDLIST.length]);
    const word2 = capitalize(PASSWORD_WORDLIST[array[1] % PASSWORD_WORDLIST.length]);
    const word3 = capitalize(PASSWORD_WORDLIST[array[2] % PASSWORD_WORDLIST.length]);
    return word1 + word2 + word3;
  }

  function extractExpireQtrSchoolText(quarterIndex: number): string {
    switch (quarterIndex) {
      case 110: return 'Spring 2026';
      case 113: return 'Winter 2027';
      default: throw new Error(`Unknown quarter index: ${quarterIndex}`);
    }
  }
  // quartersText: "Winter 2026, Spring 2026, Summer 2026, Fall 2026" or "Spring 2026"
  // extract the last one in list, convert to quarterIndex
  function extractExpireQtr(text: QuarterText): number {
    switch (text) {
      case 'Spring 2026': return 110;
      case 'Spring 2026, Summer 2026, Fall 2026, Winter 2027': return 113;
    }
  }

  function extractCategoryID(text: CategoryText) {
    switch (text) {
      case 'Student': return 1;
      case 'Employee/Retiree': return 2;
      case 'Neither': return 6
    }
  }

  function parseInput(input: string, nextWycNumber: number): ParseResult {
    const inputRow = Papa.parse<string[]>(input, { header: false}).data[0];

    const get = (key: string) => {
      const idx = headerRow.indexOf(key);
      if (idx === -1) throw new Error(`Unknown column: ${key}`);
      return inputRow[idx] ?? '';
    };

    const first = get("Name: First");
    const last = get("Name: Last");
    const addressLine1 = get("Address: Address Line 1");
    const addressLine2 = get("Address: Address Line 2");
    const city = get("Address: City");
    const state = get("Address: State");
    const zipCode = get("Address: Zip/Postal Code");
    const phone1 = get("Primary Phone Number");
    const phone2 = get("Alternative Phone Number");
    const email = get("Email");
    const rawCategory = get("What is your UW Status for the duration of your WYC membership?");
    const rawQuartersText = get("Quarterly or Annual Membership");
    const wycNumber = get("What is your WYC number?");
    const rawMembershipStatus = get("What best describes your WYC membership status?");

    const categoryResult = parseOneOf(rawCategory, CATEGORY_VALUES, 'category')
    if (!categoryResult.ok) return { kind: 'Error', error: categoryResult.error }
    const category = categoryResult.value;

    const quartersTextResult = parseOneOf(rawQuartersText, QUARTER_VALUES, 'quarters')
    if (!quartersTextResult.ok) return { kind: 'Error', error: quartersTextResult.error }
    const quartersText = quartersTextResult.value;

    const membershipStatusResult = parseOneOf(rawMembershipStatus, MEMBERSHIP_STATUS_VALUES, 'membership status')
    if (!membershipStatusResult.ok) return { kind: 'Error', error: membershipStatusResult.error }
    const membershipStatus = membershipStatusResult.value;

    // input validation
    if (inputRow.length !== headerRow.length) {
      return {kind: 'Error', error: 'Expected ' + headerRow.length + ' cells, got ' + inputRow.length}
    } else if (membershipStatus !== 'New member' && !wycNumber) {
      return {kind: 'Error', error: 'Returning member but no WYC number provided'}
    } else if (wycNumber && isNaN(Number(wycNumber))) {
      return {kind: 'Error', error: 'Invalid WYC number provided'}
      // todo: better wycNumber validation
    }

    if (!allMembers) return { kind: 'Error', error: 'Member data still loading' }

    if (wycNumber) {
      const dbMember = allMembers?.find(m => m.wycNumber === Number(wycNumber));
      if (!dbMember) {
        return {kind: 'Error', error: `WYC number ${wycNumber} not found in database`}
      }
      if (dbMember.first?.toLowerCase() !== first.toLowerCase() || dbMember.last?.toLowerCase() !== last.toLowerCase()) {
        return {kind: 'Error', error: `Name mismatch for WYC #${wycNumber}:\n  Form: "${first} ${last}"\n  Database: "${dbMember.first} ${dbMember.last}"`}
      }
      return {kind: 'OldMember', member: {wycNumber: Number(wycNumber), newExpireQtr: extractExpireQtr(quartersText), first: first, last: last, email: email}}
    } else {
      return {
        kind: 'NewMember',
        member: {
          last: last,
          first: first,
          streetAddress: [addressLine1, addressLine2].filter(Boolean).join(' '),
          city: city,
          state: state,
          zipCode: zipCode,
          phone1: phone1,
          phone2: phone2,
          email: email,
          categoryId: extractCategoryID(category),
          expireQtrIndex: extractExpireQtr(quartersText),
          studentId: null,
          outToSea: false,
          wycNumber: nextWycNumber,
        }
      }
    }
  }

  async function handleProcess(overrideInput?: string): Promise<void> {
    const dbName = await getDatabaseName()
    if (dbName !== 'production') {
      setMemberState({kind: 'Error', error: `Connected to "${dbName}" — switch to prod before processing`})
      return
    }
    const nextWycNumber = await getNextWycNumber()
    const result = parseInput(overrideInput ?? input, nextWycNumber)
    if (result.kind === 'NewMember') {
      setMemberState({...result, password: generatePassword()})
    } else {
      setMemberState(result)
    }
  }

  const newMemberExampleInput = `Sahil,Chowdhury,sahilch@uw.edu,"Spring 2026",Student,"New member",,"217 245th pl ne",,Sammamish,WA,98074,US,'+14255892521,`
  const oldMemberExampleInput = `Luka,Ukrainczyk,lukrainczyk@gmail.com,"Spring 2026",Neither,"Current member looking to renew",17323,,,,,,,,`
  return (
    <div className="p-8">
      <button className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => { setInput(newMemberExampleInput); handleProcess(newMemberExampleInput) }}>
        Set new member example
      </button>
      <button className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => { setInput(oldMemberExampleInput); handleProcess(oldMemberExampleInput) }}>
        Set old member example
      </button>
      <label>
        Enter one comma delimited line of the form
      </label>
      <input
        type="text"
        className="block w-full px-3 py-2 border-2 border-border rounded focus:outline-none focus:border-primary"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => handleProcess()}>
        Process
      </button>

      {(memberState.kind === 'NewMember') && (
        <div className="mt-4">
          <h3 className="font-semibold">New Member</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4">
            {Object.entries(memberState.member).map(([key, value]) => (
              <Fragment key={key}>
                <dt className="font-semibold text-right">{key}:</dt>
                <dd>{String(value)}</dd>
              </Fragment>
            ))}
          </dl>
          <CopyBox text={memberState.member.email} />
          <CopyBox text={newMemberEmail(memberState.member, memberState.password)} />
          <CopyBox text={newMemberSQLQuery(memberState.member, memberState.password)} />
        </div>
      )}
      {(memberState.kind === 'OldMember') && (
        <div className="mt-4">
          <h3 className="font-semibold">Old Member</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4">
            {Object.entries(memberState.member).map(([key, value]) => (
              <Fragment key={key}>
                <dt className="font-semibold text-right">{key}:</dt>
                <dd>{String(value)}</dd>
              </Fragment>
            ))}
          </dl>
          <CopyBox text={memberState.member.email} />
          <CopyBox text={returningMemberEmail(memberState.member.first, memberState.member.last, memberState.member.wycNumber, extractExpireQtrSchoolText(memberState.member.newExpireQtr))} />
          <CopyBox text={returningMemberSQLQuery(memberState.member.wycNumber, memberState.member.newExpireQtr)}/>
        </div>
      )}
      {memberState.kind === 'Error' && (
        <p className="mt-4 text-red-600">{memberState.error}</p>
      )}
    </div>
  )
}

