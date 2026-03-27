import { PASSWORD_WORDLIST } from './membership-processing/password-wordlist'

export function generatePassphrase(): string {
  const array = new Uint32Array(3)
  crypto.getRandomValues(array)
  const capitalize = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)
  return [0, 1, 2]
    .map((i) => capitalize(PASSWORD_WORDLIST[array[i] % PASSWORD_WORDLIST.length]))
    .join('')
}
