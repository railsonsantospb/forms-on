import type { ReactNode } from 'react'

interface ReviewGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3
}

export function ReviewGrid({ children, columns = 2 }: ReviewGridProps) {
  const cols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
  }

  return (
    <div className={`grid ${cols[columns]} gap-x-5 gap-y-2`}>
      {children}
    </div>
  )
}
