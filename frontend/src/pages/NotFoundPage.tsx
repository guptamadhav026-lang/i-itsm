import { Link } from 'react-router'
import { Button } from '../components/ui/Button'

export function NotFoundPage({ forbidden = false }: { forbidden?: boolean }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-mono text-5xl font-semibold text-line-strong">{forbidden ? '403' : '404'}</p>
      <h1 className="mt-4 text-lg font-semibold text-fg">{forbidden ? 'Your role cannot open this page' : 'There is nothing at this address'}</h1>
      <p className="mt-1 text-sm text-muted">
        {forbidden ? 'Ask an administrator if you think you need access.' : 'The link may be old, or there is a typo in it.'}
      </p>
      <Link to="/" className="mt-6 inline-block"><Button variant="secondary">Go to the home page</Button></Link>
    </div>
  )
}
