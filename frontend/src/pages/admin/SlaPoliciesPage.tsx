import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { adminApi, type SlaTargets } from '../../api/endpoints'
import { PRIORITIES, type Priority, type SlaPolicy } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Field'
import { EmptyState, ErrorState, PageHeader, PageLoader } from '../../components/ui/misc'
import { useToast } from '../../components/ui/Toast'
import { PriorityBadge } from '../../components/incident/badges'
import { formatMinutes, PRIORITY_LABEL } from '../../lib/format'

/**
 * Response/resolution targets per priority, plus targets for single services that differ from the defaults.
 * Changes apply to incidents reported (or re-prioritised) afterwards.
 */
export function SlaPoliciesPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'sla'], queryFn: adminApi.slaPolicies })
  const defaults = data?.filter((p) => p.serviceId === null) ?? []
  const own = data?.filter((p) => p.serviceId !== null) ?? []
  return (
    <div>
      <PageHeader title="SLA policies"
        subtitle="How fast incidents must be acknowledged and resolved, and when to warn before the deadline." />
      {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading ? <PageLoader /> : (
        <>
          <h2 className="mb-2.5 text-sm font-semibold text-fg">Default targets</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {defaults.map((p) => <PolicyCard key={p.id} policy={p} />)}
          </div>

          <Card className="mt-8">
            <CardHeader title="Services with their own targets"
              subtitle="These replace the default for one priority on one service. Every other service keeps the defaults." />
            {own.length > 0 ? (
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted">
                    <tr className="border-b border-line">
                      <th className="px-4 py-2 text-left font-medium">Service</th>
                      <th className="px-4 py-2 text-left font-medium">Priority</th>
                      <th className="px-4 py-2 text-left font-medium">Respond within</th>
                      <th className="px-4 py-2 text-left font-medium">Resolve within</th>
                      <th className="px-4 py-2 text-left font-medium">Warn at</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {own.map((p) => <ServicePolicyRow key={p.id} policy={p} defaults={defaults} />)}
                  </tbody>
                </table>
              </div>
            ) : <div className="border-t border-line"><EmptyState compact title="No service has its own targets" message="All services use the defaults above." /></div>}
            <AddServicePolicy existing={own} />
          </Card>
        </>
      )}
      <p className="mt-5 max-w-3xl text-sm text-muted">
        The SLA monitor checks every open incident once a minute. It sends a warning at the threshold, records a breach after
        the deadline, and escalates P1 and P2 incidents nobody has acknowledged: first to the team lead, then the system
        administrator, then the IT manager.
      </p>
    </div>
  )
}

function useSaved(message: string) {
  const toast = useToast()
  const queryClient = useQueryClient()
  return {
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'sla'] }); toast.success(message) },
    onError: (e: Error) => toast.error('Could not save', e.message),
  }
}

function PolicyCard({ policy }: { policy: SlaPolicy }) {
  const [response, setResponse] = useState(policy.responseMinutes)
  const [resolution, setResolution] = useState(policy.resolutionMinutes)
  const [warning, setWarning] = useState(policy.warningThresholdPercent)
  const dirty = response !== policy.responseMinutes || resolution !== policy.resolutionMinutes || warning !== policy.warningThresholdPercent
  const save = useMutation({
    mutationFn: () => adminApi.updateSlaPolicy(policy.priority, { responseMinutes: response, resolutionMinutes: resolution, warningThresholdPercent: warning }),
    ...useSaved(`${policy.priority} SLA updated`),
  })
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <PriorityBadge priority={policy.priority} />
        <Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <NumberField label="Respond within" suffix="min" value={response} onChange={setResponse} hint={formatMinutes(response)} />
        <NumberField label="Resolve within" suffix="min" value={resolution} onChange={setResolution} hint={formatMinutes(resolution)} />
        <NumberField label="Warn at" suffix="%" value={warning} onChange={setWarning} max={99} hint="of the time used" />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2" title={`Warning at ${warning}%`}>
        <div className="flex h-full">
          <div className="h-full bg-emerald-500" style={{ width: `${warning}%` }} />
          <div className="h-full flex-1 bg-amber-400" />
        </div>
      </div>
      <div className="relative mt-1 h-4 text-[11px] text-faint">
        <span className="absolute left-0">reported</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${warning}%` }}>warning</span>
        <span className="absolute right-0">deadline</span>
      </div>
    </Card>
  )
}

function ServicePolicyRow({ policy, defaults }: { policy: SlaPolicy; defaults: SlaPolicy[] }) {
  const [targets, setTargets] = useState<SlaTargets>({
    responseMinutes: policy.responseMinutes, resolutionMinutes: policy.resolutionMinutes, warningThresholdPercent: policy.warningThresholdPercent,
  })
  const dirty = targets.responseMinutes !== policy.responseMinutes || targets.resolutionMinutes !== policy.resolutionMinutes
    || targets.warningThresholdPercent !== policy.warningThresholdPercent
  const save = useMutation({ mutationFn: () => adminApi.updateServiceSla(policy.id, targets), ...useSaved(`${policy.serviceName} ${policy.priority} updated`) })
  const remove = useMutation({ mutationFn: () => adminApi.deleteServiceSla(policy.id), ...useSaved(`${policy.serviceName} uses the default ${policy.priority} targets again`) })
  const standard = defaults.find((d) => d.priority === policy.priority)
  return (
    <tr>
      <td className="px-4 py-2.5 font-medium text-fg">{policy.serviceName}</td>
      <td className="px-4 py-2.5"><PriorityBadge priority={policy.priority} /></td>
      <td className="px-4 py-2.5">
        <SmallNumber value={targets.responseMinutes} suffix="min" onChange={(v) => setTargets({ ...targets, responseMinutes: v })}
          hint={standard && `default ${formatMinutes(standard.responseMinutes)}`} />
      </td>
      <td className="px-4 py-2.5">
        <SmallNumber value={targets.resolutionMinutes} suffix="min" onChange={(v) => setTargets({ ...targets, resolutionMinutes: v })}
          hint={standard && `default ${formatMinutes(standard.resolutionMinutes)}`} />
      </td>
      <td className="px-4 py-2.5">
        <SmallNumber value={targets.warningThresholdPercent} suffix="%" max={99} onChange={(v) => setTargets({ ...targets, warningThresholdPercent: v })} />
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-right">
        <Button size="sm" variant="secondary" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
        <button onClick={() => remove.mutate()} disabled={remove.isPending} title="Remove, use the defaults again" aria-label={`Remove ${policy.serviceName} ${policy.priority} targets`}
          className="ml-1 rounded-md p-1.5 align-middle text-muted hover:bg-surface-2 hover:text-red-600 cursor-pointer">
          <Trash2 className="size-4" />
        </button>
      </td>
    </tr>
  )
}

function AddServicePolicy({ existing }: { existing: SlaPolicy[] }) {
  const services = useQuery({ queryKey: ['admin', 'services'], queryFn: adminApi.services })
  const [serviceId, setServiceId] = useState('')
  const [priority, setPriority] = useState<Priority>('P2')
  const [targets, setTargets] = useState<SlaTargets>({ responseMinutes: 15, resolutionMinutes: 120, warningThresholdPercent: 75 })
  const saved = useSaved('Targets added')
  const add = useMutation({
    mutationFn: () => adminApi.createServiceSla({ serviceId: Number(serviceId), priority, ...targets }),
    onSuccess: () => { saved.onSuccess(); setServiceId('') },
    onError: saved.onError,
  })
  const taken = existing.some((p) => String(p.serviceId) === serviceId && p.priority === priority)
  const onSubmit = (e: FormEvent) => { e.preventDefault(); add.mutate() }
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 border-t border-line bg-surface-2/50 px-4 py-3">
      <label className="block min-w-44 flex-1">
        <span className="text-xs font-medium text-muted">Service</span>
        <Select className="mt-1" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
          <option value="" disabled>Choose a service</option>
          {services.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </label>
      <label className="block w-36">
        <span className="text-xs font-medium text-muted">Priority</span>
        <Select className="mt-1" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p} {PRIORITY_LABEL[p]}</option>)}
        </Select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted">Respond within</span>
        <SmallNumber value={targets.responseMinutes} suffix="min" onChange={(v) => setTargets({ ...targets, responseMinutes: v })} />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted">Resolve within</span>
        <SmallNumber value={targets.resolutionMinutes} suffix="min" onChange={(v) => setTargets({ ...targets, resolutionMinutes: v })} />
      </label>
      <Button type="submit" disabled={!serviceId || taken} loading={add.isPending} title={taken ? 'This service already has its own targets for this priority' : undefined}>
        Add
      </Button>
    </form>
  )
}

function SmallNumber({ value, suffix, onChange, hint, max }: {
  value: number; suffix: string; onChange: (v: number) => void; hint?: string; max?: number
}) {
  return (
    <span className="block">
      <span className="relative mt-1 block w-28">
        <Input type="number" min={1} max={max} value={value} onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))} className="pr-10" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">{suffix}</span>
      </span>
      {hint && <span className="mt-0.5 block text-[11px] text-faint">{hint}</span>}
    </span>
  )
}

function NumberField({ label, suffix, value, onChange, hint, max }: {
  label: string; suffix: string; value: number; onChange: (v: number) => void; hint: string; max?: number
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="relative mt-1 block">
        <Input type="number" min={1} max={max} value={value} onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))} className="pr-10" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">{suffix}</span>
      </span>
      <span className="mt-1 block text-[11px] text-faint">{hint}</span>
    </label>
  )
}
