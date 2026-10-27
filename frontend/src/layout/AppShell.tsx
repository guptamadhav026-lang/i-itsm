import { useEffect, useRef, useState, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Bell, Boxes, ChartColumn, House, Inbox, LogOut, Menu, Moon, Plus, ScrollText, Search, Shuffle, Sun, Timer, Users, X,
} from 'lucide-react'
import { notificationApi } from '../api/endpoints'
import { useAuth, useUser } from '../auth/AuthContext'
import { useLiveUpdates, type LiveStatus } from '../live/useLiveUpdates'
import { cn } from '../lib/cn'
import { Avatar } from '../components/ui/misc'
import { Logo, LogoMark } from '../components/ui/Logo'
import { NotificationBell } from './NotificationBell'
import { useTheme } from './useTheme'
import type { Role } from '../api/types'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  roles?: Role[]
  end?: boolean
}

const mainNav: NavItem[] = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/incidents', label: 'Incidents', icon: Inbox, end: true },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/reports', label: 'Reports', icon: ChartColumn, roles: ['ADMIN'] },
]

const adminNav: NavItem[] = [
  { to: '/admin/users', label: 'People', icon: Users },
  { to: '/admin/catalog', label: 'Services and categories', icon: Boxes },
  { to: '/admin/sla', label: 'SLA policies', icon: Timer },
  { to: '/admin/strategies', label: 'Strategies', icon: Shuffle },
  { to: '/admin/audit', label: 'Audit log', icon: ScrollText },
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
  const { data: notifications = [] } = useQuery({ queryKey: ['notifications'], queryFn: notificationApi.list, refetchInterval: 60_000 })
  const unread = notifications.filter((n) => n.channel === 'IN_APP' && !n.read).length

  const canReport = user.role !== 'TECHNICIAN'
  const visible = (items: NavItem[]) => items.filter((i) => !i.roles || i.roles.includes(user.role))
  const close = () => setMenuOpen(false)

  const sidebar = (
    <div className="flex h-full flex-col bg-side text-side-fg">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Logo tone="inverse" />
      </div>

      {canReport && (
        <div className="px-3 pb-2 pt-1">
          <NavLink
            to="/incidents/new"
            onClick={close}
            className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#1f7a83] text-sm font-medium text-white hover:bg-[#238891] dark:bg-[#1d6d74]"
          >
            <Plus className="size-4" /> Report an incident
          </NavLink>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <NavGroup items={visible(mainNav)} onNavigate={close} counts={{ '/notifications': unread }} />
        {user.role === 'ADMIN' && (
          <div className="mt-6">
            <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-side-muted">Admin</p>
            <NavGroup items={adminNav} onNavigate={close} />
          </div>
        )}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-side-line px-3 py-3">
        <NavLink to="/account" onClick={close} title="My account: details and password"
          className="-m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1 hover:bg-side-2">
          <Avatar name={user.fullName} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-medium">{user.fullName}</span>
            <span className="block truncate text-xs text-side-muted">{roleLabel[user.role]} · My account</span>
          </span>
        </NavLink>
        <button onClick={logout} title="Log out" aria-label="Log out"
          className="rounded-md p-1.5 text-side-muted hover:bg-side-2 hover:text-side-fg cursor-pointer">
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 lg:block">{sidebar}</aside>

      {/* Phone menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <aside className="absolute inset-y-0 left-0 w-64 fade-in">{sidebar}</aside>
          <button onClick={close} aria-label="Close menu" className="absolute left-66 top-3 rounded-md bg-surface p-1.5 text-fg">
            <X className="size-5" />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-md p-2 text-muted hover:bg-surface-2 lg:hidden cursor-pointer">
            <Menu className="size-5" />
          </button>
          <LogoMark className="size-6 sm:hidden" />
          <QuickJump key={location.pathname} />
          <div className="ml-auto flex items-center gap-1">
            <LiveIndicator status={live} />
            <button onClick={toggleTheme} aria-label="Toggle dark mode" title={theme === 'dark' ? 'Light mode' : 'Dark mode'} className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-fg cursor-pointer">
              {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
            </button>
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div key={location.pathname} className="fade-in mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function NavGroup({ items, onNavigate, counts = {} }: { items: NavItem[]; onNavigate: () => void; counts?: Record<string, number> }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
              isActive ? 'bg-side-2 font-medium text-white' : 'text-side-muted hover:bg-side-2/60 hover:text-side-fg',
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {!!counts[item.to] && (
              <span className="tabular rounded bg-[#1f7a83] px-1.5 text-[11px] font-medium leading-4 text-white">{counts[item.to]}</span>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

/** Type a reference like "INC0007" or "7" and press Enter to open it, or any text to search. Press "/" to focus. */
function QuickJump() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

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
        ref={input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Go to INC0007 or search"
        aria-label="Go to an incident or search"
        className="peer h-8 w-full rounded-md border border-line bg-surface-2 pl-8 pr-8 text-sm text-fg placeholder:text-faint focus:border-ring focus:bg-surface focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 peer-focus:hidden">/</kbd>
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
      <span className="relative flex size-2">
        {status === 'live' && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-40 [animation-duration:2.5s]" />}
        <span className={cn('relative inline-flex size-2 rounded-full', status === 'live' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-500' : 'bg-slate-400')} />
      </span>
      {label}
    </span>
  )
}
