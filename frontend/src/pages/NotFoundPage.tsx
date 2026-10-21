import { Link } from 'react-router'
import { EmptyState } from '../components/ui/misc'
import { Button } from '../components/ui/Button'

export function NotFoundPage({ forbidden = false }: { forbidden?: boolean }) {
  return (
    <EmptyState
      title={forbidden ? 'Your role cannot open this page' : 'Page not found'}
      message={forbidden ? 'Ask an administrator if you need access.' : 'Check the address and try again.'}
      action={<Link to="/"><Button variant="secondary">Back to dashboard</Button></Link>}
    />
  )
}
