import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PrivilegeFilters } from 'src/db/privilege-queries'
import { createOfficer } from './officers-server-fns'
import { deletePrivilege, getPrivilegesTable, getPrivilegeTypes } from './privileges-server-fns'

export const getPrivilegesQueryOptions = (filters?: PrivilegeFilters) =>
  queryOptions({
    queryKey: ['privileges', filters],
    queryFn: () => getPrivilegesTable({ data: { filters } }),
  })

export const getPrivilegeTypesQueryOptions = () =>
  queryOptions({
    queryKey: ['privileges', 'types'],
    queryFn: getPrivilegeTypes,
  })

export function useCreatePrivilegeMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOfficer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privileges'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useDeletePrivilegeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deletePrivilege,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privileges'] })
    },
  })
}
