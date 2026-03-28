export function newMemberEmail(member: { first: string; last: string; wycNumber: number }, password: string): string {
  return `Hello ${member.first} ${member.last},

Welcome to the WYC!

Your WYC Number is: ${member.wycNumber}
Your Temporary Password is: ${password}

You may use these to sign up for lessons at: washingtonyachtclub.org/lessons-events/sign-up-for-lessons

Sign out a boat at: checkout.washingtonyachtclub.org
Or access our database at: database.washingtonyachtclub.org

The password is unique and you can reset it in the database.

Want to start learning immediately? Check our guides: washingtonyachtclub.org/guides

And here is our discord in case you don't have it already: https://discord.gg/JRQECaeYKN
It is definitely the best way to keep up with everything the club is up to.

If you have any questions feel free to ask in discord!

Eshan Arora
Webmaster`
}
