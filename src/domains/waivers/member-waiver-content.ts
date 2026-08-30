import { waiverParagraph } from './waiver-content'

export const memberWaiverVersion = 'member-participant-waiver-v1'

export const memberWaiverIntro = [
  waiverParagraph(
    'Participant’s ACKNOWLEDGEMENT OF RISK, WAIVER AND RELEASE OF LIABILITY, and CONSENT TO TREATMENT',
    [
      'Participant’s ACKNOWLEDGEMENT OF RISK,',
      'WAIVER AND RELEASE OF LIABILITY,',
      'and CONSENT TO TREATMENT',
    ],
  ),
  waiverParagraph(
    'This is a BINDING CONTRACT that modifies your legal rights — READ CAREFULLY BEFORE SIGNING.',
  ),
] as const

export const memberWaiverSections = [
  {
    id: 'acknowledgementOfRisk',
    title: 'ACKNOWLEDGEMENT OF RISK',
    paragraphs: [
      waiverParagraph(
        'I have chosen to accept Membership in Washington Yacht Club (“WYC”). I hereby acknowledge that SAILING IS A HIGH-RISK RECREATIONAL ACTIVITY; that sailing, boating, other waterfront activities, volunteer work, instruction, vessel maintenance, use of University of Washington property and all other WYC related activities and locations where I may choose to participate as a member (“Activities”) involve the possibility of both MINOR AND SEVERE PHYSICAL INJURY, including PARALYSIS AND DEATH, among other inherent risks, dangers and hazards (“Risks”); such Risks are a common, ordinary and foreseeable part of the Activities which I may choose to participate in as a member; and BY CHOOSING TO PARTICIPATE, I KNOWINGLY AND VOLUNTARILY ASSUME THESE RISKS.',
        [
          '(“WYC”)',
          'SAILING IS A HIGH-RISK RECREATIONAL ACTIVITY',
          '(“Activities”)',
          'MINOR AND SEVERE PHYSICAL INJURY, including PARALYSIS AND DEATH',
          'BY CHOOSING TO PARTICIPATE, I KNOWINGLY AND VOLUNTARILY ASSUME THESE RISKS',
        ],
      ),
      waiverParagraph(
        'I agree that as a member of WYC MY PARTICIPATION IS VOLUNTARY AND AT MY OWN RISK; with full understanding and appreciation of the Risks involved, I agree that I AM SOLELY RESPONSIBLE FOR MY OWN SAFETY AND FOR ALL DAMAGES arising from my participation as a club member, in club related activities, or using club vessels, facilities or equipment; I understand and accept that I MAY SUFFER TEMPORARY, PERMANENT OR EVEN FATAL INJURIES, even if I follow all advice and instructions given by WYC directors, chiefs, officers, instructors, employees, volunteers or other agents (“the Club”); that training, coaching, instruction, supervision, and enforcement of club rules by the Club does not and cannot guarantee my personal safety; that I may freely choose not to participate in any activity which I subjectively believe to be unsafe; and that BY CHOOSING TO PARTICIPATE I KNOWINGLY AND VOLUNTARILY ASSUME ALL RISKS.',
        [
          'WYC MY PARTICIPATION IS VOLUNTARY AND AT MY OWN RISK',
          'Risks',
          'I agree that I AM SOLELY RESPONSIBLE FOR MY OWN SAFETY AND FOR ALL DAMAGES',
          'I MAY SUFFER TEMPORARY, PERMANENT OR EVEN FATAL INJURIES,',
          '(“the Club”)',
          { text: 'the Club', occurrences: [2] },
          'BY CHOOSING TO PARTICIPATE I KNOWINGLY AND VOLUNTARILY ASSUME ALL RISKS',
        ],
      ),
      waiverParagraph(
        'I represent that I am physically fit and capable of performing all club Activities I choose to participate in. I know of no medical or health reason why I should not participate in any club Activities as a WYC member. I agree that I will personally and subjectively evaluate each club Activity before participating to determine whether it is safe and suitable for me. If at any time I feel I cannot or should not participate, or continue my participation, I will discontinue my participation immediately. I will immediately notify WYC of any health problem or medical condition that could affect my ability to participate safely in any Activities.',
        ['Activities', 'Activity'],
      ),
    ],
    orderedItems: [],
  },
  {
    id: 'waiverAndRelease',
    title: 'WAIVER AND RELEASE OF LIABILITY',
    paragraphs: [
      waiverParagraph(
        'In partial consideration for WYC acceptance of my application for membership, and in exchange for participation in the Activities provided by the club, and the use of club facilities or equipment, I agree to the following provisions:',
        ['Activities'],
      ),
    ],
    orderedItems: [
      waiverParagraph(
        'I unconditionally WAIVE AND RELEASE ALL CLAIMS, AND AGREE TO HOLD HARMLESS, DEFEND AND INDEMNIFY WYC AND THE UNIVERSITY OF WASHINGTON, ITS OFFICERS, AGENTS AND EMPLOYEES (“UW”) FROM ANY CLAIM, COSTS, DAMAGES OR OTHER LIABILITY for injury, damages or losses arising from my participation in any club Activities, INCLUDING THOSE RESULTING FROM NEGLIGENCE, against UW, WYC, its directors, officers, employees, volunteers, members and/or agent in the course and within the scope of their WYC-imposed duties;',
        [
          'WAIVE AND RELEASE ALL CLAIMS, AND AGREE TO HOLD HARMLESS, DEFEND AND INDEMNIFY WYC AND THE UNIVERSITY OF WASHINGTON, ITS OFFICERS, AGENTS AND EMPLOYEES (“UW”) FROM ANY CLAIM, COSTS, DAMAGES OR OTHER LIABILITY',
          'Activities, INCLUDING THOSE RESULTING FROM NEGLIGENCE',
        ],
      ),
      waiverParagraph(
        'I hereby unconditionally RELIEVE WYC AND UW OF ALL DUTY TO PROTECT ME FROM HARM in connection with any Activities in which I participate;',
        ['RELIEVE WYC AND UW OF ALL DUTY TO PROTECT ME FROM HARM', 'Activities'],
      ),
      waiverParagraph(
        'I agree that at all times I will abide by all applicable WYC, University of Washington, Local, State and Federal laws, rules and regulations governing my actions while a participant in club Activities; if I should choose not to comply with any such laws, rules or regulation I ACCEPT FULL RESPONSIBILITY FOR ALL DAMAGES OR OTHER CONSEQUENCES arising from my non-compliance, and I AGREE TO HOLD HARMLESS, DEFEND AND INDEMNIFY WYC AND UW from any claim, legal action, or enforcement that may arise from my non-compliance;',
        [
          'Activities',
          'I ACCEPT FULL RESPONSIBILITY FOR ALL DAMAGES OR OTHER CONSEQUENCES',
          'I AGREE TO HOLD HARMLESS, DEFEND AND INDEMNIFY WYC AND UW',
        ],
      ),
      waiverParagraph(
        'I agree that this CONTRACT shall be construed in accordance with, and governed by, the laws of the State of Washington, without reference to principles governing choice or conflicts of laws; I agree that any lawsuit against WYC and/or UW must be filed and maintained in state courts sitting in King County, Washington State, or in federal courts sitting in the Western District of Washington State; and I consent and agree that jurisdiction and venue for such proceedings shall lie exclusively with such courts. If any portion of this CONTRACT is held to be void or unenforceable, I agree that the remaining terms shall remain in full force and effect.',
      ),
    ],
  },
  {
    id: 'consentToTreatment',
    title: 'CONSENT TO TREATMENT',
    paragraphs: [
      waiverParagraph(
        'Should I require emergency medical treatment as a result of accident or illness arising during my participation in club Activities, I consent to such treatment. I acknowledge that WYC, as a volunteer-run public charity with limited resources, does not provide health or accident insurance for members or participants during sailing or other club Activities and I agree to be financially responsible for any medical bills incurred as a result of emergency medical treatment provided. I will notify WYC in writing if I have or I develop a medical condition or health problem about which emergency medical personnel should be informed.',
        ['Activities'],
      ),
    ],
    orderedItems: [],
  },
] as const

export const finalMemberWaiverAcknowledgement = [
  waiverParagraph(
    'I HAVE READ AND UNDERSTAND THE ABOVE ACKNOWLEDGEMENT OF RISK, RELEASE AND WAIVER OF LIABILITY, AND CONSENT TO TREATMENT;',
    ['ACKNOWLEDGEMENT OF RISK,', 'RELEASE AND WAIVER OF LIABILITY,', 'CONSENT TO TREATMENT;'],
  ),
  waiverParagraph(
    'I ACKNOWLEDGE THAT THIS IS A LEGALLY BINDING RELEASE AND INDEMNITY AGREEMENT THAT MODIFIES MY LEGAL RIGHTS;',
    ['THIS IS A LEGALLY BINDING RELEASE AND INDEMNITY AGREEMENT'],
  ),
  waiverParagraph('BY MY SIGNATURE BELOW I FREELY AND KNOWINGLY AGREE TO THESE TERMS:', [
    'I FREELY AND KNOWINGLY AGREE TO THESE TERMS',
  ]),
] as const

export const adultAcknowledgement = 'I confirm that I am 18 years of age or older.'
