import React from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] p-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center">
                <span className="text-[var(--color-danger)] text-lg font-bold">!</span>
              </div>
              <h1 className="text-lg font-semibold text-[var(--color-text)]">Erro na aplicação</h1>
            </div>

            <p className="text-sm text-[var(--color-muted)] mb-4">
              Ocorreu um erro inesperado. Por favor, recarregue a página ou tente novamente.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 rounded bg-[var(--color-accent)] text-white font-medium hover:opacity-90 transition-opacity"
            >
              Recarregar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
