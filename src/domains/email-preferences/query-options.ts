import { queryOptions } from '@tanstack/react-query'
import { getEmailPreferences } from './server-fns'

export const emailPreferencesQueryOptions = (wycNumber: number) =>
  queryOptions({
    queryKey: ['email-preferences', wycNumber],
    queryFn: () => getEmailPreferences(),
  })
