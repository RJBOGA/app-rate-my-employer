import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RatingInput } from '@/components/RatingInput'

describe('RatingInput', () => {
  it('renders as a radio group with five options', () => {
    render(<RatingInput label="Overall" value={null} onChange={() => {}} />)
    expect(screen.getByRole('radiogroup', { name: 'Overall' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('commits a value on click', async () => {
    const onChange = vi.fn()
    render(<RatingInput label="Pay" value={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: /4 — Good/ }))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('moves the value with arrow keys', async () => {
    const onChange = vi.fn()
    render(<RatingInput label="Pay" value={3} onChange={onChange} />)
    const selected = screen.getByRole('radio', { checked: true })
    selected.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith(4)
    await userEvent.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenLastCalledWith(2)
  })

  it('surfaces an error with role=alert', () => {
    render(<RatingInput label="Pay" value={null} onChange={() => {}} error="Select a rating" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Select a rating')
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-invalid', 'true')
  })
})
