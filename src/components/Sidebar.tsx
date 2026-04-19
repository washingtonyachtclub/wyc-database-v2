import { Link, useLocation } from '@tanstack/react-router'
import { useCurrentUser } from '@/lib/auth/auth-query-options'
import type { ProtectedRoute } from '../lib/permissions'
import { hasPrivilege, routePermissions } from '../lib/permissions'

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const { user, privileges } = useCurrentUser()

  const adminItems = [
    { path: '/members' as const, label: 'Members' },
    { path: '/lessons' as const, label: 'Lessons' },
    { path: '/ratings' as const, label: 'Ratings' },
    { path: '/checkouts' as const, label: 'Checkouts' },
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

  const linkClass = (isActive: boolean) =>
    `block px-4 py-2 rounded-md transition-colors ${
      isActive ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-primary/5 text-foreground'
    }`

  return (
    <nav className="space-y-1" onClick={onNavigate}>
      {myProfilePath && (
        <>
          <h3 className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            General
          </h3>
          <Link
            to="/members/$wycNumber"
            params={{ wycNumber: String(user!.wycNumber) }}
            className={linkClass(location.pathname === myProfilePath)}
          >
            My Profile
          </Link>
          <Link to="/my-lessons" className={linkClass(location.pathname === '/my-lessons')}>
            My Lessons
          </Link>
          <Link to="/set-password" className={linkClass(location.pathname === '/set-password')}>
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
          <Link key={item.path} to={item.path} className={linkClass(isActive)}>
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
          <Link key={item.path} to={item.path} className={linkClass(isActive)}>
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
      {visiblePeopleManagementItems.length > 0 && (
        <h3 className="px-4 pt-4 pb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          People Management
        </h3>
      )}
      {visiblePeopleManagementItems.map((item) => {
        const isActive =
          location.pathname === item.path || location.pathname.startsWith(item.path + '/')
        return (
          <Link key={item.path} to={item.path} className={linkClass(isActive)}>
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
          <Link key={item.path} to={item.path} className={linkClass(isActive)}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default function Sidebar() {
  return (
    <aside className="hidden md:block w-64 bg-muted border-r min-h-screen p-4">
      <SidebarNav />
    </aside>
  )
}
