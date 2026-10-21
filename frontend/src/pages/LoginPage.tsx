import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { ApiError } from '../api/client'

// Accounts created by DataSeeder on an empty database. All use the same password.
const DEMO_PASSWORD = 'password123'
const demoAccounts = [
  { username: 'rohan', name: 'Rohan Mehta', role: 'Employee (Finance)' },
  { username: 'priya', name: 'Priya Nair', role: 'Employee (Sales)' },
  { username: 'ananya', name: 'Ananya Rao', role: 'Technician, network team lead' },
  { username: 'vikram', name: 'Vikram Singh', role: 'Technician, database' },
  { username: 'sneha', name: 'Sneha Kulkarni', role: 'Technician, desktop' },
  { username: 'arjun', name: 'Arjun Das', role: 'Technician, security' },
  { username: 'kavita', name: 'Kavita Sharma', role: 'Administrator, IT manager' },
  { username: 'suresh', name: 'Suresh Iyer', role: 'Administrator' },
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

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="size-8" />
          <div className="leading-tight">
            <p className="text-base font-semibold text-fg">I-ITSM</p>
            <p className="text-xs text-muted">IT service desk</p>
          </div>
        </div>

        <div className="rounded-md border border-line bg-surface p-6">
          <h1 className="text-lg font-semibold text-fg">Sign in</h1>
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <Field label="Username" htmlFor="username">
              <Input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error && (
              <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">{error}</p>
            )}
            <Button type="submit" className="w-full" loading={busy === username.trim() && busy !== null}>
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted">
            New employee? <Link to="/register" className="font-medium text-brand hover:underline">Create an account</Link>
          </p>
        </div>

        <div className="mt-6 rounded-md border border-line bg-surface">
          <p className="border-b border-line px-4 py-2.5 text-sm text-muted">
            Demo accounts, password <code className="font-mono text-fg">{DEMO_PASSWORD}</code>. Click one to sign in.
          </p>
          <ul className="divide-y divide-line">
            {demoAccounts.map((a) => (
              <li key={a.username}>
                <button
                  onClick={() => signIn(a.username, DEMO_PASSWORD)}
                  disabled={busy !== null}
                  className="flex w-full items-baseline gap-3 px-4 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-60 cursor-pointer"
                >
                  <span className="w-16 shrink-0 font-mono text-xs text-brand">{a.username}</span>
                  <span className="min-w-0 flex-1 truncate text-fg">{a.name}</span>
                  <span className="hidden truncate text-xs text-muted sm:block">{a.role}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-center text-xs text-faint">CS F213 Object-Oriented Programming, course project</p>
      </div>
    </div>
  )
}
