import { z } from 'zod'

export function normalizeDiscordUsername(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase()
}

export const discordUsernameSchema = z.string().refine((value) => {
  if (value.trim() === '') return true
  const username = normalizeDiscordUsername(value)
  return /^[a-z0-9_.]{2,32}$/.test(username) && !username.includes('..')
}, 'Enter a Discord username with 2–32 letters, numbers, underscores, or periods.')
