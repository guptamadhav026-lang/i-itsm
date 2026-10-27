import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { ApiError } from '../api/client'
import { Avatar } from '../components/ui/misc'
import { AuthLayout } from '../layout/AuthLayout'

// Accounts created by DataSeeder on an empty database. All use the same password.
// They are listed only while the server says the demo data is switched on (itsm.seed.enabled).
const DEMO_PASSWORD = 'password123'
const demoAccounts = [
  { username: 'rohan', name: 'Rohan Mehta', group: 'employee', detail: 'Finance' },
  { username: 'priya', name: 'Priya Nair', group: 'employee', detail: 'Sales' },
  { username: 'ananya', name: 'Ananya Rao', group: 'technician', detail: 'Network, team lead' },
  { username: 'vikram', name: 'Vikram Singh', group: 'technician', detail: 'Database' },
  { username: 'sneha', name: 'Sneha Kulkarni', group: 'technician', detail: 'Desktop' },
  { username: 'arjun', name: 'Arjun Das', group: 'technician', detail: 'Security' },
  { username: 'kavita', name: 'Kavita Sharma', group: 'admin', detail: 'IT manager' },
  { username: 'suresh', name: 'Suresh Iyer', group: 'admin', detail: '' },
]

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const options = useQuery({ queryKey: ['login-options'], queryFn: authApi.options, staleTime: Infinity, retry: false })

  const signIn = async (u: string, p: string) => {
    setError(null)
    setBusy(u)
    try {
      await login(u, p)
      navigate(from, { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Login failed')
    } finally {
      setBusy(null)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    signIn(username.trim(), password)
  }

  const groups = [
    { title: 'Employees', note: 'report problems', accounts: demoAccounts.filter((a) => a.group === 'employee') },
    { title: 'Technicians', note: 'fix them', accounts: demoAccounts.filter((a) => a.group === 'technician') },
    { title: 'Administrators', note: 'run the desk', accounts: demoAccounts.filter((a) => a.group === 'admin') },
  ]

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-fg">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Use your work username.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Username" htmlFor="username">
          <Input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">{error}</p>
        )}
        <Button type="submit" className="w-full" loading={busy === username.trim() && busy !== null}>
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        New employee? <Link to="/register" className="font-medium text-brand hover:underline">Create an account</Link>
      </p>

      {options.data?.demoAccounts && <div className="mt-10">
        <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
          <h2 className="text-sm font-semibold text-fg">Demo accounts</h2>
          <p className="text-xs text-muted">password <code className="font-mono text-fg">{DEMO_PASSWORD}</code></p>
        </div>
        <p className="mt-2 text-xs text-muted">Click a name to sign in as that person.</p>
        <div className="mt-3 space-y-4">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-faint">
                {g.title} <span className="normal-case tracking-normal">· {g.note}</span>
              </p>
              <ul className="overflow-hidden rounded-md border border-line bg-surface shadow-card">
                {g.accounts.map((a) => (
                  <li key={a.username} className="border-b border-line last:border-0">
                    <button
                      onClick={() => signIn(a.username, DEMO_PASSWORD)}
                      disabled={busy !== null}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-60 cursor-pointer"
                    >
                      <Avatar name={a.name} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-fg">{a.name}</span>
                      <span className="hidden truncate text-xs text-muted sm:block">{a.detail}</span>
                      <span className="w-14 shrink-0 text-right font-mono text-xs text-brand">{busy === a.username ? '...' : a.username}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>}
    </AuthLayout>
  )
}
