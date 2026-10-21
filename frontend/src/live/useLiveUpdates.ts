import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getToken } from '../api/client'
import type { LiveUpdate } from '../api/types'

export type LiveStatus = 'connecting' | 'live' | 'offline'

/**
 * Opens the Server-Sent Events stream (GET /api/live) and keeps it open.
 * Each time the backend reports a change, the affected data is marked stale and React Query
 * re-loads it, so every open screen updates by itself. Reconnects automatically if the connection drops.
 */
export function useLiveUpdates(enabled: boolean, onUpdate?: (u: LiveUpdate) => void): LiveStatus {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<LiveStatus>('connecting')

  useEffect(() => {
    if (!enabled) return
    let stopped = false
    let controller: AbortController | null = null
    let retryDelay = 1000

    const handle = (update: LiveUpdate) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['incident', update.incidentId] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['audit'] })
      onUpdate?.(update)
    }

    const connect = async () => {
      controller = new AbortController()
      setStatus('connecting')
      try {
        const response = await fetch('/api/live', {
          headers: { Authorization: `Bearer ${getToken()}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        })
        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
        setStatus('live')
        retryDelay = 1000
        await readEvents(response.body, (event, data) => {
          if (event === 'incident') handle(JSON.parse(data) as LiveUpdate)
        })
      } catch {
        /* connection failed or closed: fall through to retry */
      }
      if (!stopped) {
        setStatus('offline')
        setTimeout(connect, retryDelay)
        retryDelay = Math.min(retryDelay * 2, 30_000)
      }
    }

    connect()
    return () => {
      stopped = true
      controller?.abort()
    }
    // onUpdate is intentionally not a dependency: reconnecting on every render would be wasteful
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, queryClient])

  return status
}

/** Minimal parser for the text/event-stream format: blocks of "event: x" / "data: y" separated by a blank line. */
export async function readEvents(body: ReadableStream<Uint8Array>, onEvent: (event: string, data: string) => void) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    let boundary
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      parseBlock(block, onEvent)
    }
  }
}

export function parseBlock(block: string, onEvent: (event: string, data: string) => void) {
  let event = 'message'
  const data: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith(':')) continue           // comment / heartbeat
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
  }
  if (data.length) onEvent(event, data.join('\n'))
}
