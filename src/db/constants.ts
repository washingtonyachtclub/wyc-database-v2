/** WYCNumber 1 is a special "TBD" placeholder member */
export const TBD_WYC_NUMBER = 1

/** Ratings marked as "expires" expire after this many months */
export const RATING_EXPIRY_MONTHS = 6

/**
 * Position type IDs shown on the Officers & Position Holders page.
 * Maps to pos_type._index values: 1=Officers, 2=Position Holders, 5=Fleet Captains.
 * Order determines display section order on the page.
 */
export const OFFICER_PAGE_TYPES = [1, 2, 5] as const

/** pos_type._index for club officers (Commodore, Vice Commodore, Rear Commodore, Treasurer). */
export const OFFICER_POS_TYPE = 1

/**
 * Class type IDs grouped into display categories for the public lesson list
 * and the class type dropdown in lesson create/edit forms.
 * IDs are PKs from the `class_type` table.
 */
export const LESSON_CATEGORIES = [
  {
    label: 'Work Parties',
    typeIds: [9],
  },
  {
    label: 'Dinghy Sailing',
    typeIds: [10],
  },
  {
    label: 'Novice Dinghy',
    typeIds: [1, 2], // NOV Dinghy Weekday, NOV Dinghy Weekend
  },
  {
    label: 'Advanced',
    typeIds: [3, 6, 7], // Catamaran, INT Dinghy Weekday, INT Dinghy Weekend
  },
  {
    label: 'Keelboat',
    typeIds: [4],
  },
  {
    label: 'Social Events',
    typeIds: [13],
  },
  {
    label: 'Specialty',
    typeIds: [5],
  },
  {
    label: 'Windsurfing',
    typeIds: [12],
  },
] as const

export const LESSON_LOCATION_PRESETS = [
  { name: 'WAC', url: 'https://maps.google.com/?cid=3343180312568491478' },
  { name: 'SSP', url: 'https://maps.google.com/?cid=1513604519883250295' },
] as const

/** class_type index for Windsurfing, which defaults to SSP rather than the WAC. */
export const WINDSURFING_TYPE_ID = 12

/**
 * Active holders of these positions may approve/deny dues-exemption requests.
 * pos `_index` values: 1000=Commodore, 1010=Vice Commodore, 2260=Webmaster.
 */
export const EXEMPTION_APPROVER_POSITIONS = [1000, 1010, 2260] as const

/** WYC number of the database administrator */
export const DATABASE_ADMIN_WYC_NUMBER = 23757

/** Club webmaster email address */
export const WEBMASTER_EMAIL = 'webmaster@washingtonyachtclub.org'
