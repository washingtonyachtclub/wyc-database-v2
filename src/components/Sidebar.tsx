import { Link, useLocation } from '@tanstack/react-router'
import { useCurrentUser } from '@/lib/auth/auth-query-options'
import type { ProtectedRoute } from '../lib/permissions'
import { hasPrivilege, routePermissions } from '../lib/permissions'

export default function Sidebar() {
  const location = useLocation()
  const { user, privileges } = useCurrentUser()

  const adminItems = [
    { path: '/members' as const, label: 'Members' },
    { path: '/lessons' as const, label: 'Lessons' },
    { path: '/ratings' as const, label: 'Ratings' },
  ]

  const peopleManagementItems = [
    { path: '/officers' as const, label: 'Officers & Positions' },
    { path: '/chiefs' as const, label: 'Chiefs' },
    { path: '/privileges' as const, label: 'Privileges' },
    { path: '/honorary' as const, label: 'Honorary' },
  ]

  const supportTableItems = [
    { path: '/rating-types' as const, label: 'Rating Types' },
    { path: '/boat-types' as const, label: 'Boat Types' },
    { path: '/class-types' as const, label: 'Lesson Types' },
    { path: '/quarters' as const, label: 'Quarters' },
    { path: '/positions' as const, label: 'Positions' },
  ]

  const toolsItems = [
    { path: '/membership-processing' as const, label: 'Membership Processing' },
    { path: '/set-current-quarter' as const, label: 'Set Current Quarter' },
    { path: '/tests' as const, label: 'Tests' },
  ]

  const filterVisible = (items: { path: ProtectedRoute; label: string }[]) =>
    items.filter((item) => {
      const required = routePermissions[item.path]
      return hasPrivilege(privileges, required)
    })

  const visibleAdminItems = filterVisible(adminItems)
  const visiblePeopleManagementItems = filterVisible(peopleManagementItems)
  const visibleSupportTableItems = filterVisible(supportTableItems)
  const visibleToolsItems = filterVisible(toolsItems)

  const myProfilePath = user ? `/members/${user.wycNumber}` : null

  return (
    <aside className="w-64 bg-muted border-r min-h-screen p-4">
      <nav className="space-y-1">
        {myProfilePath && (
          <>
            <h3 className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              General
            </h3>
            <Link
              to="/members/$wycNumber"
              params={{ wycNumber: String(user!.wycNumber) }}
              className={`block px-4 py-2 rounded-md transition-colors ${
                location.pathname === myProfilePath
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'hover:bg-primary/5 text-foreground'
              }`}
            >
              My Profile
            </Link>
            <Link
              to="/my-lessons"
              className={`block px-4 py-2 rounded-md transition-colors ${
                location.pathname === '/my-lessons'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'hover:bg-primary/5 text-foreground'
              }`}
            >
              My Lessons
            </Link>
            <Link
              to="/set-password"
              className={`block px-4 py-2 rounded-md transition-colors ${
                location.pathname === '/set-password'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'hover:bg-primary/5 text-foreground'
              }`}
            >
              Set Password
            </Link>
          </>
        )}
        {visibleAdminItems.length > 0 && (
          <h3 className="px-4 pt-4 pb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Admin
          </h3>
        )}
        {visibleAdminItems.map((item) => {
          const isActive =
            (location.pathname === item.path || location.pathname.startsWith(item.path + '/')) &&
            location.pathname !== myProfilePath
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'hover:bg-primary/5 text-foreground'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
        {visiblePeopleManagementItems.length > 0 && (
          <h3 className="px-4 pt-4 pb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            People Management
          </h3>
        )}
        {visiblePeopleManagementItems.map((item) => {
          const isActive =
            location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'hover:bg-primary/5 text-foreground'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
        {visibleSupportTableItems.length > 0 && (
          <h3 className="px-4 pt-4 pb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Support Tables
          </h3>
        )}
        {visibleSupportTableItems.map((item) => {
          const isActive =
            location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'hover:bg-primary/5 text-foreground'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
        <h3 className="px-4 pt-4 pb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Tools
        </h3>
        {visibleToolsItems.map((item) => {
          const isActive =
            location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'hover:bg-primary/5 text-foreground'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
        <a
          href="/lesson-list"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-4 py-2 rounded-md transition-colors hover:bg-primary/5 text-foreground"
        >
          View Public Lesson List
        </a>
      </nav>
    </aside>
  )
}
