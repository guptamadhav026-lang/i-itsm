import { Link } from 'react-router'
import { Compass, ShieldOff } from 'lucide-react'
import { EmptyState } from '../components/ui/misc'
import { Button } from '../components/ui/Button'

export function NotFoundPage({ forbidden = false }: { forbidden?: boolean }) {
  return (
    <EmptyState
      icon={forbidden ? <ShieldOff className="size-5" /> : <Compass className="size-5" />}
      title={forbidden ? 'This page is not available for your role' : 'Page not found'}
      message={forbidden ? 'Ask an administrator if you think you need access.' : 'The address may be mistyped.'}
      action={<Link to="/"><Button variant="secondary">Back to dashboard</Button></Link>}
    />
  )
}
