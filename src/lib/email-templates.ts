// All email templates in one place so we remember to update them together.
const SIGNATURE_NAME = 'Eshan Arora'
const SIGNATURE_POSITION = 'Webmaster, WYC'

// --- Membership processing ---

export function newMemberEmail(
  member: { first: string; last: string; wycNumber: number },
  password: string,
): string {
  return `Hello ${member.first} ${member.last},

Welcome to the WYC!

Your WYC Number is: ${member.wycNumber}
Your Temporary Password is: ${password}

You may use these to sign up for lessons at: washingtonyachtclub.org/lessons-events/sign-up-for-lessons

Sign out a boat at: checkout.washingtonyachtclub.org
Or access our database at: database.washingtonyachtclub.org

The password is unique and you can reset it in the database.

Want to start learning immediately? Check our guides: washingtonyachtclub.org/guides

And here is our discord in case you don't have it already: discord.gg/JRQECaeYKN
It is definitely the best way to keep up with everything the club is up to.

If you have any questions feel free to ask in discord!

${SIGNATURE_NAME}
${SIGNATURE_POSITION}`
}

export function newMemberEmailFallback(member: {
  first: string
  last: string
  wycNumber: number
}): string {
  return `Hello ${member.first} ${member.last},

Welcome to the WYC!

Your WYC Number is: ${member.wycNumber}

To get started, go to database.washingtonyachtclub.org and use "Forgot Password" to set your password.

Sign up for lessons at: washingtonyachtclub.org/lessons-events/sign-up-for-lessons
Sign out a boat at: checkout.washingtonyachtclub.org

Want to start learning immediately? Check our guides: washingtonyachtclub.org/guides

And here is our discord in case you don't have it already: discord.gg/JRQECaeYKN
It is definitely the best way to keep up with everything the club is up to.

If you have any questions feel free to ask in discord!

${SIGNATURE_NAME}
${SIGNATURE_POSITION}`
}

export function returningMemberEmail(
  first: string,
  last: string,
  wycNumber: number,
  newExpireQtrSchoolText: string,
  emailMismatch?: { formEmail: string; onFileEmail: string },
): string {
  const mismatchNote = emailMismatch
    ? `\nNote: You renewed with the email ${emailMismatch.formEmail}, but we have ${emailMismatch.onFileEmail} on file. You can update your email at database.washingtonyachtclub.org.\n`
    : ''

  return `Hello ${first} ${last},

Your WYC membership has been renewed!

Your WYC Number is: ${wycNumber}
Your membership is now active through ${newExpireQtrSchoolText}.
You can review your ratings and information at database.washingtonyachtclub.org.
${mismatchNote}
${SIGNATURE_NAME}
${SIGNATURE_POSITION}`
}

// --- Password / account recovery ---

export function passwordResetEmail(name: string, wycNumber: number, passphrase: string): string {
  return `Hello ${name},

Your password has been reset.

Your WYC Number is: ${wycNumber}
Your Temporary Password is: ${passphrase}

Please log in and set a new password at your earliest convenience.`
}

export function wycNumberLookupEmail(
  email: string,
  members: { wycNumber: number; name: string }[],
): string {
  const memberLines = members.map((m) => `  ${m.name} — WYC #${m.wycNumber}`).join('\n')

  return `Hello,

Here is the WYC number associated with ${email}:

${memberLines}

You can reset your password on the database if needed.`
}
