export function passwordResetEmail(name: string, wycNumber: number, passphrase: string): string {
  return `Hello ${name},

Your password has been reset.

Your WYC Number is: ${wycNumber}
Your Temporary Password is: ${passphrase}

Please log in and set a new password at your earliest convenience.`
}

export function loginOtpEmail(name: string, code: string, expiresInMinutes: number): string {
  return `Hello ${name},

Your WYC login code is: ${code}

This code expires in ${expiresInMinutes} minutes.

If you did not request this code, you can safely ignore this email.`
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
