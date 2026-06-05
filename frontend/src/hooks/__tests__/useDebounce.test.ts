import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useDebounce } from '../useDebounce'

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500))
    expect(result.current).toBe('hello')
  })

  it('delays value update', async () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } },
    )
    expect(result.current).toBe('hello')
    rerender({ value: 'world', delay: 500 })
    expect(result.current).toBe('hello')
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current).toBe('world')
    vi.useRealTimers()
  })

  it('cancels previous timer on new value', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 500 } },
    )
    rerender({ value: 'b', delay: 500 })
    act(() => { vi.advanceTimersByTime(300) })
    rerender({ value: 'c', delay: 500 })
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current).toBe('c')
    vi.useRealTimers()
  })
})
