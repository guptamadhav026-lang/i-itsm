import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LifecycleStepper } from '../components/incident/LifecycleStepper'
import { PriorityBadge, StatusBadge } from '../components/incident/badges'
import { Stars } from '../components/incident/Feedback'
import { Field, Input } from '../components/ui/Field'

describe('incident components', () => {
  it('shows all eight lifecycle stages', () => {
    render(<LifecycleStepper status="IN_PROGRESS" />)
    for (const label of ['New', 'Classified', 'Assigned', 'Acknowledged', 'In progress', 'Resolved', 'Verified', 'Closed']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('labels status and priority in words, not colour alone', () => {
    render(<><StatusBadge status="ACKNOWLEDGED" /><PriorityBadge priority="P1" /></>)
    expect(screen.getByText('Acknowledged')).toBeInTheDocument()
    expect(screen.getByText(/P1/)).toBeInTheDocument()
    expect(screen.getByText(/Critical/)).toBeInTheDocument()
  })
})

describe('form and feedback components', () => {
  it('links a field label to its input, so clicking the label focuses it', () => {
    render(<Field label="Title" hint="A short summary"><Input /></Field>)
    const input = screen.getByLabelText('Title')
    expect(input.tagName).toBe('INPUT')
    expect(input).toHaveAccessibleDescription('A short summary')
  })

  it('marks a field with an error as invalid', () => {
    render(<Field label="Email" error="Not a valid e-mail"><Input /></Field>)
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('reads a given rating as one picture, not five disabled buttons', () => {
    render(<Stars value={4} size="sm" />)
    expect(screen.getByRole('img', { name: '4 out of 5 stars' })).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('lets the reporter pick a rating', async () => {
    let picked = 0
    render(<Stars value={0} onChange={(v) => { picked = v }} />)
    await userEvent.click(screen.getByRole('radio', { name: '3 stars' }))
    expect(picked).toBe(3)
  })
})
