import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Sun,
  Moon,
  ZoomOut,
  ZoomIn,
  Home,
  Accessibility,
  X,
  RotateCcw,
  Type,
  AlignVerticalSpaceAround,
  MonitorStop,
  CircleDot,
  Contrast,
} from 'lucide-react'
import { useThemeStore } from '@/features/theme/store'

export function Topbar() {
  const store = useThemeStore()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [panelOpen, setPanelOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close on click outside or Escape
  useEffect(() => {
    if (!panelOpen) return
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPanelOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [panelOpen])

  const anyActive =
    store.highContrast ||
    store.grayscale ||
    store.lineSpacing !== 'normal' ||
    store.letterSpacing !== 'normal' ||
    store.reducedMotion ||
    store.enhancedFocus

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--color-surface)]/80 border-b border-[var(--color-border)]">
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Branding */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/brasao.png" alt="UFPB" className="w-10 h-10 object-contain" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">UFPB Forms On</span>
            <span className="text-[11px] text-[var(--color-subtle)] leading-tight">Diárias & Passagens</span>
          </div>
        </Link>

        {/* Center nav */}
        {!isHome && (
          <nav className="hidden sm:flex items-center gap-1">
            <TopbarLink to="/" icon={<Home size={14} />} label="Início" />
            <TopbarLink to="/anexo1" label="Anexo I" />
            <TopbarLink to="/anexo2" label="Anexo II" />
          </nav>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Zoom */}
          <button
            onClick={store.decreaseFont}
            className="p-2 rounded-lg hover:bg-[var(--color-btn-hover)] text-[var(--color-muted)] transition-colors"
            title="Diminuir fonte"
            aria-label="Diminuir fonte"
          >
            <ZoomOut size={20} />
          </button>
          <span
            className="text-[11px] font-semibold text-[var(--color-subtle)] min-w-[36px] text-center select-none"
            aria-label={`Zoom atual: ${Math.round(store.fontScale * 100)}%`}
          >
            {Math.round(store.fontScale * 100)}%
          </span>
          <button
            onClick={store.increaseFont}
            className="p-2 rounded-lg hover:bg-[var(--color-btn-hover)] text-[var(--color-muted)] transition-colors"
            title="Aumentar fonte"
            aria-label="Aumentar fonte"
          >
            <ZoomIn size={20} />
          </button>

          {/* Accessibility panel toggle */}
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setPanelOpen((v) => !v)}
              className={[
                'p-2 rounded-lg transition-colors relative',
                panelOpen || anyActive
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                  : 'hover:bg-[var(--color-btn-hover)] text-[var(--color-muted)]',
              ].join(' ')}
              title="Ferramentas de acessibilidade"
              aria-label="Ferramentas de acessibilidade"
              aria-expanded={panelOpen}
              aria-controls="accessibility-panel"
            >
              <Accessibility size={20} />
              {anyActive && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-accent)]" />
              )}
            </button>

            {/* Panel */}
            {panelOpen && (
              <div
                ref={panelRef}
                id="accessibility-panel"
                role="dialog"
                aria-label="Ferramentas de acessibilidade"
                className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] p-4 z-50"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Accessibility size={16} className="text-[var(--color-accent)]" />
                    Acessibilidade
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={store.resetAccessibility}
                      className="p-1.5 rounded-md hover:bg-[var(--color-btn-hover)] text-[var(--color-subtle)] transition-colors"
                      title="Restaurar padrão"
                      aria-label="Restaurar configurações de acessibilidade"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => setPanelOpen(false)}
                      className="p-1.5 rounded-md hover:bg-[var(--color-btn-hover)] text-[var(--color-subtle)] transition-colors"
                      title="Fechar"
                      aria-label="Fechar painel de acessibilidade"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* High Contrast */}
                  <ToggleRow
                    icon={<Contrast size={16} />}
                    label="Contraste alto"
                    description="Aumenta o contraste entre texto e fundo"
                    active={store.highContrast}
                    onClick={store.toggleHighContrast}
                  />

                  {/* Grayscale */}
                  <ToggleRow
                    icon={<MonitorStop size={16} />}
                    label="Escala de cinza"
                    description="Remove cores para facilitar leitura"
                    active={store.grayscale}
                    onClick={store.toggleGrayscale}
                  />

                  {/* Reduced Motion */}
                  <ToggleRow
                    icon={<MonitorStop size={16} />}
                    label="Reduzir animações"
                    description="Desativa transições e animações"
                    active={store.reducedMotion}
                    onClick={store.toggleReducedMotion}
                  />

                  {/* Enhanced Focus */}
                  <ToggleRow
                    icon={<CircleDot size={16} />}
                    label="Foco destacado"
                    description="Deixa o contorno de foco mais visível"
                    active={store.enhancedFocus}
                    onClick={store.toggleEnhancedFocus}
                  />

                  {/* Line Spacing */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium text-[var(--color-text)]">
                      <AlignVerticalSpaceAround size={16} className="text-[var(--color-accent)]" />
                      Espaçamento entre linhas
                    </div>
                    <SegmentedControl
                      options={[
                        { value: 'normal', label: 'Padrão' },
                        { value: 'wide', label: 'Amplo' },
                        { value: 'wider', label: 'Máximo' },
                      ]}
                      value={store.lineSpacing}
                      onChange={(v) => store.setLineSpacing(v as 'normal' | 'wide' | 'wider')}
                    />
                  </div>

                  {/* Letter Spacing */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium text-[var(--color-text)]">
                      <Type size={16} className="text-[var(--color-accent)]" />
                      Espaçamento entre letras
                    </div>
                    <SegmentedControl
                      options={[
                        { value: 'normal', label: 'Padrão' },
                        { value: 'wide', label: 'Amplo' },
                        { value: 'wider', label: 'Máximo' },
                      ]}
                      value={store.letterSpacing}
                      onChange={(v) => store.setLetterSpacing(v as 'normal' | 'wide' | 'wider')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme */}
          <button
            onClick={store.toggleTheme}
            className="p-2 rounded-lg hover:bg-[var(--color-btn-hover)] text-[var(--color-muted)] transition-colors"
            title={store.theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            aria-label={store.theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            {store.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  )
}

function TopbarLink({
  to,
  label,
  icon,
}: {
  to: string
  label: string
  icon?: React.ReactNode
}) {
  const location = useLocation()
  const active = location.pathname === to

  return (
    <Link
      to={to}
      className={[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
          : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-btn-hover)]',
      ].join(' ')}
    >
      {icon}
      {label}
    </Link>
  )
}

function ToggleRow({
  icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 p-2.5 rounded-[var(--radius-md)] border transition-all text-left',
        active
          ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10'
          : 'border-[var(--color-border)] hover:bg-[var(--color-btn-hover)]',
      ].join(' ')}
      role="switch"
      aria-checked={active}
    >
      <span className={active ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--color-text)]">{label}</div>
        <div className="text-xs text-[var(--color-subtle)]">{description}</div>
      </div>
      <span
        className={[
          'relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
          active ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
            active ? 'left-[18px]' : 'left-0.5',
          ].join(' ')}
        />
      </span>
    </button>
  )
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex p-0.5 rounded-[var(--radius-md)] bg-[var(--color-btn-bg)] border border-[var(--color-border)]">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            'flex-1 px-2 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] transition-colors',
            value === opt.value
              ? 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
          ].join(' ')}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
