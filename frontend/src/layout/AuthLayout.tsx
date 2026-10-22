import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { Logo } from '../components/ui/Logo'

/**
 * Login and register share this frame: a dark panel that says what the app does,
 * with one real incident from the demo data drawn as a ticket, and the form on the right.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="relative overflow-hidden bg-side px-6 py-6 text-side-fg lg:flex lg:w-[44%] lg:max-w-xl lg:flex-col lg:px-12 lg:py-10">
        <Logo tone="inverse" />
        <div className="hidden lg:mt-16 lg:block">
          <h2 className="max-w-sm text-[28px] font-semibold leading-tight tracking-tight text-white">
            Something broke? Tell us once, and follow it until it's fixed.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-side-muted">
            Each report gets a priority, a deadline and a technician with the right skills.
            You can see every step it goes through, and nothing is closed until you say the fix works.
          </p>
          <SampleTicket />
        </div>
        <p className="mt-auto hidden pt-10 text-xs text-side-muted lg:block">CS F213 Object-Oriented Programming, course project</p>
      </aside>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:py-12 lg:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}

// INC0001 from the demo data, as it really went.
const trail = [
  'Reported by Rohan Mehta',
  'Category Network, priority P3',
  'Assigned to Ananya Rao',
  'Resolved: VPN client updated to 5.2',
  'Fix confirmed by Rohan, closed',
]

function SampleTicket() {
  return (
    <div className="relative mt-10 max-w-sm -rotate-1 rounded-lg bg-side-2 p-5 shadow-pop ring-1 ring-side-line">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs text-side-muted">INC0001</span>
        <span className="rounded-[3px] bg-amber-300 px-1 font-mono text-[11px] font-semibold leading-4 text-amber-950">P3</span>
      </div>
      <p className="mt-1 font-medium text-white">VPN keeps disconnecting</p>
      {/* tear line with a notch at each end, like a ticket stub (same shape as the logo) */}
      <div className="relative my-4 border-t border-dashed border-side-line">
        <span className="absolute -left-7 -top-2 size-4 rounded-full bg-side" />
        <span className="absolute -right-7 -top-2 size-4 rounded-full bg-side" />
      </div>
      <ol className="space-y-2">
        {trail.map((step) => (
          <li key={step} className="flex items-center gap-2.5 text-[13px] text-side-fg">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#1f7a83]">
              <Check className="size-2.5 text-white" strokeWidth={3.5} />
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  )
}
