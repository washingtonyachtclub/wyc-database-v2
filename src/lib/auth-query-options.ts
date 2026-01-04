import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  getCurrentUserServerFn,
  loginServerFn,
  logoutServerFn,
} from './auth-server-fns'
import type { LoginResponse } from './auth-server-fns'

/**
 * Query options for getting current authenticated user
 */
export const getCurrentUserQueryOptions = () =>
  queryOptions({
    queryKey: ['auth', 'currentUser'],
    queryFn: async () => {
      const result = await getCurrentUserServerFn()
      return result
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

/**
 * Hook for login mutation
 */
export const useLoginMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { wycNumber: number; password: string }) => {
      return await loginServerFn({ data })
    },
    onSuccess: (data: LoginResponse) => {
      if (data.success) {
        // Invalidate and refetch current user
        queryClient.invalidateQueries({
          queryKey: ['auth', 'currentUser'],
        })
      }
    },
  })
}

/**
 * Hook for logout mutation
 */
export const useLogoutMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return await logoutServerFn()
    },
    onSuccess: () => {
      // Invalidate auth queries and clear cache
      queryClient.invalidateQueries({
        queryKey: ['auth'],
      })
      // Optionally clear all queries on logout
      queryClient.clear()
    },
  })
}

/**
 * Hook for getting current user
 */
export const useCurrentUser = () => {
  const query = useQuery(getCurrentUserQueryOptions())
  return {
    user: query.data?.isValid ? query.data.user : null,
    isAuthenticated: query.data?.isValid ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
