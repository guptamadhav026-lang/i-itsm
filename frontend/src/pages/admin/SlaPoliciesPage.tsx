import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/endpoints'
import type { SlaPolicy } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Field'
import { ErrorState, PageHeader, PageLoader } from '../../components/ui/misc'
import { useToast } from '../../components/ui/Toast'
import { PriorityBadge } from '../../components/incident/badges'
import { formatMinutes } from '../../lib/format'

/** Response/resolution targets per priority. Changes apply to incidents reported (or re-prioritised) afterwards. */
export function SlaPoliciesPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'sla'], queryFn: adminApi.slaPolicies })
  return (
    <div>
      <PageHeader title="SLA policies"
        subtitle="How fast each priority must be acknowledged and resolved, and when to warn before the deadline." />
      {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading ? <PageLoader /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.map((p) => <PolicyCard key={p.priority} policy={p} />)}
        </div>
      )}
      <p className="mt-5 max-w-3xl text-sm text-muted">
        The SLA monitor checks every open incident once a minute. It sends a warning at the threshold, records a breach after
        the deadline, and escalates P1 and P2 incidents nobody has acknowledged: first to the team lead, then the system
        administrator, then the IT manager.
      </p>
    </div>
  )
}

function PolicyCard({ policy }: { policy: SlaPolicy }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [response, setResponse] = useState(policy.responseMinutes)
  const [resolution, setResolution] = useState(policy.resolutionMinutes)
  const [warning, setWarning] = useState(policy.warningThresholdPercent)
  const dirty = response !== policy.responseMinutes || resolution !== policy.resolutionMinutes || warning !== policy.warningThresholdPercent
  const save = useMutation({
    mutationFn: () => adminApi.updateSlaPolicy(policy.priority, { responseMinutes: response, resolutionMinutes: resolution, warningThresholdPercent: warning }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'sla'] }); toast.success(`${policy.priority} SLA updated`) },
    onError: (e) => toast.error('Could not save', (e as Error).message),
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
