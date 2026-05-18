import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Footer from '../../components/Footer'

describe('Footer', () => {
  it('renders copyright with current year', () => {
    render(<Footer />)
    const year = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
  })

  it('renders Eventra brand name', () => {
    render(<Footer />)
    expect(screen.getByText(/Eventra/)).toBeInTheDocument()
  })

  it('renders university name', () => {
    render(<Footer />)
    expect(screen.getByText(/Stefan cel Mare University of Suceava/)).toBeInTheDocument()
  })

  it('renders as a footer element', () => {
    const { container } = render(<Footer />)
    expect(container.querySelector('footer')).toBeInTheDocument()
  })
})
