import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ExaminerFilters } from '@/domains/examiners/queries'
import { createOfficer } from '@/domains/officers/server-fns'
import { deactivateExaminer, getExaminerTable } from './server-fns'

const EXAMINER_POSITION = 2240

export const getExaminerQueryOptions = (filters?: ExaminerFilters) =>
  queryOptions({
    queryKey: ['examiners', filters],
    queryFn: () => getExaminerTable({ data: { filters } }),
  })

export function useCreateExaminerMutation(opts: { onSuccess: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (member: number) =>
      createOfficer({ data: { member, position: EXAMINER_POSITION } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examiners'] })
      opts.onSuccess()
      opts.onClose()
    },
  })
}

export function useDeactivateExaminerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deactivateExaminer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examiners'] })
    },
  })
}
