import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Field'

export function Stars({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="inline-flex gap-0.5" onMouseLeave={() => setHover(0)} role={onChange ? 'radiogroup' : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => onChange && setHover(n)}
          onClick={() => onChange?.(n)}
          className={cn('disabled:cursor-default', onChange && 'cursor-pointer')}
        >
          <Star className={cn(size === 'sm' ? 'size-4' : 'size-6', n <= shown ? 'fill-amber-400 text-amber-400' : 'text-line-strong')} />
        </button>
      ))}
    </div>
  )
}

export function FeedbackForm({ onSubmit, loading }: { onSubmit: (rating: number, comment: string) => void; loading: boolean }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  return (
    <div className="space-y-3">
      <Stars value={rating} onChange={setRating} />
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Anything to add? (optional)" rows={2} className="min-h-0" />
      <Button size="sm" disabled={rating === 0} loading={loading} onClick={() => onSubmit(rating, comment)}>Send feedback</Button>
    </div>
  )
}
