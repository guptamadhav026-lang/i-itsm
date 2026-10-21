import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  Activity, BarChart3, Bell, BookOpen, Boxes, ClipboardList, Gauge, LayoutDashboard, LogOut, Menu, Moon,
  PlusCircle, Search, Shuffle, Sun, Timer, Users, X,
} from 'lucide-react'
import { useAuth, useUser } from '../auth/AuthContext'
import { useLiveUpdates, type LiveStatus } from '../live/useLiveUpdates'
import { cn } from '../lib/cn'
import { Avatar } from '../components/ui/misc'
import { NotificationBell } from './NotificationBell'
import { useTheme } from './useTheme'
import type { Role } from '../api/types'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  roles?: Role[]
  end?: boolean
}

const mainNav: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="size-4" />, end: true },
  { to: '/incidents', label: 'Incidents', icon: <ClipboardList className="size-4" />, end: true },
  { to: '/notifications', label: 'Notifications', icon: <Bell className="size-4" /> },
  { to: '/reports', label: 'Reports', icon: <BarChart3 className="size-4" />, roles: ['ADMIN'] },
]

const adminNav: NavItem[] = [
  { to: '/admin/users', label: 'Users & technicians', icon: <Users className="size-4" /> },
  { to: '/admin/catalog', label: 'Services & categories', icon: <Boxes className="size-4" /> },
  { to: '/admin/sla', label: 'SLA policies', icon: <Timer className="size-4" /> },
  { to: '/admin/strategies', label: 'Strategies', icon: <Shuffle className="size-4" /> },
  { to: '/admin/audit', label: 'Audit log', icon: <BookOpen className="size-4" /> },
]

const roleLabel: Record<Role, string> = { EMPLOYEE: 'Employee', TECHNICIAN: 'Technician', ADMIN: 'Administrator' }

/** The frame around every logged-in page: sidebar navigation (different per role) and the top bar. */
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
    <div className="flex h-full flex-col bg-sidebar text-sidebar-fg">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/40">
          <Gauge className="size-4.5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">I-ITSM</p>
          <p className="text-[11px] text-sidebar-fg/70">Incident resolution</p>
        </div>
      </div>

      {canReport && (
        <div className="px-3 pb-3">
          <NavLink
            to="/incidents/new"
            onClick={() => setMenuOpen(false)}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-white/10 text-sm font-medium text-white ring-1 ring-white/15 transition hover:bg-white/15"
          >
            <PlusCircle className="size-4" /> Report an incident
          </NavLink>
        </div>
      )}

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        <NavGroup items={visible(mainNav)} onNavigate={() => setMenuOpen(false)} />
        {user.role === 'ADMIN' && (
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-fg/50">Administration</p>
            <NavGroup items={adminNav} onNavigate={() => setMenuOpen(false)} />
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={user.fullName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.fullName}</p>
            <p className="truncate text-xs text-sidebar-fg/70">{roleLabel[user.role]} · @{user.username}</p>
          </div>
          <button onClick={logout} aria-label="Log out" title="Log out" className="rounded-md p-1.5 text-sidebar-fg hover:bg-white/10 hover:text-white cursor-pointer">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setMenuOpen(false)} />
          <aside className="animate-in absolute inset-y-0 left-0 w-72">{sidebar}</aside>
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="absolute left-74 top-4 rounded-md bg-surface p-1.5 text-fg">
            <X className="size-5" />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-md p-2 text-muted hover:bg-surface-2 lg:hidden cursor-pointer">
            <Menu className="size-5" />
          </button>
          <QuickJump key={location.pathname} />
          <div className="ml-auto flex items-center gap-1">
            <LiveIndicator status={live} />
            <button onClick={toggleTheme} aria-label="Toggle dark mode" title="Light / dark" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg cursor-pointer">
              {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function NavGroup({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive ? 'bg-sidebar-active font-medium text-white' : 'hover:bg-white/5 hover:text-white',
            )}
          >
            {item.icon}
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
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Go to INC0007 or search incidents…"
        className="h-9 w-full rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:border-ring focus:bg-surface focus:outline-none focus:ring-3 focus:ring-ring/20"
      />
    </form>
  )
}

function LiveIndicator({ status }: { status: LiveStatus }) {
  const label = { live: 'Live', connecting: 'Connecting', offline: 'Offline' }[status]
  return (
    <span
      title={status === 'live' ? 'Updates arrive automatically' : 'Reconnecting to live updates…'}
      className="mr-1 hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted sm:inline-flex"
    >
      <span className="relative flex size-2">
        {status === 'live' && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
        <span className={cn('relative inline-flex size-2 rounded-full', status === 'live' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-400' : 'bg-slate-400')} />
      </span>
      <Activity className="size-3" /> {label}
    </span>
  )
}
