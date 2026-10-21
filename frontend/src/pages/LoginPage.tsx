import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowRight, BrainCircuit, Gauge, ShieldCheck, Timer, Wrench, UserRound, Crown } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { ApiError } from '../api/client'

const DEMO_PASSWORD = 'password123'
const demoAccounts = [
  { username: 'john', name: 'John', role: 'Employee', detail: 'Reports and tracks incidents', icon: <UserRound className="size-4" /> },
  { username: 'alice', name: 'Alice', role: 'Technician', detail: 'Network & cloud, team lead', icon: <Wrench className="size-4" /> },
  { username: 'admin', name: 'Asha', role: 'Administrator', detail: 'IT manager, sees everything', icon: <Crown className="size-4" /> },
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
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 size-[30rem] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
            <Gauge className="size-5" />
          </div>
          <span className="text-lg font-semibold">I-ITSM</span>
        </div>
        <div className="relative mt-auto max-w-lg">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            From "it's broken" to "it's fixed",<br />
            <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">automatically.</span>
          </h1>
          <p className="mt-4 text-base text-indigo-100/80">
            Report an IT problem and the system classifies it, sets its priority, starts the SLA clock,
            picks the best technician and keeps everyone informed until it is closed.
          </p>
          <ul className="mt-8 grid gap-3 text-sm text-indigo-100/90">
            <li className="flex items-center gap-3"><BrainCircuit className="size-4 text-indigo-300" /> Duplicate detection, auto-categorisation and smart assignment</li>
            <li className="flex items-center gap-3"><Timer className="size-4 text-indigo-300" /> Live SLA timers with warnings and automatic escalation</li>
            <li className="flex items-center gap-3"><ShieldCheck className="size-4 text-indigo-300" /> Role-based access and a complete audit trail</li>
          </ul>
          <div className="mt-10 flex flex-wrap gap-1.5 text-[11px] font-medium text-indigo-200/80">
            {['Report', 'Classify', 'Prioritise', 'Assign', 'Investigate', 'Resolve', 'Verify', 'Close'].map((s, i) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/10">{s}</span>
                {i < 7 && <ArrowRight className="size-3 opacity-50" />}
              </span>
            ))}
          </div>
        </div>
        <p className="relative mt-12 text-xs text-indigo-200/50">CS F213 Object-Oriented Programming project</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand text-white"><Gauge className="size-5" /></div>
            <span className="text-lg font-semibold text-fg">I-ITSM</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-fg">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use your work account, or pick a demo account below.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Username" htmlFor="username">
              <Input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={busy === username.trim() && busy !== null}>
              Sign in
            </Button>
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-3 text-xs text-faint">
              <span className="h-px flex-1 bg-line" /> Demo accounts (password {DEMO_PASSWORD}) <span className="h-px flex-1 bg-line" />
            </div>
            <div className="mt-4 grid gap-2">
              {demoAccounts.map((a) => (
                <button
                  key={a.username}
                  onClick={() => signIn(a.username, DEMO_PASSWORD)}
                  disabled={busy !== null}
                  className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left transition hover:border-brand/40 hover:shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">{a.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-fg">{a.name} <span className="font-normal text-muted">· {a.role}</span></span>
                    <span className="block text-xs text-muted">{a.detail}</span>
                  </span>
                  <ArrowRight className="size-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-brand" />
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-faint">Also: priya (employee), bob, carol, dave (technicians), sysadmin</p>
          </div>

          <p className="mt-8 text-center text-sm text-muted">
            New employee? <Link to="/register" className="font-medium text-brand hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
