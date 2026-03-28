import { getDatabaseName } from '@/lib/members-server-fns'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useRouter } from '@tanstack/react-router'
import { useCurrentUser, useLogoutMutation } from '../lib/auth-query-options'
import { Button } from './ui/button'
import { DevPrivilegeEmulator } from './DevPrivilegeEmulator'

export default function Header() {
  const router = useRouter()
  const location = useLocation()
  const { user, isAuthenticated } = useCurrentUser()
  const logoutMutation = useLogoutMutation()
  const isBarePage = ['/login', '/forgot-password'].includes(location.pathname)
  const { data: dbName } = useQuery({
    queryKey: ['databaseName'],
    queryFn: () => getDatabaseName(),
    staleTime: Infinity,
  })

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      router.invalidate()
      router.navigate({
        to: '/login',
        search: { redirect: '/' },
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="bg-background shadow border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <img src="/favicon.png" alt="WYC" className="h-6 w-6" />
              WYC Database
            </Link>
            {import.meta.env.DEV && dbName && (
              <span className="ml-3 rounded bg-yellow-200 px-2 py-0.5 text-xs font-semibold text-yellow-900">
                {dbName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                {import.meta.env.DEV && <DevPrivilegeEmulator />}
                <span className="text-sm text-muted-foreground">
                  {user.first} {user.last} ({user.wycNumber})
                </span>
                <Button onClick={handleLogout} disabled={logoutMutation.isPending} size="sm">
                  {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                </Button>
              </>
            ) : (
              !isBarePage && (
                <Button asChild size="sm">
                  <Link to="/login" search={{ redirect: '/' }}>
                    Login
                  </Link>
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
