import { Badge } from '@/components/ui/badge'

interface ReviewBadgeProps {
  label: string
  variant?: 'success' | 'warning' | 'danger'
}

export function ReviewBadge({ label, variant = 'success' }: ReviewBadgeProps) {
  return <Badge variant={variant}>{label}</Badge>
}
