import { createServerFn } from '@tanstack/react-start'
import { requireRouteAccess } from '@/lib/auth/auth-middleware'
import { examinerExists, saveTestAttempt } from './queries'
import { examinerNumberSchema, submitTestSchema } from './schema'

export const validateTestExaminer = createServerFn({ method: 'GET' })
  .validator((input: unknown) => examinerNumberSchema.parse(input))
  .handler(async ({ data }) => {
    await requireRouteAccess('/tests')
    try {
      return { valid: await examinerExists(data) }
    } catch (error) {
      console.error('Failed to validate test examiner:', error)
      throw new Error('Unable to check examiner. Please try again.')
    }
  })

export const submitWrittenTest = createServerFn({ method: 'POST' })
  .validator((input: unknown) => submitTestSchema.parse(input))
  .handler(async ({ data }) => {
    const memberWycNumber = await requireRouteAccess('/tests')
    try {
      return await saveTestAttempt(memberWycNumber, data)
    } catch (error) {
      console.error('Failed to save written test:', error)
      throw new Error('Unable to save test. Please try again.')
    }
  })
