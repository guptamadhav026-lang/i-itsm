import { describe, expect, it, vi } from 'vitest'
import { parseBlock, readEvents } from '../live/useLiveUpdates'

describe('server-sent events parser', () => {
  it('reads a named event with JSON data', () => {
    const onEvent = vi.fn()
    parseBlock('event:incident\ndata:{"reference":"INC0001"}', onEvent)
    expect(onEvent).toHaveBeenCalledWith('incident', '{"reference":"INC0001"}')
  })

  it('ignores heartbeat comments', () => {
    const onEvent = vi.fn()
    parseBlock(':ping', onEvent)
    expect(onEvent).not.toHaveBeenCalled()
  })

  it('joins events split across network chunks', async () => {
    const encoder = new TextEncoder()
    const chunks = ['event:connected\nda', 'ta:hello\n\nevent:incident\ndata:{"a":1}\n', '\n']
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((c) => controller.enqueue(encoder.encode(c)))
        controller.close()
      },
    })
    const seen: string[] = []
    await readEvents(body, (event, data) => seen.push(`${event}=${data}`))
    expect(seen).toEqual(['connected=hello', 'incident={"a":1}'])
  })
})
