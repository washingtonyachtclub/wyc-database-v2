import { Link, useLocation, useRouter } from '@tanstack/react-router'
import { useCurrentUser, useLogoutMutation } from '../lib/auth-query-options'

export default function Header() {
  const router = useRouter()
  const location = useLocation()
  const { user, isAuthenticated } = useCurrentUser()
  const logoutMutation = useLogoutMutation()
  const isLoginPage = location.pathname === '/login'

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
    <header className="bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link
              to="/"
              search={(prev) => ({ ...prev, pageIndex: 0, pageSize: 10 })}
              className="text-xl font-bold text-gray-900"
            >
              WYC Database
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                <span className="text-sm text-gray-700">
                  {user.first} {user.last} ({user.wycNumber})
                </span>
                <button
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                </button>
              </>
            ) : (
              !isLoginPage && (
                <Link
                  to="/login"
                  search={{ redirect: '/' }}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Login
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
