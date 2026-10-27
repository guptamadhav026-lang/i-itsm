import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/endpoints'
import { ApiError, errorText } from '../api/client'
import type { Role } from '../api/types'
import { useUser } from '../auth/AuthContext'
import { categoryLabel } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Field, Input } from '../components/ui/Field'
import { Avatar, PageHeader } from '../components/ui/misc'
import { useToast } from '../components/ui/Toast'

const roleLabel: Record<Role, string> = { EMPLOYEE: 'Employee', TECHNICIAN: 'Technician', ADMIN: 'Administrator' }

/** The logged-in user's own details, and where they change their password. */
export function AccountPage() {
  const user = useUser()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My account" subtitle="Your details are managed by the IT administrators. You can change your own password here." />
      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Your details" />
          <CardBody>
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={user.fullName} />
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">{user.fullName}</p>
                <p className="truncate text-sm text-muted">@{user.username}</p>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Role">{roleLabel[user.role]}</Row>
              <Row label="Email">{user.email}</Row>
              {user.role === 'EMPLOYEE' && <Row label="Department">{user.department || '-'}</Row>}
              {user.role === 'TECHNICIAN' && <>
                <Row label="Skills">{user.skills?.length ? user.skills.map(categoryLabel).join(', ') : '-'}</Row>
                <Row label="Experience">{user.experienceYears} years</Row>
                <Row label="Active incidents at most">{user.maxActiveIncidents}</Row>
              </>}
              {user.role === 'ADMIN' && <Row label="IT manager">{user.itManager ? 'Yes' : 'No'}</Row>}
            </dl>
          </CardBody>
        </Card>
        <ChangePasswordCard />
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-fg">{children}</dd>
    </div>
  )
}

function ChangePasswordCard() {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const change = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => {
      setCurrent(''); setNext(''); setRepeat('')
      toast.success('Password changed', 'Use the new password next time you log in.')
    },
    onError: (e) => setErrors(e instanceof ApiError ? { ...e.fieldErrors, _: e.message } : { _: errorText(e) }),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (next !== repeat) {
      setErrors({ repeat: 'The two new passwords are not the same' })
      return
    }
    setErrors({})
    change.mutate()
  }

  return (
    <Card>
      <CardHeader title="Change password" subtitle="8 to 72 characters. Pick one you do not use anywhere else." />
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Current password" error={errors.currentPassword}>
            <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="New password" error={errors.newPassword}>
            <Input type="password" autoComplete="new-password" maxLength={72} value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="New password again" error={errors.repeat}>
            <Input type="password" autoComplete="new-password" maxLength={72} value={repeat} onChange={(e) => setRepeat(e.target.value)} />
          </Field>
          {errors._ && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{errors._}</p>}
          <Button type="submit" loading={change.isPending} disabled={!current || next.length < 8 || !repeat}>Change password</Button>
        </form>
      </CardBody>
    </Card>
  )
}
