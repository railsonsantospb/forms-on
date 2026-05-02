interface TimelineItem {
  content: string
  meta?: string
}

interface ReviewTimelineProps {
  items: TimelineItem[]
}

export function ReviewTimeline({ items }: ReviewTimelineProps) {
  return (
    <div className="relative pl-6">
      {/* Line */}
      <div
        className="absolute left-[9px] top-1.5 bottom-1 w-[2px] rounded-full"
        style={{
          background: 'linear-gradient(180deg, var(--color-accent), rgba(79,140,255,0.25))',
        }}
      />
      {items.map((item, i) => (
        <div key={i} className="relative py-1 pl-3">
          {/* Dot */}
          <div
            className="absolute left-0 top-[11px] w-[10px] h-[10px] rounded-full bg-[var(--color-accent)]"
            style={{ boxShadow: '0 0 0 3px rgba(79,140,255,0.18)' }}
          />
          <div className="text-base font-medium text-[var(--color-text)]">{item.content}</div>
          {item.meta && (
            <div className="text-sm text-[var(--color-subtle)] mt-0.5">{item.meta}</div>
          )}
        </div>
      ))}
    </div>
  )
}
