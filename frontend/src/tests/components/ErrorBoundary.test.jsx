import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '../../components/ErrorBoundary'

// Suppress console.error from ErrorBoundary.componentDidCatch
vi.spyOn(console, 'error').mockImplementation(() => {})

function ThrowingComponent({ shouldThrow }) {
  if (shouldThrow) throw new Error('Test error')
  return <div>Working content</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Working content')).toBeInTheDocument()
  })

  it('shows error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument()
  })

  it('shows Try Again button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('renders Try Again button that is clickable', async () => {
    const user = userEvent.setup()
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    const button = screen.getByText('Try Again')
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
    // Clicking resets internal state (hasError → false)
    await user.click(button)
  })
})
