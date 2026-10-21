import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Mail, MonitorSmartphone } from 'lucide-react'
import { notificationApi } from '../api/endpoints'
import { cn } from '../lib/cn'
import { timeAgo } from '../lib/format'
import { useToast } from '../components/ui/Toast'

/**
 * The bell in the top bar. Shows the unread count, a drop-down of recent notifications,
 * and pops up a toast when a new notification arrives (pushed live by the backend).
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: notifications = [], isSuccess } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationApi.list,
    refetchInterval: 60_000,
  })
  const inApp = notifications.filter((n) => n.channel === 'IN_APP')
  const unread = inApp.filter((n) => !n.read)

  // Pop a toast for notifications we haven't seen before (not on the first load).
  const seen = useRef<Set<number> | null>(null)
  useEffect(() => {
    if (seen.current === null) {
      if (isSuccess) seen.current = new Set(notifications.map((n) => n.id))
      return
    }
    const fresh = notifications.filter((n) => n.channel === 'IN_APP' && !n.read && !seen.current!.has(n.id))
    // One action can create several notifications at once: show them as a single toast, not a pile.
    if (fresh.length > 0) {
      const latest = fresh[0]
      const open = latest.incidentId ? () => navigate(`/incidents/${latest.incidentId}`) : undefined
      if (fresh.length === 1) toast.show('live', latest.subject, latest.message, open)
      else toast.show('live', `${fresh.length} new notifications`, latest.subject, open)
    }
    notifications.forEach((n) => seen.current!.add(n.id))
  }, [notifications, isSuccess, toast, navigate])

  const markRead = useMutation({
    mutationFn: notificationApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications (${unread.length} unread)`}
        className="relative rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg cursor-pointer"
      >
        <Bell className="size-5" />
        {unread.length > 0 && (
          <span className="tabular absolute -right-0.5 -top-0.5 flex min-w-4.5 h-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-surface">
            {unread.length > 99 ? '99+' : unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="animate-in absolute right-0 z-40 mt-2 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            <span className="text-xs text-muted">{unread.length} unread</span>
          </div>
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {inApp.slice(0, 8).map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    if (!n.read) markRead.mutate(n.id)
                    setOpen(false)
                    if (n.incidentId) navigate(`/incidents/${n.incidentId}`)
                  }}
                  className={cn('flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-2 cursor-pointer', !n.read && 'bg-brand-soft/40')}
                >
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand')} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-fg">{n.subject}</span>
                    <span className="mt-0.5 block text-xs text-muted line-clamp-2">{n.message}</span>
                    <span className="mt-1 block text-[11px] text-faint">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
            {inApp.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Nothing yet</li>}
          </ul>
          <button
            onClick={() => { setOpen(false); navigate('/notifications') }}
            className="flex w-full items-center justify-center gap-2 border-t border-line px-4 py-2.5 text-sm font-medium text-brand hover:bg-surface-2 cursor-pointer"
          >
            <MonitorSmartphone className="size-4" /> All notifications <Mail className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
