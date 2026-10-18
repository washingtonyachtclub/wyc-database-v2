import { describe, expect, it } from 'vitest'
import { applicationCompletionUrl } from './completion-url'

describe('applicationCompletionUrl', () => {
  it('uses the public domain even on a protected Vercel deployment', () => {
    const applicationId = '00000000-0000-4000-8000-000000000001'
    expect(applicationCompletionUrl(applicationId)).toBe(
      `https://database.washingtonyachtclub.org/join/${applicationId}`,
    )
  })

  it('keeps application IDs within a single path segment', () => {
    expect(applicationCompletionUrl('id/with?reserved#characters')).toBe(
      'https://database.washingtonyachtclub.org/join/id%2Fwith%3Freserved%23characters',
    )
  })
})
