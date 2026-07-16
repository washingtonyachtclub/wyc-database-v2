import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyDoorCodes, updateDoorCode } from './server-fns'

export const getMyDoorCodesQueryOptions = () =>
  queryOptions({
    queryKey: ['door-codes', 'mine'],
    queryFn: getMyDoorCodes,
  })

export function useUpdateDoorCodeMutation(opts: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateDoorCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['door-codes'] })
      opts.onSuccess()
    },
  })
}
