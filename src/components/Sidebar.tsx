import { Link, useLocation } from '@tanstack/react-router'
import { useCurrentUser } from '../lib/auth-query-options'
import type { ProtectedRoute } from '../lib/permissions'
import { hasPrivilege, routePermissions } from '../lib/permissions'

export default function Sidebar() {
  const location = useLocation()
  const { user, privileges } = useCurrentUser()

  const navItems = [
    { path: '/members' as const, label: 'Members' },
    { path: '/lessons' as const, label: 'Lessons' },
    { path: '/ratings' as const, label: 'Ratings' },
    { path: '/officers' as const, label: 'Officers & Positions' },
    { path: '/membership-processing' as const, label: 'Membership Processing' },
  ]

  const visibleNavItems = navItems.filter((item) => {
    const required = routePermissions[item.path as ProtectedRoute]
    return hasPrivilege(privileges, required)
  })

  const myProfilePath = user ? `/members/${user.wycNumber}` : null

  return (
    <aside className="w-64 bg-muted border-r min-h-screen p-4">
      <nav className="space-y-1">
        {myProfilePath && (
          <>
            <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              General
            </h3>
            <Link
              to="/members/$wycNumber"
              params={{ wycNumber: String(user!.wycNumber) }}
              className={`block px-4 py-2 rounded-md transition-colors ${
                location.pathname === myProfilePath
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'hover:bg-accent text-foreground'
              }`}
            >
              My Profile
            </Link>
            <Link
              to="/my-lessons"
              className={`block px-4 py-2 rounded-md transition-colors ${
                location.pathname === '/my-lessons'
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'hover:bg-accent text-foreground'
              }`}
            >
              My Lessons
            </Link>
          </>
        )}
        {visibleNavItems.length > 0 && (
          <h3 className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Admin
          </h3>
        )}
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'hover:bg-accent text-foreground'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
