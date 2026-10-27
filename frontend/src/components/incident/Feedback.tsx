import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Field'

export function Stars({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' }) {
  const [hover, setHover] = useState(0)
  const starClass = (n: number, shown: number) =>
    cn(size === 'sm' ? 'size-4' : 'size-6', n <= shown ? 'fill-amber-400 text-amber-400' : 'text-line-strong')

  // a rating that was already given is a picture with a text alternative, not five disabled buttons
  if (!onChange) {
    return (
      <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => <Star key={n} aria-hidden className={starClass(n, value)} />)}
      </span>
    )
  }
  return (
    <div className="inline-flex gap-0.5" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="cursor-pointer"
        >
          <Star className={starClass(n, hover || value)} />
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
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Anything to add? (optional)"
        rows={2} maxLength={1000} aria-label="Comment" />
      <Button size="sm" disabled={rating === 0} loading={loading} onClick={() => onSubmit(rating, comment.trim())}>Send feedback</Button>
    </div>
  )
}
