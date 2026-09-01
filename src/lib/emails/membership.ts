const WELCOME_SIGNATURE_NAME = 'Eshan Arora and Zachary Taylor'
const WELCOME_SIGNATURE_POSITION = 'Co-Commodores, WYC'

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

${WELCOME_SIGNATURE_NAME}
${WELCOME_SIGNATURE_POSITION}`
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
Check out a boat at: checkout.washingtonyachtclub.org

Want to start learning immediately? Check our guides: washingtonyachtclub.org/guides

And here is our discord in case you don't have it already: discord.gg/JRQECaeYKN
It is definitely the best way to keep up with everything the club is up to.

If you have any questions feel free to ask in discord!

${WELCOME_SIGNATURE_NAME}
${WELCOME_SIGNATURE_POSITION}`
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
${mismatchNote}`
}

export function renewalWaiverRequiredEmail(
  first: string,
  last: string,
  targetQuarter: string,
): string {
  return `Hello ${first} ${last},

We received your WYC membership payment for membership through ${targetQuarter}.

Your membership will not be extended until you sign the member waiver. If you have not already signed it, return here to complete your renewal:
https://database.washingtonyachtclub.org/renew-membership`
}

export function exemptionWaiverRequiredEmail(
  first: string,
  last: string,
  targetQuarter: string,
): string {
  return `Hello ${first} ${last},

We received your WYC dues-exemption request for ${targetQuarter}.

An officer cannot approve the request until you sign the member waiver. If you have not already signed it, return here:
https://database.washingtonyachtclub.org/renew-membership`
}

export function newMemberCompletionEmail(
  firstName: string,
  _lastName: string,
  completionUrl: string,
): string {
  return `Hello ${firstName},

We received your Washington Yacht Club membership payment.

Complete your contact information and sign the member waiver here:
${completionUrl}

Your membership will be activated after you submit these requirements and an officer processes your application.`
}

export function newMemberIncompleteReminderEmail(firstName: string, completionUrl: string): string {
  return `Hello ${firstName},

Your Washington Yacht Club membership application is still missing required contact information or a signed member waiver.

Finish your application here:
${completionUrl}

Your membership cannot be activated until these requirements are submitted.`
}
