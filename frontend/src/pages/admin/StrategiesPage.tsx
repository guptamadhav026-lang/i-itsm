import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/endpoints'
import type { Strategy } from '../../api/types'
import { Card, CardHeader } from '../../components/ui/Card'
import { ErrorState, PageHeader, PageLoader } from '../../components/ui/misc'
import { useToast } from '../../components/ui/Toast'
import { cn } from '../../lib/cn'
import { strategyLabel } from '../../lib/format'

/**
 * The Strategy pattern, live: pick which algorithm assigns technicians and which calculates priority.
 * The switch happens at runtime with no restart and no code change.
 */
export function StrategiesPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const assignment = useQuery({ queryKey: ['admin', 'strategies', 'assignment'], queryFn: adminApi.assignmentStrategies })
  const priority = useQuery({ queryKey: ['admin', 'strategies', 'priority'], queryFn: adminApi.priorityStrategies })

  const setAssignment = useMutation({
    mutationFn: adminApi.setAssignmentStrategy,
    onSuccess: (list) => { queryClient.setQueryData(['admin', 'strategies', 'assignment'], list); toast.success(`Assignment strategy: ${strategyLabel(list.find((s) => s.active)!.name)}`) },
  })
  const setPriority = useMutation({
    mutationFn: adminApi.setPriorityStrategy,
    onSuccess: (list) => { queryClient.setQueryData(['admin', 'strategies', 'priority'], list); toast.success(`Priority strategy: ${strategyLabel(list.find((s) => s.active)!.name)}`) },
  })

  return (
    <div>
      <PageHeader title="Strategies"
        subtitle="Choose the algorithms the system uses. New incidents use the new choice immediately." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Technician assignment" subtitle="Who gets a new incident" />
          <div className="space-y-2 px-4 pb-4">
            {assignment.error ? <ErrorState error={assignment.error} /> : assignment.isLoading ? <PageLoader />
              : assignment.data?.map((s) => <Option key={s.name} strategy={s} busy={setAssignment.isPending} onSelect={() => setAssignment.mutate(s.name)} />)}
          </div>
        </Card>
        <Card>
          <CardHeader title="Priority calculation" subtitle="How P1 to P4 is decided" />
          <div className="space-y-2 px-4 pb-4">
            {priority.error ? <ErrorState error={priority.error} /> : priority.isLoading ? <PageLoader />
              : priority.data?.map((s) => <Option key={s.name} strategy={s} busy={setPriority.isPending} onSelect={() => setPriority.mutate(s.name)} />)}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Option({ strategy, onSelect, busy }: { strategy: Strategy; onSelect: () => void; busy: boolean }) {
  return (
    <button
      onClick={onSelect}
      disabled={busy || strategy.active}
      aria-pressed={strategy.active}
      className={cn(
        'flex w-full items-start gap-3 rounded-md border p-3 text-left cursor-pointer disabled:cursor-default',
        strategy.active ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface-2',
      )}
    >
      <span className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border', strategy.active ? 'border-brand' : 'border-line-strong')}>
        {strategy.active && <span className="size-2 rounded-full bg-brand" />}
      </span>
      <span>
        <span className="flex items-center gap-2 text-sm font-semibold text-fg">
          {strategyLabel(strategy.name)}
          <span className="font-mono text-[11px] font-normal text-faint">{strategy.name}</span>
        </span>
        <span className="mt-0.5 block text-sm text-muted">{strategy.description}</span>
      </span>
    </button>
  )
}
