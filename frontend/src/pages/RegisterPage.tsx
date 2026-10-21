import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { authApi } from '../api/endpoints'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'

/** Self-registration: always creates an EMPLOYEE account (technicians/admins are created by an admin). */
export function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', username: '', email: '', department: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setMessage(null)
    try {
      await authApi.register({ ...form, department: form.department || undefined })
      await login(form.username, form.password)
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors)
        setMessage(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="size-8" />
          <div className="leading-tight">
            <p className="text-base font-semibold text-fg">I-ITSM</p>
            <p className="text-xs text-muted">IT service desk</p>
          </div>
        </div>
        <div className="rounded-md border border-line bg-surface p-6">
          <h1 className="text-lg font-semibold text-fg">New employee account</h1>
          <p className="mt-1 text-sm text-muted">Technician and administrator accounts are created by an administrator.</p>
          <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="fullName" error={errors.fullName} required className="sm:col-span-2">
              <Input id="fullName" value={form.fullName} onChange={set('fullName')} required />
            </Field>
            <Field label="Username" htmlFor="username" error={errors.username} hint="Letters, digits, . _ -" required>
              <Input id="username" value={form.username} onChange={set('username')} required minLength={3} />
            </Field>
            <Field label="Department" htmlFor="department">
              <Input id="department" value={form.department} onChange={set('department')} placeholder="e.g. Finance" />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email} required className="sm:col-span-2">
              <Input id="email" type="email" value={form.email} onChange={set('email')} required />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters" required className="sm:col-span-2">
              <Input id="password" type="password" value={form.password} onChange={set('password')} required minLength={8} />
            </Field>
            {message && <p role="alert" className="sm:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{message}</p>}
            <Button type="submit" loading={busy} className="sm:col-span-2">Create account</Button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account? <Link to="/login" className="font-medium text-brand hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
