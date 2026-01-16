import { Link, useLocation } from '@tanstack/react-router'

export default function Sidebar() {
  const location = useLocation()

  const navItems = [
    { path: '/members', label: 'Members' },
  ]

  return (
    <aside className="w-64 bg-muted border-r min-h-screen p-4">
      <nav className="space-y-2">
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

