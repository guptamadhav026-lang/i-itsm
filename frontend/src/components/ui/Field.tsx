import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const control =
  'w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-faint shadow-xs ' +
  'transition-colors focus:outline-none focus:border-ring focus:ring-3 focus:ring-ring/20 ' +
  'disabled:opacity-60 aria-invalid:border-red-500 aria-invalid:ring-red-500/20'

interface FieldProps {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}

/** A label + control + hint/error, laid out consistently. */
export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => <input ref={ref} className={cn(control, 'h-10', className)} {...rest} />,
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => <textarea ref={ref} className={cn(control, 'py-2 min-h-24 resize-y', className)} {...rest} />,
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select ref={ref} className={cn(control, 'h-10 pr-8 cursor-pointer', className)} {...rest}>
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

interface SegmentedProps<T extends string> {
  value: T
  options: { value: T; label: ReactNode; tone?: string }[]
  onChange: (value: T) => void
  name: string
}

/** A row of buttons where exactly one is selected (used for impact/urgency). */
export function Segmented<T extends string>({ value, options, onChange, name }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-flow-col auto-cols-fr gap-1 rounded-lg bg-surface-2 p-1 border border-line">
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-8 rounded-md text-xs font-medium transition-all cursor-pointer',
              selected ? cn('bg-surface text-fg shadow-sm ring-1 ring-line', o.tone) : 'text-muted hover:text-fg',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ checked, onChange, label, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50',
        checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700',
      )}
    >
      <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
    </button>
  )
}
