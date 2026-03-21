export function returningMemberEmail(first: string, last: string, wycNumber: number, newExpireQtrSchoolText: string): string {
  return `Hello ${first} ${last},

Your WYC membership has been renewed!

Your WYC Number is: ${wycNumber}
Your membership is now active through ${newExpireQtrSchoolText}.

Eshan Arora
Webmaster`
}
