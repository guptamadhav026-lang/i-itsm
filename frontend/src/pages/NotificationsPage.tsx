import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Mail, MonitorSmartphone } from 'lucide-react'
import { notificationApi } from '../api/endpoints'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState, ErrorState, PageHeader, PageLoader, Tabs } from '../components/ui/misc'
import { cn } from '../lib/cn'
import { formatDateTime, timeAgo } from '../lib/format'

type Filter = 'unread' | 'all' | 'email'

/**
 * Every notification for the logged-in user. Two channels exist (in-app and e-mail);
 * e-mails are simulated, so the "E-mail log" tab shows exactly what would have been sent.
 */
export function NotificationsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['notifications'], queryFn: notificationApi.list })

  const markRead = useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map(notificationApi.markRead)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const inApp = data.filter((n) => n.channel === 'IN_APP')
  const unread = inApp.filter((n) => !n.read)
  const email = data.filter((n) => n.channel === 'EMAIL')
  const shown = filter === 'unread' ? unread : filter === 'email' ? email : inApp

  return (
    <div className="animate-in">
      <PageHeader
        title="Notifications"
        subtitle="Updates about the incidents you are involved in"
        actions={unread.length > 0 && (
          <Button variant="secondary" icon={<CheckCheck className="size-4" />} loading={markRead.isPending}
            onClick={() => markRead.mutate(unread.map((n) => n.id))}>Mark all as read</Button>
        )}
      />
      <Card>
        <div className="px-4">
          <Tabs<Filter> value={filter} onChange={setFilter} tabs={[
            { value: 'all', label: <><MonitorSmartphone className="size-4" /> In-app</>, count: inApp.length },
            { value: 'unread', label: 'Unread', count: unread.length },
            { value: 'email', label: <><Mail className="size-4" /> E-mail log</>, count: email.length },
          ]} />
        </div>
        {error ? <div className="p-5"><ErrorState error={error} onRetry={refetch} /></div>
          : isLoading ? <PageLoader />
            : shown.length === 0 ? <EmptyState icon={<Bell className="size-5" />} title={filter === 'unread' ? 'All caught up' : 'No notifications'} />
              : (
                <ul className="divide-y divide-line">
                  {shown.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => {
                          if (!n.read && n.channel === 'IN_APP') markRead.mutate([n.id])
                          if (n.incidentId) navigate(`/incidents/${n.incidentId}`)
                        }}
                        className={cn('flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-surface-2 cursor-pointer', !n.read && n.channel === 'IN_APP' && 'bg-brand-soft/30')}
                      >
                        <span className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
                          n.channel === 'EMAIL' ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/50' : 'bg-brand-soft text-brand')}>
                          {n.channel === 'EMAIL' ? <Mail className="size-4" /> : <Bell className="size-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-medium text-fg">{n.subject}</span>
                            {!n.read && n.channel === 'IN_APP' && <span className="size-2 rounded-full bg-brand" />}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted">{n.message}</span>
                        </span>
                        <span className="shrink-0 text-right text-xs text-faint" title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
      </Card>
    </div>
  )
}
