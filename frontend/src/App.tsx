import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/features/theme/provider'
import { Topbar } from '@/components/layout/Topbar'
import { Footer } from '@/components/layout/Footer'
import { HomePage } from '@/pages/HomePage'
import { Anexo1Page } from '@/pages/Anexo1Page'
import { Anexo2Page } from '@/pages/Anexo2Page'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <ThemeProvider>
      <div className="flex flex-col min-h-full">
        {/* Skip to content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-accent)] focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Pular para o conteúdo principal
        </a>

        <Topbar />
        <main id="main-content" className="flex-1 w-full max-w-[1040px] mx-auto px-4 sm:px-6 py-6" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/anexo1" element={<Anexo1Page />} />
            <Route path="/anexo2" element={<Anexo2Page />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  )
}
