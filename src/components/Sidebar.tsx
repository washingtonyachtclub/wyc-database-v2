import { Link, useLocation } from '@tanstack/react-router'
import { useCurrentUser } from '../lib/auth-query-options'

export default function Sidebar() {
  const location = useLocation()
  const { user } = useCurrentUser()

  const navItems = [
    { path: '/members', label: 'Members' },
    { path: '/lessons', label: 'Lessons' },
    { path: '/ratings', label: 'Ratings' },
    { path: '/officers', label: 'Officers' },
    { path: '/membership-processing', label: 'Membership Processing' },
  ]

  const myProfilePath = user ? `/members/${user.wycNumber}` : null

  return (
    <aside className="w-64 bg-muted border-r min-h-screen p-4">
      <nav className="space-y-2">
        {myProfilePath && (
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
        )}
        {navItems.map((item) => {
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
