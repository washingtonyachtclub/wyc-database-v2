import { useCurrentUser } from '@/lib/auth/auth-query-options'
import { Link, useLocation } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ProtectedRoute } from '../lib/permissions'
import { hasRoutePrivilegeAccess } from '../lib/permissions'

export const adminItems = [
  { path: '/members' as const, label: 'Members' },
  { path: '/lessons' as const, label: 'Lessons' },
  { path: '/ratings' as const, label: 'Ratings' },
  { path: '/checkouts' as const, label: 'Checkouts' },
]

export const peopleManagementItems = [
  { path: '/officers' as const, label: 'Officers & Positions' },
  { path: '/ratings-examiners' as const, label: 'Ratings Examiners' },
  { path: '/chiefs' as const, label: 'Chiefs' },
  { path: '/privileges' as const, label: 'Privileges' },
  { path: '/honorary' as const, label: 'Honorary' },
]

export const supportTableItems = [
  { path: '/rating-types' as const, label: 'Rating Types' },
  { path: '/boat-types' as const, label: 'Boat Types' },
  { path: '/lesson-types' as const, label: 'Lesson Types' },
  { path: '/quarters' as const, label: 'Quarters' },
  { path: '/positions' as const, label: 'Positions' },
]

export const toolsItems = [
  { path: '/maintenance-tracker' as const, label: 'Maintenance Tracker' },
  { path: '/membership-processing' as const, label: 'Membership Processing' },
  { path: '/membership-stats' as const, label: 'Membership Stats' },
  { path: '/set-current-quarter' as const, label: 'Set Current Quarter' },
  { path: '/tests' as const, label: 'Written Tests' },
  { path: '/membership-approvals' as const, label: 'Membership Approvals' },
]

function SidebarSectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mx-2 mb-1 mt-4 border-b border-border px-2 pb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-foreground">
      {children}
    </h3>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const { user, privileges } = useCurrentUser()
  const filterVisible = (items: { path: ProtectedRoute; label: string }[]) =>
    items.filter((item) => hasRoutePrivilegeAccess(privileges, item.path))

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
          <SidebarSectionHeading>General</SidebarSectionHeading>
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
          <Link to="/checkout" className={linkClass(location.pathname === '/checkout')}>
            Boat Checkout
          </Link>
          <Link
            to="/renew-membership"
            className={linkClass(location.pathname === '/renew-membership')}
          >
            Renew Membership
          </Link>
          <Link to="/door-codes" className={linkClass(location.pathname === '/door-codes')}>
            Door Codes
          </Link>
        </>
      )}
      {visibleAdminItems.length > 0 && <SidebarSectionHeading>Admin</SidebarSectionHeading>}
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
      <SidebarSectionHeading>Tools</SidebarSectionHeading>
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
        className="flex items-center gap-2 px-4 py-2 rounded-md transition-colors hover:bg-primary/5 text-foreground"
      >
        Lesson List
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
      </a>
      {visiblePeopleManagementItems.length > 0 && (
        <SidebarSectionHeading>People Management</SidebarSectionHeading>
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
        <SidebarSectionHeading>Support Tables</SidebarSectionHeading>
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
