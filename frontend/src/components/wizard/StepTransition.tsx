import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

interface StepTransitionProps {
  children: ReactNode
  step: number
  direction: 'forward' | 'backward'
}

export function StepTransition({ children, step, direction }: StepTransitionProps) {
  return (
    <div
      key={step}
      className={cn(
        'animate-in fade-in duration-300',
        direction === 'forward' ? 'slide-in-from-right-4' : 'slide-in-from-left-4',
      )}
    >
      {children}
    </div>
  )
}
