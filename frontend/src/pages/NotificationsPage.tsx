import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '../api/endpoints'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState, ErrorState, PageHeader, PageLoader, Tabs } from '../components/ui/misc'
import { cn } from '../lib/cn'
import { dayLabel, formatDateTime, formatTime, timeAgo } from '../lib/format'
import type { Notification } from '../api/types'

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
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Updates about the incidents you are involved in"
        actions={unread.length > 0 && (
          <Button variant="secondary" loading={markRead.isPending}
            onClick={() => markRead.mutate(unread.map((n) => n.id))}>Mark all as read</Button>
        )}
      />
      <Card>
        <div className="px-4">
          <Tabs<Filter> value={filter} onChange={setFilter} tabs={[
            { value: 'all', label: 'In-app', count: inApp.length },
            { value: 'unread', label: 'Unread', count: unread.length },
            { value: 'email', label: 'E-mail log', count: email.length },
          ]} />
        </div>
        {error ? <div className="p-5"><ErrorState error={error} onRetry={refetch} /></div>
          : isLoading ? <PageLoader />
            : shown.length === 0 ? <EmptyState title={filter === 'unread' ? 'No unread notifications' : 'No notifications'} />
              : (
                <div>
                  {groupByDay(shown).map(([day, items]) => (
                    <section key={day}>
                      <h2 className="sticky top-0 border-y border-line bg-surface-2 px-4 py-1.5 text-xs font-medium text-muted first:border-t-0">{day}</h2>
                      <ul className="divide-y divide-line">
                        {items.map((n) => {
                          const isNew = !n.read && n.channel === 'IN_APP'
                          return (
                            <li key={n.id}>
                              <button
                                onClick={() => {
                                  if (isNew) markRead.mutate([n.id])
                                  if (n.incidentId) navigate(`/incidents/${n.incidentId}`)
                                }}
                                className={cn('relative flex w-full items-start gap-4 px-4 py-3 text-left hover:bg-surface-2 cursor-pointer', isNew && 'bg-brand-soft/40')}
                              >
                                {isNew && <span className="absolute inset-y-0 left-0 w-0.5 bg-brand" />}
                                <span className="min-w-0 flex-1">
                                  <span className={cn('block text-sm text-fg', isNew ? 'font-semibold' : 'font-medium')}>{n.subject}</span>
                                  <span className="mt-0.5 block text-sm text-muted">{n.message}</span>
                                </span>
                                <span className="tabular shrink-0 text-right text-xs text-faint" title={formatDateTime(n.createdAt)}>
                                  {day === 'Today' ? timeAgo(n.createdAt) : formatTime(n.createdAt)}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
      </Card>
    </div>
  )
}

/** Newest first, split into "Today", "Yesterday" and older dates. */
function groupByDay(items: Notification[]): [string, Notification[]][] {
  const groups = new Map<string, Notification[]>()
  for (const n of items) {
    const day = dayLabel(n.createdAt)
    groups.set(day, [...(groups.get(day) ?? []), n])
  }
  return [...groups.entries()]
}
