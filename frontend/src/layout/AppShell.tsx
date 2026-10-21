import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Menu, Moon, Search, Sun, X } from 'lucide-react'
import { useAuth, useUser } from '../auth/AuthContext'
import { useLiveUpdates, type LiveStatus } from '../live/useLiveUpdates'
import { cn } from '../lib/cn'
import { NotificationBell } from './NotificationBell'
import { useTheme } from './useTheme'
import type { Role } from '../api/types'

interface NavItem {
  to: string
  label: string
  roles?: Role[]
  end?: boolean
}

const mainNav: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/incidents', label: 'Incidents', end: true },
  { to: '/notifications', label: 'Notifications' },
  { to: '/reports', label: 'Reports', roles: ['ADMIN'] },
]

const adminNav: NavItem[] = [
  { to: '/admin/users', label: 'Users and technicians' },
  { to: '/admin/catalog', label: 'Services and categories' },
  { to: '/admin/sla', label: 'SLA policies' },
  { to: '/admin/strategies', label: 'Strategies' },
  { to: '/admin/audit', label: 'Audit log' },
]

const roleLabel: Record<Role, string> = { EMPLOYEE: 'Employee', TECHNICIAN: 'Technician', ADMIN: 'Administrator' }

/** Frame around every logged-in page: the side menu (different per role) and the top bar. */
export function AppShell() {
  const user = useUser()
  const { logout } = useAuth()
  const [theme, toggleTheme] = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const live = useLiveUpdates(true)
  const location = useLocation()

  const canReport = user.role !== 'TECHNICIAN'
  const visible = (items: NavItem[]) => items.filter((i) => !i.roles || i.roles.includes(user.role))

  const sidebar = (
    <div className="flex h-full flex-col border-r border-line bg-surface">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <img src="/favicon.svg" alt="" className="size-6" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-fg">I-ITSM</p>
          <p className="text-[11px] text-muted">IT service desk</p>
        </div>
      </div>

      {canReport && (
        <div className="px-3 pt-3">
          <NavLink
            to="/incidents/new"
            onClick={() => setMenuOpen(false)}
            className="flex h-9 items-center justify-center rounded bg-brand text-sm font-medium text-brand-fg hover:bg-brand-hover"
          >
            Report an incident
          </NavLink>
        </div>
      )}

      <nav className="flex-1 space-y-5 overflow-y-auto py-4">
        <NavGroup items={visible(mainNav)} onNavigate={() => setMenuOpen(false)} />
        {user.role === 'ADMIN' && (
          <div>
            <p className="mb-1 px-4 text-xs font-medium text-faint">Administration</p>
            <NavGroup items={adminNav} onNavigate={() => setMenuOpen(false)} />
          </div>
        )}
      </nav>

      <div className="border-t border-line px-4 py-3">
        <p className="truncate text-sm font-medium text-fg">{user.fullName}</p>
        <p className="truncate text-xs text-muted">{roleLabel[user.role]} · {user.username}</p>
        <button onClick={logout} className="mt-2 text-xs font-medium text-brand hover:underline cursor-pointer">
          Log out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full">
      <aside className="hidden w-56 shrink-0 lg:block">{sidebar}</aside>

      {/* Phone menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="absolute left-66 top-3 rounded bg-surface p-1.5 text-fg">
            <X className="size-5" />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded p-2 text-muted hover:bg-surface-2 lg:hidden cursor-pointer">
            <Menu className="size-5" />
          </button>
          <QuickJump key={location.pathname} />
          <div className="ml-auto flex items-center gap-1">
            <LiveIndicator status={live} />
            <button onClick={toggleTheme} aria-label="Toggle dark mode" title="Light / dark" className="rounded p-2 text-muted hover:bg-surface-2 hover:text-fg cursor-pointer">
              {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
            </button>
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function NavGroup({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => cn(
              'block border-l-2 px-4 py-1.5 text-sm',
              isActive ? 'border-brand bg-brand-soft font-medium text-brand' : 'border-transparent text-muted hover:bg-surface-2 hover:text-fg',
            )}
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

/** Type a reference like "INC0007" or "7" and press Enter to open it, or any text to search. */
function QuickJump() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  return (
    <form
      className="relative hidden w-full max-w-sm sm:block"
      onSubmit={(e) => {
        e.preventDefault()
        const v = value.trim()
        if (!v) return
        const ref = v.toUpperCase().match(/^(?:INC)?0*(\d+)$/)
        navigate(ref ? `/incidents/${ref[1]}` : `/incidents?keyword=${encodeURIComponent(v)}`)
      }}
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="INC0007 or a search term"
        className="h-8 w-full rounded border border-line-strong bg-surface pl-8 pr-3 text-sm text-fg placeholder:text-faint focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </form>
  )
}

function LiveIndicator({ status }: { status: LiveStatus }) {
  const label = { live: 'Live', connecting: 'Connecting', offline: 'Offline' }[status]
  return (
    <span
      title={status === 'live' ? 'New changes appear without reloading' : 'Trying to reconnect to live updates'}
      className="mr-2 hidden items-center gap-1.5 text-xs text-muted sm:inline-flex"
    >
      <span className={cn('size-1.5 rounded-full', status === 'live' ? 'bg-emerald-600' : status === 'connecting' ? 'bg-amber-500' : 'bg-slate-400')} />
      {label}
    </span>
  )
}
