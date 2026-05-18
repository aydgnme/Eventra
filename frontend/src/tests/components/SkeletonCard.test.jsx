import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import SkeletonCard from '../../components/SkeletonCard'

describe('SkeletonCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonCard />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('has animate-pulse class for loading animation', () => {
    const { container } = render(<SkeletonCard />)
    expect(container.firstChild).toHaveClass('animate-pulse')
  })

  it('renders multiple placeholder bars', () => {
    const { container } = render(<SkeletonCard />)
    const bars = container.querySelectorAll('.bg-gray-200')
    expect(bars.length).toBeGreaterThanOrEqual(3)
  })
})
