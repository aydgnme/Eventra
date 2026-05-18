import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '../../hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello'))
    expect(result.current).toBe('hello')
  })

  it('does not update value before delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    )

    rerender({ value: 'world' })
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('hello')
  })

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    )

    rerender({ value: 'world' })
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('world')
  })

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    )

    rerender({ value: 'ab' })
    act(() => vi.advanceTimersByTime(200))

    rerender({ value: 'abc' })
    act(() => vi.advanceTimersByTime(200))

    // Should still be 'a' because timer kept resetting
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(100))
    // Now 300ms since last change, should be 'abc'
    expect(result.current).toBe('abc')
  })

  it('uses default 300ms delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'start' } }
    )

    rerender({ value: 'end' })
    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('start')

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('end')
  })

  it('accepts custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'start' } }
    )

    rerender({ value: 'end' })
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('start')

    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('end')
  })
})
