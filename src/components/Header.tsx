import { isDevEnvironment } from '@/lib/env'
import { getDatabaseName } from '@/domains/members/server-fns'
import { getDatabaseAdmin } from '@/domains/officers/server-fns'
import { hasPrivilege } from '@/lib/permissions'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useCurrentUser, useLogoutMutation } from '@/lib/auth/auth-query-options'
import { AdminContactModal } from './AdminContactModal'
import { DevPrivilegeEmulator } from './DevPrivilegeEmulator'
import { Button } from './ui/button'

const isDevApp = isDevEnvironment()

export default function Header() {
  const router = useRouter()
  const location = useLocation()
  const { user, isAuthenticated, privileges, realPrivileges } = useCurrentUser()
  const logoutMutation = useLogoutMutation()
  const [showAdminModal, setShowAdminModal] = useState(false)
  const isBarePage = ['/login', '/forgot-password'].includes(location.pathname)
  const { data: dbName } = useQuery({
    queryKey: ['databaseName'],
    queryFn: () => getDatabaseName(),
    staleTime: Infinity,
  })
  const { data: adminData } = useQuery({
    queryKey: ['databaseAdmin'],
    queryFn: () => getDatabaseAdmin(),
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
            {isDevApp && dbName && (
              <span className="ml-3 rounded bg-yellow-200 px-2 py-0.5 text-xs font-semibold text-yellow-900">
                Database: {dbName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                {isDevApp && hasPrivilege(realPrivileges ?? privileges, ['db']) && (
                  <DevPrivilegeEmulator />
                )}
                <span className="text-sm font-semibold text-muted-foreground">
                  {user.first} {user.last} ({user.wycNumber})
                </span>
                <Button onClick={handleLogout} disabled={logoutMutation.isPending} size="sm">
                  {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                </Button>
                {adminData && (
                  <Button
                    variant="ghost"
                    className="text-sm text-muted-foreground font-normal"
                    onClick={() => setShowAdminModal(true)}
                  >
                    Contact DB Admin: <br />
                    {adminData.name}
                  </Button>
                )}
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
      {showAdminModal && adminData && (
        <AdminContactModal
          onClose={() => setShowAdminModal(false)}
          adminName={adminData.name}
          adminEmail={adminData.email}
        />
      )}
    </header>
  )
}
