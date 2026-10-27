import { Children, cloneElement, forwardRef, isValidElement, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const control =
  'w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-faint ' +
  'focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring ' +
  'disabled:opacity-60 aria-invalid:border-red-500 aria-invalid:ring-red-500'

interface FieldProps {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}

/**
 * A label + control + hint/error, laid out consistently. When the control is the only child and has no id,
 * it gets one, so clicking the label focuses it and screen readers read the label and the hint with it.
 */
export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  const generated = useId()
  const control = Children.count(children) === 1 && isValidElement<ControlProps>(children)
    && FORM_CONTROLS.includes(children.type) ? children : null
  const id = htmlFor ?? control?.props.id ?? (control ? generated : undefined)
  const noteId = `${generated}-note`
  const hasNote = !!(error || hint)
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {control
        ? cloneElement(control, {
            id,
            'aria-describedby': hasNote ? noteId : control.props['aria-describedby'],
            'aria-invalid': error ? true : control.props['aria-invalid'],
          })
        : children}
      {error ? <p id={noteId} className="text-xs text-red-600 dark:text-red-400">{error}</p>
        : hint ? <p id={noteId} className="text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

interface ControlProps { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false' }

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => <input ref={ref} className={cn(control, 'h-10', className)} {...rest} />,
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => <textarea ref={ref} className={cn(control, 'py-2 resize-y', className)} {...rest} />,
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

/** The controls Field links to its label (anything else, such as a row of buttons, is left as it is). */
const FORM_CONTROLS: unknown[] = ['input', 'select', 'textarea', Input, Textarea, Select]

interface SegmentedProps<T extends string> {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
  name: string
}

/** A row of buttons where exactly one is selected (used for impact/urgency). */
export function Segmented<T extends string>({ value, options, onChange, name }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-flow-col auto-cols-fr overflow-hidden rounded-md border border-line-strong divide-x divide-line-strong">
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
              'h-9 text-xs cursor-pointer',
              selected ? 'bg-brand font-medium text-brand-fg' : 'bg-surface text-muted hover:bg-surface-2 hover:text-fg',
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
        checked ? 'bg-brand' : 'bg-line-strong',
      )}
    >
      <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
    </button>
  )
}
