import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <img
        src="/brasao.png"
        alt="Brasão UFPB"
        className="w-28 h-28 mb-4 object-contain drop-shadow-lg"
      />
      
      <h1 className="text-6xl font-bold text-[var(--color-accent)] mb-2 tracking-tight">
        404
      </h1>
      
      <h2 className="text-xl font-semibold text-[var(--color-text)] mb-3">
        Página não encontrada
      </h2>
      
      <p className="text-[var(--color-muted)] max-w-md mb-8 leading-relaxed">
        O link que você tentou acessar não existe ou foi movido. 
        Verifique o endereço digitado ou volte para a página inicial.
      </p>
      
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="primary" onClick={() => navigate('/')}>
          <Home size={18} />
          Voltar ao início
        </Button>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Voltar atrás
        </Button>
      </div>
      
      <div className="mt-12 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 max-w-sm">
        <p className="text-xs text-[var(--color-subtle)]">
          Se você acredita que isso é um erro, entre em contato com o suporte da UFPB.
        </p>
      </div>
    </div>
  )
}
