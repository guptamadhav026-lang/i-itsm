import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LifecycleStepper } from '../components/incident/LifecycleStepper'
import { PriorityBadge, StatusBadge } from '../components/incident/badges'

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
