export const guestWaiverVersion = 'guest-participant-agreement-v1'

export type GuestWaiverBoldText =
  | string
  | {
      text: string
      occurrences: readonly number[]
    }

export type GuestWaiverParagraph = {
  text: string
  bold: readonly GuestWaiverBoldText[]
}

export type GuestWaiverTextSegment = {
  text: string
  bold: boolean
}

function waiverParagraph(
  text: string,
  bold: readonly GuestWaiverBoldText[] = [],
): GuestWaiverParagraph {
  return { text, bold }
}

export function getGuestWaiverTextSegments(
  paragraph: GuestWaiverParagraph,
): GuestWaiverTextSegment[] {
  const ranges = paragraph.bold
    .flatMap((boldText) => {
      const phrase = typeof boldText === 'string' ? boldText : boldText.text
      const matches: Array<{ start: number; end: number }> = []
      let start = paragraph.text.indexOf(phrase)
      let occurrence = 1

      while (start !== -1) {
        const end = start + phrase.length
        if (typeof boldText === 'string' || boldText.occurrences.includes(occurrence)) {
          matches.push({ start, end })
        }
        start = paragraph.text.indexOf(phrase, end)
        occurrence += 1
      }

      return matches
    })
    .sort((left, right) => left.start - right.start || right.end - left.end)

  const mergedRanges: Array<{ start: number; end: number }> = []
  for (const range of ranges) {
    const previous = mergedRanges.at(-1)
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end)
    } else {
      mergedRanges.push({ ...range })
    }
  }

  const segments: GuestWaiverTextSegment[] = []
  let cursor = 0
  for (const range of mergedRanges) {
    if (range.start > cursor) {
      segments.push({ text: paragraph.text.slice(cursor, range.start), bold: false })
    }
    segments.push({ text: paragraph.text.slice(range.start, range.end), bold: true })
    cursor = range.end
  }

  if (cursor < paragraph.text.length) {
    segments.push({ text: paragraph.text.slice(cursor), bold: false })
  }

  return segments.length > 0 ? segments : [{ text: paragraph.text, bold: false }]
}

export const guestWaiverSections = [
  {
    id: 'intro',
    title: 'Agreement',
    paragraphs: [
      waiverParagraph(
        'IMPORTANT: This Agreement affects your legal rights - READ CAREFULLY BEFORE SIGNING. By signing it, you are agreeing to (among other things) assume risks, release claims, waive rights, and indemnify Washington Yacht Club ("WYC") from harm.',
        [
          'IMPORTANT:',
          'READ CAREFULLY BEFORE SIGNING. By signing it, you are agreeing to (among other things) assume risks, release claims, waive rights, and indemnify Washington Yacht Club ("WYC") from harm.',
        ],
      ),
      waiverParagraph(
        "I desire to participate in activities organized by WYC and/or make use of equipment which may be owned by WYC. In consideration of being permitted to participate in WYC activities and/or make use of WYC equipment, and in recognition of WYC's reliance hereon, I agree to all the terms and conditions set forth in this Agreement.",
      ),
    ],
  },
  {
    id: 'assumptionOfRisk',
    title: 'ASSUMPTION OF RISK',
    paragraphs: [
      waiverParagraph(
        'I understand that SAILING IS A HIGH-RISK RECREATIONAL ACTIVITY; that sailing, boating, other waterfront activities, volunteer work, instruction, vessel maintenance, use of University of Washington property, and all other WYC related activities I choose to participate in ("Activities") involve the risk of MINOR AND SEVERE PHYSICAL INJURY, including PARALYSIS AND DEATH, and risk of PROPERTY DAMAGE, among other inherent risks, dangers and hazards ("Risks"); such Risks are a common, ordinary, and foreseeable part of the activities which I may participate in.',
        [
          'SAILING IS A HIGH-RISK RECREATIONAL ACTIVITY;',
          'MINOR AND SEVERE PHYSICAL INJURY',
          'PARALYSIS AND DEATH',
          'PROPERTY DAMAGE',
          'Risks',
        ],
      ),
      waiverParagraph(
        'I acknowledge that MY PARTICIPATION IS VOLUNTARY AND AT MY OWN RISK; with full understanding and appreciation of the Risks involved,',
        ['MY PARTICIPATION IS VOLUNTARY AND AT MY OWN RISK'],
      ),
      waiverParagraph(
        'I agree that I AM SOLELY RESPONSIBLE FOR MY OWN SAFETY AND FOR ALL DAMAGES arising from my participation in club related activities, or using club vessels, facilities, or equipment;',
        ['I AM SOLELY RESPONSIBLE FOR MY OWN SAFETY AND FOR ALL DAMAGES'],
      ),
      waiverParagraph(
        'I understand and accept that I MAY SUFFER TEMPORARY, PERMANENT, OR EVEN FATAL INJURIES, even if I follow all advice and instructions given by WYC directors, chiefs, officers, instructors, employees, volunteers, or other agents ("the Club"); that training, coaching, instruction, supervision, and enforcement of club rules by the Club does not and cannot guarantee my personal safety; and that I may freely choose not to participate in any activity which I subjectively believe to be unsafe.',
        ['I MAY SUFFER TEMPORARY, PERMANENT, OR EVEN FATAL INJURIES'],
      ),
      waiverParagraph(
        'I represent that I am physically fit and capable of performing all club Activities I choose to participate in. I know of no medical or health reason why I should not participate in any club Activities. I agree that I will personally and subjectively evaluate each club Activity before participating to determine whether it is safe and suitable for me. If at any time I feel I cannot or should not participate, or continue my participation, I will discontinue my participation immediately. I will immediately notify WYC of any health problem or medical condition that could affect my ability to participate safely in any Activities.',
      ),
      waiverParagraph(
        'I KNOWINGLY AND VOLUNTARILY ASSUME ANY AND ALL RISKS, WHETHER KNOWN OR UNKNOWN, OF INJURY, DISABILITY, DEATH, AND DAMAGES ARISING FROM PARTICIPATING IN WYC RELATED ACTIVITIES.',
        [
          'I KNOWINGLY AND VOLUNTARILY ASSUME ANY AND ALL RISKS, WHETHER KNOWN OR UNKNOWN, OF INJURY, DISABILITY, DEATH, AND DAMAGES ARISING FROM PARTICIPATING IN WYC RELATED ACTIVITIES.',
        ],
      ),
    ],
  },
  {
    id: 'waiverAndRelease',
    title: 'WAIVER AND RELEASE OF LIABILITY',
    paragraphs: [
      waiverParagraph(
        'I hereby expressly WAIVE AND RELEASE ANY AND ALL CLAIMS, NOW KNOWN OR HEREAFTER KNOWN, AGAINST WYC AND THE UNIVERSITY OF WASHINGTON ("UW"), their officers, directors, members, employees, agents, affiliates, representatives, successors, and assigns (hereinafter collectively referred to as "Releasees") ON ACCOUNT OF INJURY, DISABILITY, DEATH, AND DAMAGES RELATING TO PARTICIPATION IN WYC RELATED ACTIVITIES, whether arising out of the ordinary negligence of WYC or any other Releasees or otherwise.',
        [
          'WAIVE AND RELEASE ANY AND ALL CLAIMS, NOW KNOWN OR HEREAFTER KNOWN, AGAINST WYC AND THE UNIVERSITY OF WASHINGTON ("UW")',
          { text: 'Releasees', occurrences: [1] },
          'ON ACCOUNT OF INJURY, DISABILITY, DEATH, AND DAMAGES RELATING TO PARTICIPATION IN WYC RELATED ACTIVITIES',
        ],
      ),
      waiverParagraph(
        'I agree that I will not sue or bring any such claim, and FOREVER RELEASE AND DISCHARGE WYC AND ALL RELEASEES FROM LIABILITY UNDER SUCH CLAIMS.',
        ['FOREVER RELEASE AND DISCHARGE WYC AND ALL RELEASEES FROM LIABILITY UNDER SUCH CLAIMS.'],
      ),
      waiverParagraph(
        'I hereby unconditionally RELIEVE WYC AND UW OF ALL DUTY TO PROTECT ME FROM HARM in connection with any Activities in which I participate.',
        ['RELIEVE WYC AND UW OF ALL DUTY TO PROTECT ME FROM HARM'],
      ),
      waiverParagraph(
        'I agree that at all times I will abide by all applicable WYC, University of Washington, Local, State, and Federal laws, rules, and regulations governing my actions while a participant in club Activities; if I should choose not to comply with any such laws, rules, or regulations, I ACCEPT FULL RESPONSIBILITY FOR ALL DAMAGES OR OTHER CONSEQUENCES arising from my non-compliance.',
        ['I ACCEPT FULL RESPONSIBILITY FOR ALL DAMAGES OR OTHER CONSEQUENCES'],
      ),
    ],
  },
  {
    id: 'indemnification',
    title: 'INDEMNIFICATION',
    paragraphs: [
      waiverParagraph(
        'I AGREE TO DEFEND, INDEMNIFY, AND HOLD HARMLESS WYC, UW, AND OTHER RELEASEES FROM AND AGAINST ANY AND ALL CLAIMS, ACTIONS, COSTS, DAMAGES OR OTHER LIABILITIES arising out or resulting from any claim of a third-party related to participation in WYC related Activities, including any claim related to my own negligence or the ordinary negligence of WYC.',
        [
          'I AGREE TO DEFEND, INDEMNIFY, AND HOLD HARMLESS WYC, UW, AND OTHER RELEASEES FROM AND AGAINST ANY AND ALL CLAIMS, ACTIONS, COSTS, DAMAGES OR OTHER LIABILITIES',
          'Activities',
        ],
      ),
    ],
  },
  {
    id: 'consentToTreatment',
    title: 'CONSENT TO TREATMENT',
    paragraphs: [
      waiverParagraph(
        'Should I require emergency medical treatment as a result of accident or illness arising during my participation in club Activities, I consent to such treatment.',
        ['Activities'],
      ),
      waiverParagraph(
        'I acknowledge that WYC, as a volunteer-run public charity with limited resources, does not provide health or accident insurance for members or participants during sailing or other club Activities, and I agree to be financially responsible for any medical bills incurred as a result of emergency medical treatment provided.',
        ['Activities'],
      ),
      waiverParagraph(
        'I will notify WYC in writing if I have or I develop a medical condition or health problem for which emergency medical personnel should be informed.',
      ),
    ],
  },
  {
    id: 'miscellaneous',
    title: 'MISCELLANEOUS',
    paragraphs: [
      waiverParagraph(
        'Any disputes arising out of or relating to this Agreement shall be construed in accordance with, and governed by, the laws of the State of Washington, without reference to principles governing choice or conflicts of laws and may only be brought in the federal and state courts located in King County, Washington.',
      ),
      waiverParagraph(
        'If any portion of this Agreement is held to be void or unenforceable, I agree that the remaining terms shall remain in full force and effect.',
      ),
      waiverParagraph(
        'I acknowledge that this Agreement is binding upon my heirs, executors, dependents, beneficiaries, and personal representatives, and assigns.',
      ),
      waiverParagraph('I acknowledge that this Agreement will remain in effect indefinitely.'),
    ],
  },
] as const

export type GuestWaiverSectionId = (typeof guestWaiverSections)[number]['id']

export const sectionAcknowledgement =
  'By checking this box I certify that I HAVE READ THE ABOVE SECTION and agree to be bound by its conditions.'

export const finalGuestWaiverAcknowledgement = [
  waiverParagraph(
    'BY MY SIGNATURE BELOW, I ACKNOWLEDGE THAT I AM EIGHTEEN (18) YEARS OF AGE OR OLDER, THAT I HAVE READ AND UNDERSTAND ALL OF THE TERMS IN THIS AGREEMENT, AND THAT I AM VOLUNTARILY CHOOSING TO PARTICIPATE IN WYC RELATED ACTIVITIES.',
    ['BY MY SIGNATURE BELOW'],
  ),
  waiverParagraph(
    'I FULLY ASSUME AND ACCEPT ALL RISKS, WHETHER KNOWN OR UNKNOWN, AND VOLUNTARILY GIVE UP SUBSTANTIAL LEGAL RIGHTS, INCLUDING BUT NOT LIMITED TO THE RIGHT TO SUE WYC OR UW.',
  ),
] as const
