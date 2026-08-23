import { createServerFn } from '@tanstack/react-start'
import { requirePrivilege } from './auth-middleware'
import { setSailLockerMode } from './device-mode'
import { useAppSession } from './session'

export const setSailLockerModeServerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { enabled: boolean }) => {
    if (typeof input.enabled !== 'boolean') {
      throw new Error('Sail Locker mode must be enabled or disabled')
    }
    return input
  })
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    const session = await useAppSession()

    await session.clear()
    setSailLockerMode(data.enabled)

    return { sailLockerMode: data.enabled }
  })
