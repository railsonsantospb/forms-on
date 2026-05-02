import { Landmark, Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer
      className="mt-12 border-t border-[var(--color-border)] bg-[var(--color-surface)]/60"
      role="contentinfo"
    >
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 py-6">
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
