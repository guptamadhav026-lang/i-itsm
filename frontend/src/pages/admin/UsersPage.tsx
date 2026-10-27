import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Search } from 'lucide-react'
import { adminApi, type CreateUserBody, type UpdateUserBody } from '../../api/endpoints'
import { ApiError, errorText } from '../../api/client'
import type { Role, User } from '../../api/types'
import { useUser } from '../../auth/AuthContext'
import { Badge, type Tone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Input, Select, Toggle } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { Avatar, ErrorState, PageHeader, PageLoader, Tabs } from '../../components/ui/misc'
import { useToast } from '../../components/ui/Toast'
import { categoryLabel } from '../../lib/format'

const roleBadge: Record<Role, { tone: Tone; label: string }> = {
  EMPLOYEE: { tone: 'gray', label: 'Employee' },
  TECHNICIAN: { tone: 'blue', label: 'Technician' },
  ADMIN: { tone: 'brand', label: 'Administrator' },
}

type RoleFilter = 'ALL' | Role

export function UsersPage() {
  const me = useUser()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<RoleFilter>('ALL')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [resetting, setResetting] = useState<User | null>(null)
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.users })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] })
    queryClient.invalidateQueries({ queryKey: ['reports'] })
  }
  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => adminApi.setActive(id, active),
    onSuccess: (u) => { invalidate(); toast.success(`${u.fullName} ${u.active ? 'activated' : 'deactivated'}`) },
    onError: (e) => toast.error('Could not change the account', errorText(e)),
  })

  const shown = useMemo(() => data
    .filter((u) => filter === 'ALL' || u.role === filter)
    .filter((u) => !search || `${u.fullName} ${u.username} ${u.email}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.role.localeCompare(b.role) || a.fullName.localeCompare(b.fullName)), [data, filter, search])

  const count = (r: Role) => data.filter((u) => u.role === r).length

  return (
    <div>
      <PageHeader title="Users and technicians" subtitle="Create accounts, manage technician skills and capacity, deactivate leavers."
        actions={<Button onClick={() => setCreating(true)}>New user</Button>} />

      <Card>
        <div className="flex flex-col gap-3 px-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
          <Tabs<RoleFilter> value={filter} onChange={setFilter} tabs={[
            { value: 'ALL', label: 'Everyone', count: data.length },
            { value: 'EMPLOYEE', label: 'Employees', count: count('EMPLOYEE') },
            { value: 'TECHNICIAN', label: 'Technicians', count: count('TECHNICIAN') },
            { value: 'ADMIN', label: 'Administrators', count: count('ADMIN') },
          ]} />
          <div className="relative pb-2 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-[calc(50%-4px)] size-4 -translate-y-1/2 text-faint" />
            <Input aria-label="Search users" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="pl-9" />
          </div>
        </div>
        {error ? <div className="p-5"><ErrorState error={error} onRetry={refetch} /></div> : isLoading ? <PageLoader /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-line bg-surface-2/50 text-xs text-muted">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">User</th>
                  <th className="px-4 py-2.5 text-left font-medium">Role</th>
                  <th className="px-4 py-2.5 text-left font-medium">Details</th>
                  <th className="px-4 py-2.5 text-left font-medium">Active</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((u) => (
                  <tr key={u.id} className={u.active ? '' : 'opacity-60'}>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar name={u.fullName} />
                        <span>
                          <span className="block font-medium text-fg">{u.fullName}</span>
                          <span className="block text-xs text-muted">@{u.username} · {u.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3"><Badge tone={roleBadge[u.role].tone}>{roleBadge[u.role].label}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {u.role === 'EMPLOYEE' && (u.department ?? '-')}
                      {u.role === 'ADMIN' && (u.itManager ? 'IT manager (top of escalation chain)' : 'System administrator')}
                      {u.role === 'TECHNICIAN' && (
                        <span className="flex flex-wrap items-center gap-1.5">
                          {u.skills?.map((s) => <span key={s} className="rounded bg-surface-2 px-1.5 py-0.5 ring-1 ring-line">{categoryLabel(s)}</span>)}
                          <span>· {u.experienceYears} yrs · max {u.maxActiveIncidents}</span>
                          {u.teamLead && <Badge tone="amber">Team lead</Badge>}
                          {!u.available && <Badge>Unavailable</Badge>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Toggle checked={u.active} disabled={u.id === me.id || setActive.isPending} label={`Active: ${u.fullName}`}
                        onChange={(v) => setActive.mutate({ id: u.id, active: v })} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(u)} aria-label={`Edit ${u.fullName}`}>Edit</Button>
                      {u.id !== me.id && (
                        <Button size="sm" variant="ghost" icon={<KeyRound className="size-3.5" />} onClick={() => setResetting(u)}
                          aria-label={`Set a new password for ${u.fullName}`}>Password</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* mounted only while open, so every dialog starts from fresh values */}
      {creating && <CreateUserModal onClose={() => setCreating(false)} onCreated={(u) => { invalidate(); setCreating(false); toast.success(`${u.fullName} created`) }} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onSaved={(u) => { invalidate(); setEditing(null); toast.success(`${u.fullName} updated`) }} />}
      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)}
        onSaved={(u) => { setResetting(null); toast.success(`New password set for ${u.fullName}`, 'Tell them the new password; they can change it under My account.') }} />}
    </div>
  )
}

/** Skills are category names (the SKILL_BASED and SMART strategies compare them), so they come from the catalogue. */
function SkillPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { data } = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories })
  const names = [...new Set([...(data ?? []).filter((c) => c.active).map((c) => c.name), ...value])].sort()
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Skills">
      {names.map((s) => {
        const on = value.includes(s)
        return (
          <button key={s} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== s) : [...value, s])}
            className={`rounded-md px-2 py-1 text-xs font-medium ring-1 transition cursor-pointer ${on ? 'bg-brand text-brand-fg ring-brand' : 'bg-surface text-muted ring-line hover:text-fg'}`}>
            {categoryLabel(s)}
          </button>
        )
      })}
    </div>
  )
}

function FormError({ text }: { text?: string }) {
  if (!text) return null
  return <p role="alert" className="sm:col-span-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{text}</p>
}

/** The server's message plus one entry per refused field, for showing next to the inputs. */
function errorsOf(e: unknown): Record<string, string> {
  return e instanceof ApiError ? { ...e.fieldErrors, _: e.message } : { _: errorText(e) }
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: User) => void }) {
  const [form, setForm] = useState<CreateUserBody>({
    role: 'TECHNICIAN', username: '', password: '', fullName: '', email: '', department: '', skills: [],
    experienceYears: 1, maxActiveIncidents: 5, teamLead: false, itManager: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const create = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: onCreated,
    onError: (e) => setErrors(errorsOf(e)),
  })
  const set = <K extends keyof CreateUserBody>(k: K, v: CreateUserBody[K]) => setForm({ ...form, [k]: v })

  return (
    <Modal open onClose={onClose} size="lg" title="New user" description="Technicians get incidents automatically when their skills match."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={create.isPending} onClick={() => { setErrors({}); create.mutate(form) }}>Create user</Button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role" className="sm:col-span-2">
          <Select value={form.role} onChange={(e) => set('role', e.target.value as Role)}>
            <option value="EMPLOYEE">Employee</option>
            <option value="TECHNICIAN">Technician</option>
            <option value="ADMIN">Administrator</option>
          </Select>
        </Field>
        <Field label="Full name" error={errors.fullName} required><Input value={form.fullName} maxLength={100} onChange={(e) => set('fullName', e.target.value)} /></Field>
        <Field label="Username" error={errors.username} hint="3 to 50 letters, digits, dots or dashes" required>
          <Input value={form.username} maxLength={50} autoComplete="off" onChange={(e) => set('username', e.target.value)} />
        </Field>
        <Field label="Email" error={errors.email} required><Input type="email" value={form.email} maxLength={120} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Temporary password" error={errors.password} hint="8 to 72 characters" required>
          <Input type="password" value={form.password} maxLength={72} autoComplete="new-password" onChange={(e) => set('password', e.target.value)} />
        </Field>
        {form.role === 'EMPLOYEE' && (
          <Field label="Department" className="sm:col-span-2" error={errors.department}><Input value={form.department} maxLength={100} onChange={(e) => set('department', e.target.value)} /></Field>
        )}
        {form.role === 'TECHNICIAN' && <>
          <Field label="Skills" className="sm:col-span-2" hint="Matched against the incident category" error={errors.skills}><SkillPicker value={form.skills ?? []} onChange={(v) => set('skills', v)} /></Field>
          <Field label="Years of experience" error={errors.experienceYears}><Input type="number" min={0} max={50} value={form.experienceYears} onChange={(e) => set('experienceYears', Number(e.target.value))} /></Field>
          <Field label="Max active incidents" error={errors.maxActiveIncidents}><Input type="number" min={1} max={50} value={form.maxActiveIncidents} onChange={(e) => set('maxActiveIncidents', Number(e.target.value))} /></Field>
          <label className="flex items-center gap-3 text-sm text-fg sm:col-span-2"><Toggle checked={!!form.teamLead} onChange={(v) => set('teamLead', v)} label="Team lead" /> Team lead (receives first-level escalations)</label>
        </>}
        {form.role === 'ADMIN' && (
          <label className="flex items-center gap-3 text-sm text-fg sm:col-span-2"><Toggle checked={!!form.itManager} onChange={(v) => set('itManager', v)} label="IT manager" /> IT manager (receives top-level escalations)</label>
        )}
        <FormError text={errors._} />
      </div>
    </Modal>
  )
}

/** Name and e-mail for everyone, plus the role's own details. The role and username cannot change. */
function EditUserModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: (u: User) => void }) {
  const [fullName, setFullName] = useState(user.fullName)
  const [email, setEmail] = useState(user.email)
  const [department, setDepartment] = useState(user.department ?? '')
  const [itManager, setItManager] = useState(!!user.itManager)
  const [skills, setSkills] = useState(user.skills ?? [])
  const [experience, setExperience] = useState(user.experienceYears ?? 0)
  const [max, setMax] = useState(user.maxActiveIncidents ?? 5)
  const [available, setAvailable] = useState(!!user.available)
  const [teamLead, setTeamLead] = useState(!!user.teamLead)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: async () => {
      const details: UpdateUserBody = { fullName: fullName.trim(), email: email.trim() }
      if (user.role === 'EMPLOYEE') details.department = department.trim()
      if (user.role === 'ADMIN') details.itManager = itManager
      let saved = await adminApi.updateUser(user.id, details)
      if (user.role === 'TECHNICIAN') {
        saved = await adminApi.updateTechnician(user.id, { skills, experienceYears: experience, maxActiveIncidents: max, available, teamLead })
      }
      return saved
    },
    onSuccess: onSaved,
    onError: (e) => setErrors(errorsOf(e)),
  })
  return (
    <Modal open onClose={onClose} size="lg" title={`Edit ${user.fullName}`}
      description={user.role === 'TECHNICIAN' ? 'Changes apply to the next assignment straight away.' : `@${user.username} · ${roleBadge[user.role].label}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={save.isPending} disabled={!fullName.trim() || !email.trim()} onClick={() => { setErrors({}); save.mutate() }}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.fullName} required><Input value={fullName} maxLength={100} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label="Email" error={errors.email} required><Input type="email" value={email} maxLength={120} onChange={(e) => setEmail(e.target.value)} /></Field>
        {user.role === 'EMPLOYEE' && (
          <Field label="Department" className="sm:col-span-2" error={errors.department}><Input value={department} maxLength={100} onChange={(e) => setDepartment(e.target.value)} /></Field>
        )}
        {user.role === 'ADMIN' && (
          <label className="flex items-center gap-3 text-sm text-fg sm:col-span-2"><Toggle checked={itManager} onChange={setItManager} label="IT manager" /> IT manager (receives top-level escalations)</label>
        )}
        {user.role === 'TECHNICIAN' && <>
          <Field label="Skills" className="sm:col-span-2" error={errors.skills}><SkillPicker value={skills} onChange={setSkills} /></Field>
          <Field label="Years of experience" error={errors.experienceYears}><Input type="number" min={0} max={50} value={experience} onChange={(e) => setExperience(Number(e.target.value))} /></Field>
          <Field label="Max active incidents" error={errors.maxActiveIncidents}><Input type="number" min={1} max={50} value={max} onChange={(e) => setMax(Number(e.target.value))} /></Field>
          <label className="flex items-center gap-3 text-sm text-fg"><Toggle checked={available} onChange={setAvailable} label="Available" /> Available</label>
          <label className="flex items-center gap-3 text-sm text-fg"><Toggle checked={teamLead} onChange={setTeamLead} label="Team lead" /> Team lead</label>
        </>}
        <FormError text={errors._} />
      </div>
    </Modal>
  )
}

/** For someone who forgot their password: the administrator sets a new one and passes it on. */
function ResetPasswordModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: (u: User) => void }) {
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useMutation({
    mutationFn: () => adminApi.resetPassword(user.id, password),
    onSuccess: onSaved,
    onError: (e) => setErrors(errorsOf(e)),
  })
  return (
    <Modal open onClose={onClose} title={`New password for ${user.fullName}`}
      description="Use this when someone has forgotten their password. Their current password stops working at once."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={save.isPending} disabled={password.length < 8} onClick={() => { setErrors({}); save.mutate() }}>Set password</Button></>}>
      <div className="space-y-4">
        <Field label="New password" hint="8 to 72 characters" error={errors.newPassword}>
          <Input type="password" value={password} maxLength={72} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <FormError text={errors._} />
      </div>
    </Modal>
  )
}
