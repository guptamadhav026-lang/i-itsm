import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Crown, Pencil, Search, UserPlus, UserRound, Wrench } from 'lucide-react'
import { adminApi, type CreateUserBody } from '../../api/endpoints'
import { ApiError } from '../../api/client'
import type { Role, User } from '../../api/types'
import { useUser } from '../../auth/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Input, Select, Toggle } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { Avatar, ErrorState, PageHeader, PageLoader, Tabs } from '../../components/ui/misc'
import { useToast } from '../../components/ui/Toast'

const roleBadge: Record<Role, { tone: 'sky' | 'violet' | 'brand'; label: string; icon: ReactNode }> = {
  EMPLOYEE: { tone: 'sky', label: 'Employee', icon: <UserRound className="size-3" /> },
  TECHNICIAN: { tone: 'violet', label: 'Technician', icon: <Wrench className="size-3" /> },
  ADMIN: { tone: 'brand', label: 'Administrator', icon: <Crown className="size-3" /> },
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
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.users })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] })
    queryClient.invalidateQueries({ queryKey: ['reports'] })
  }
  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => adminApi.setActive(id, active),
    onSuccess: (u) => { invalidate(); toast.success(`${u.fullName} ${u.active ? 'activated' : 'deactivated'}`) },
    onError: (e) => toast.error('Could not change the account', (e as Error).message),
  })

  const shown = useMemo(() => data
    .filter((u) => filter === 'ALL' || u.role === filter)
    .filter((u) => !search || `${u.fullName} ${u.username} ${u.email}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.role.localeCompare(b.role) || a.fullName.localeCompare(b.fullName)), [data, filter, search])

  const count = (r: Role) => data.filter((u) => u.role === r).length

  return (
    <div className="animate-in">
      <PageHeader eyebrow="Administration" title="Users & technicians" subtitle="Create accounts, manage technician skills and capacity, deactivate leavers."
        actions={<Button icon={<UserPlus className="size-4" />} onClick={() => setCreating(true)}>New user</Button>} />

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
            <Input aria-label="Search users" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="h-9 pl-9" />
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
                    <td className="px-4 py-3"><Badge tone={roleBadge[u.role].tone} icon={roleBadge[u.role].icon}>{roleBadge[u.role].label}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {u.role === 'EMPLOYEE' && (u.department ?? '—')}
                      {u.role === 'ADMIN' && (u.itManager ? 'IT manager (top of escalation chain)' : 'System administrator')}
                      {u.role === 'TECHNICIAN' && (
                        <span className="flex flex-wrap items-center gap-1.5">
                          {u.skills?.map((s) => <span key={s} className="rounded bg-surface-2 px-1.5 py-0.5 ring-1 ring-line">{s}</span>)}
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
                    <td className="px-4 py-3 text-right">
                      {u.role === 'TECHNICIAN' && <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(u)}>Edit</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateUserModal open={creating} onClose={() => setCreating(false)} onCreated={(u) => { invalidate(); setCreating(false); toast.success(`${u.fullName} created`) }} />
      {editing && <EditTechnicianModal technician={editing} onClose={() => setEditing(null)} onSaved={() => { invalidate(); setEditing(null); toast.success('Technician updated') }} />}
    </div>
  )
}

const SKILLS = ['NETWORK', 'HARDWARE', 'SOFTWARE', 'APPLICATION', 'DATABASE', 'AUTHENTICATION', 'SECURITY', 'STORAGE', 'CLOUD', 'EMAIL']

function SkillPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SKILLS.map((s) => {
        const on = value.includes(s)
        return (
          <button key={s} type="button" onClick={() => onChange(on ? value.filter((x) => x !== s) : [...value, s])}
            className={`rounded-md px-2 py-1 text-xs font-medium ring-1 transition cursor-pointer ${on ? 'bg-brand text-brand-fg ring-brand' : 'bg-surface text-muted ring-line hover:text-fg'}`}>
            {s}
          </button>
        )
      })}
    </div>
  )
}

function CreateUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (u: User) => void }) {
  const empty: CreateUserBody = { role: 'TECHNICIAN', username: '', password: '', fullName: '', email: '', department: '', skills: [], experienceYears: 1, maxActiveIncidents: 5, teamLead: false, itManager: false }
  const [form, setForm] = useState<CreateUserBody>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const create = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: (u) => { setForm(empty); onCreated(u) },
    onError: (e) => setErrors(e instanceof ApiError ? { ...e.fieldErrors, _: e.message } : { _: 'Failed' }),
  })
  const set = <K extends keyof CreateUserBody>(k: K, v: CreateUserBody[K]) => setForm({ ...form, [k]: v })

  return (
    <Modal open={open} onClose={onClose} size="lg" title="New user" description="Technicians get incidents automatically when their skills match."
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
        <Field label="Full name" error={errors.fullName} required><Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} /></Field>
        <Field label="Username" error={errors.username} required><Input value={form.username} onChange={(e) => set('username', e.target.value)} /></Field>
        <Field label="Email" error={errors.email} required><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Temporary password" error={errors.password} hint="At least 8 characters" required><Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} /></Field>
        {form.role === 'EMPLOYEE' && (
          <Field label="Department" className="sm:col-span-2"><Input value={form.department} onChange={(e) => set('department', e.target.value)} /></Field>
        )}
        {form.role === 'TECHNICIAN' && <>
          <Field label="Skills" className="sm:col-span-2" hint="Matched against the incident category"><SkillPicker value={form.skills ?? []} onChange={(v) => set('skills', v)} /></Field>
          <Field label="Years of experience" error={errors.experienceYears}><Input type="number" min={0} max={50} value={form.experienceYears} onChange={(e) => set('experienceYears', Number(e.target.value))} /></Field>
          <Field label="Max active incidents" error={errors.maxActiveIncidents}><Input type="number" min={1} max={50} value={form.maxActiveIncidents} onChange={(e) => set('maxActiveIncidents', Number(e.target.value))} /></Field>
          <label className="flex items-center gap-3 text-sm text-fg sm:col-span-2"><Toggle checked={!!form.teamLead} onChange={(v) => set('teamLead', v)} label="Team lead" /> Team lead (receives first-level escalations)</label>
        </>}
        {form.role === 'ADMIN' && (
          <label className="flex items-center gap-3 text-sm text-fg sm:col-span-2"><Toggle checked={!!form.itManager} onChange={(v) => set('itManager', v)} label="IT manager" /> IT manager (receives top-level escalations)</label>
        )}
        {errors._ && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{errors._}</p>}
      </div>
    </Modal>
  )
}

function EditTechnicianModal({ technician, onClose, onSaved }: { technician: User; onClose: () => void; onSaved: () => void }) {
  const [skills, setSkills] = useState(technician.skills ?? [])
  const [experience, setExperience] = useState(technician.experienceYears ?? 0)
  const [max, setMax] = useState(technician.maxActiveIncidents ?? 5)
  const [available, setAvailable] = useState(!!technician.available)
  const [teamLead, setTeamLead] = useState(!!technician.teamLead)
  const save = useMutation({
    mutationFn: () => adminApi.updateTechnician(technician.id, { skills, experienceYears: experience, maxActiveIncidents: max, available, teamLead }),
    onSuccess: onSaved,
  })
  return (
    <Modal open onClose={onClose} size="lg" title={`Edit ${technician.fullName}`} description="Changes apply to the next assignment straight away."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Skills" className="sm:col-span-2"><SkillPicker value={skills} onChange={setSkills} /></Field>
        <Field label="Years of experience"><Input type="number" min={0} max={50} value={experience} onChange={(e) => setExperience(Number(e.target.value))} /></Field>
        <Field label="Max active incidents"><Input type="number" min={1} max={50} value={max} onChange={(e) => setMax(Number(e.target.value))} /></Field>
        <label className="flex items-center gap-3 text-sm text-fg"><Toggle checked={available} onChange={setAvailable} label="Available" /> Available</label>
        <label className="flex items-center gap-3 text-sm text-fg"><Toggle checked={teamLead} onChange={setTeamLead} label="Team lead" /> Team lead</label>
        {save.error && <p className="sm:col-span-2 text-sm text-red-600">{(save.error as Error).message}</p>}
      </div>
    </Modal>
  )
}
