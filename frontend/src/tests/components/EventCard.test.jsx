import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import EventCard from '../../components/EventCard'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const baseProps = {
  id: 1,
  title: 'AI Workshop',
  start_datetime: '2026-05-10T14:00:00',
  location: 'Room A101',
  category: 'academic',
  participation_mode: 'physical',
  capacity: 50,
  registered_count: 10,
}

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <EventCard {...baseProps} {...props} />
    </MemoryRouter>
  )
}

describe('EventCard', () => {
  beforeEach(() => mockNavigate.mockClear())

  it('renders title, location, and category', () => {
    renderCard()
    expect(screen.getByText('AI Workshop')).toBeInTheDocument()
    expect(screen.getByText('Room A101')).toBeInTheDocument()
    expect(screen.getByText('academic')).toBeInTheDocument()
  })

  it('renders participation mode badge', () => {
    renderCard()
    expect(screen.getByText('physical')).toBeInTheDocument()
  })

  it('shows spots remaining when capacity is set', () => {
    renderCard()
    expect(screen.getByText('40 / 50 spots')).toBeInTheDocument()
  })

  it('shows Full when no spots remaining', () => {
    renderCard({ registered_count: 50 })
    expect(screen.getByText('Full')).toBeInTheDocument()
  })

  it('navigates to event detail on click', async () => {
    renderCard()
    const user = userEvent.setup()
    await user.click(screen.getByText('AI Workshop'))
    expect(mockNavigate).toHaveBeenCalledWith('/events/1')
  })

  it('renders without capacity section when capacity is null', () => {
    renderCard({ capacity: null })
    expect(screen.queryByText(/spots/)).not.toBeInTheDocument()
  })

  it('formats date correctly', () => {
    renderCard()
    // Should show formatted date with day and time
    const dateEl = screen.getByText(/May/)
    expect(dateEl).toBeInTheDocument()
  })

  it('renders without location when not provided', () => {
    renderCard({ location: null })
    expect(screen.queryByText('Room A101')).not.toBeInTheDocument()
  })

  it('renders without badges when category/mode not set', () => {
    renderCard({ category: null, participation_mode: null })
    expect(screen.queryByText('academic')).not.toBeInTheDocument()
    expect(screen.queryByText('physical')).not.toBeInTheDocument()
  })
})
