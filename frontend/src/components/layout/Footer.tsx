import { Landmark, Heart, Accessibility, ShieldCheck, FileCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Seal {
  label: string
  desc: string
  Icon: LucideIcon
  href?: string
}

const seals: Seal[] = [
  {
    label: 'Acessível',
    desc: 'Recursos de acessibilidade inclusos',
    Icon: Accessibility,
  },
  {
    label: 'WCAG 2.1',
    desc: 'Conformidade Nível AA',
    Icon: ShieldCheck,
    href: 'https://www.w3.org/TR/WCAG21/',
  },
  {
    label: 'e-MAG',
    desc: 'Modelo de Acessibilidade em Governo Eletrônico',
    Icon: FileCheck,
    href: 'https://emag.governoeletronico.gov.br/',
  },
]

const badgeBase =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-[var(--color-border)] bg-[var(--color-surface)]/40 text-[var(--color-muted)] leading-none'

function AccessibilitySeals() {
  return (
    <ul
      className="flex flex-wrap items-center justify-center gap-3 pb-5 mb-5 border-b border-[var(--color-border)] list-none p-0 m-0"
      aria-label="Certificações de acessibilidade"
    >
      {seals.map(({ label, desc, Icon, href }) => (
        <li key={label}>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${badgeBase} hover:text-[var(--color-text)] hover:border-[var(--color-text)]/30 transition-colors`}
              aria-label={`${label} — ${desc}, abre em nova aba`}
              title={`${label} — ${desc}`}
            >
              <Icon size={13} aria-hidden="true" />
              {label}
            </a>
          ) : (
            <span
              className={badgeBase}
              aria-label={`${label} — ${desc}`}
              role="img"
              title={`${label} — ${desc}`}
            >
              <Icon size={13} aria-hidden="true" />
              {label}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function Footer() {
  return (
    <footer
      className="mt-12 border-t border-[var(--color-border)] bg-[var(--color-surface)]/60"
      role="contentinfo"
    >
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 py-6">
        <AccessibilitySeals />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--color-muted)]">
          {/* Left */}
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span className="font-semibold text-[var(--color-text)]">
              © {new Date().getFullYear()} UFPB — Universidade Federal da Paraíba
            </span>
            <span className="text-xs flex items-center gap-1">
              <Landmark size={12} />
              Centro de Ciências Humanas, Sociais e Agrárias — CCHSA
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <Heart size={12} className="text-[var(--color-danger)]" />
              Feito com acessibilidade
            </span>
            <span className="hidden sm:inline text-[var(--color-border)]">|</span>
            <span>Todos os direitos reservados</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
