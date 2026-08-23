import { getDatabaseName } from '@/domains/members/server-fns'
import { getDatabaseAdmin } from '@/domains/officers/server-fns'
import { useCurrentUser, useLogoutMutation } from '@/lib/auth/auth-query-options'
import { isDevEnvironment } from '@/lib/env'
import { hasPrivilege } from '@/lib/permissions'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useRouter } from '@tanstack/react-router'
import { Menu, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AdminContactModal } from './AdminContactModal'
import { QuickSwitcher } from './QuickSwitcher'
import { DevPrivilegeEmulator } from './DevPrivilegeEmulator'
import { SidebarNav } from './Sidebar'
import { Button } from './ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'

const isDevApp = isDevEnvironment()

export default function Header() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const location = useLocation()
  const { user, isAuthenticated, privileges, realPrivileges, sailLockerMode, sessionExpiresAt } =
    useCurrentUser()
  const logoutMutation = useLogoutMutation()
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const isCheckoutPage =
    location.pathname === '/checkout' || location.pathname.startsWith('/checkout/')
  const isBarePage =
    ['/login', '/forgot-password'].includes(location.pathname) || (isCheckoutPage && sailLockerMode)
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

  useEffect(() => {
    if (!isAuthenticated || !sailLockerMode || !sessionExpiresAt) {
      return
    }

    const expireSession = async () => {
      queryClient.clear()
      await router.invalidate()
      await router.navigate({
        to: '/login',
        search: { redirect: '/' },
        replace: true,
      })
    }

    const remaining = sessionExpiresAt - Date.now()
    if (remaining <= 0) {
      void expireSession()
      return
    }

    const timeout = window.setTimeout(() => void expireSession(), remaining)
    return () => window.clearTimeout(timeout)
  }, [isAuthenticated, queryClient, router, sailLockerMode, sessionExpiresAt])

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      await router.invalidate()
      await router.navigate({
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
        <div className="flex h-16 items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4">
          <div className="flex items-center gap-2">
            {isDevApp && dbName && (
              <span className="hidden mr-1 rounded bg-yellow-200 px-2 py-0.5 text-xs font-semibold text-yellow-900">
                Database: {dbName}
              </span>
            )}
            {/* Hamburger — mobile only, non-bare pages */}
            {!isBarePage && isAuthenticated && (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 overflow-y-auto">
                  <SheetHeader className="px-4 pt-4 pb-2">
                    <SheetTitle>Navigation</SheetTitle>
                  </SheetHeader>
                  <div className="px-2 pb-4">
                    <SidebarNav onNavigate={() => setSheetOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <img src="/favicon.png" alt="WYC" className="h-6 w-6" />
              WYC Database
            </Link>
          </div>
          <div className="hidden md:block">
            {!isBarePage && isAuthenticated && <QuickSwitcher />}
          </div>
          <div className="flex items-center gap-4 md:justify-self-end">
            {isAuthenticated && user ? (
              <>
                {isDevApp && hasPrivilege(realPrivileges ?? privileges, ['db']) && (
                  <div className="hidden">
                    <DevPrivilegeEmulator />
                  </div>
                )}
                <Button asChild variant="ghost" size="icon">
                  <Link to="/settings">
                    <Settings />
                    <span className="sr-only">Settings</span>
                  </Link>
                </Button>
                <span className="hidden sm:inline text-sm font-semibold text-muted-foreground">
                  {user.first} {user.last} ({user.wycNumber})
                </span>
                <Button onClick={handleLogout} disabled={logoutMutation.isPending} size="sm">
                  {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                </Button>
                {adminData && (
                  <Button
                    variant="ghost"
                    className="hidden sm:inline-flex text-sm text-muted-foreground font-normal"
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
      {sailLockerMode && (
        <div className="border-t bg-muted/60 px-4 py-2 text-center text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Sail Locker Computer</span>
          {' · '}Please log out when you are finished.
        </div>
      )}
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
