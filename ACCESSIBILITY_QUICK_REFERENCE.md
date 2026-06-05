# Referência Rápida de Acessibilidade

## 🚀 Início Rápido

### Para Usuários
1. **Painel de Acessibilidade** (canto superior direito)
   - Alto Contraste
   - Escala de Cinza
   - Redução de Animações
   - Foco Destacado
   - Espaçamento (linhas/letras)

2. **Zoom de Fonte** (canto superior direito)
   - Diminuir/Aumentar
   - Atual em %

3. **Modo Dark/Light** (canto superior direito)
   - Ícone Sol/Lua

### Para Desenvolvedores

#### Usar FormField corretamente
```tsx
// ✅ CORRETO - FormField faz tudo automaticamente
<FormField label="Email" required error={emailError}>
  <Input type="email" />
</FormField>

// ❌ ERRADO - Input sem FormField
<Input type="email" placeholder="Email" />
```

#### Criar Modal acessível
```tsx
<Modal
  open={isOpen}
  onClose={handleClose}
  title="Título"
  description="Descrição"
  isAlert={false}  // true para alertas críticos
>
  Conteúdo
</Modal>
```

#### Adicionar aria-labels em botões só com ícone
```tsx
// ✅ CORRETO
<button aria-label="Fechar">
  <X size={18} aria-hidden="true" />
</button>

// ❌ ERRADO
<button>
  <X size={18} />
</button>
```

#### Usar ARIA Live para atualizações dinâmicas
```tsx
<div aria-live="polite" aria-atomic="true">
  Mensagem atualizada dinamicamente
</div>
```

---

## 🔑 Comandos Teclado

| Ação | Tecla |
|------|-------|
| Avançar para próximo elemento | `Tab` |
| Recuar para elemento anterior | `Shift + Tab` |
| Ativar botão/link | `Enter` |
| Selecionar opção | `Seta para cima/baixo` |
| Fechar modal/painel | `Escape` |
| Enviar formulário | `Enter` |

---

## ✅ Checklist para PRs

Antes de fazer push:

```
ACESSIBILIDADE
[ ] Labels associados a inputs (via FormField)
[ ] Erros descritivos para leitores de tela
[ ] aria-labels em botões com ícones
[ ] Focus ring visível em focáveis
[ ] Modais com focus trap
[ ] ARIA live para atualizações
[ ] Ícones decorativos com aria-hidden
[ ] Testado com teclado
[ ] Contraste >= 4.5:1
[ ] Sem breaking changes
```

---

## 📚 Documentos

| Documento | Propósito |
|-----------|----------|
| `ACCESSIBILITY.md` | Guia completo |
| `ACCESSIBILITY_PLAN.md` | Plano de implementação |
| `ACCESSIBILITY_SUMMARY.md` | Resumo técnico |
| `ACCESSIBILITY_QUICK_REFERENCE.md` | Este documento |

---

## 🛠️ Componentes Acessíveis

### FormField
```tsx
<FormField 
  label="Campo" 
  required 
  error="Mensagem de erro"
>
  <Input />
</FormField>
```
Fornece automaticamente:
- ✅ Label conectada ao input
- ✅ aria-required
- ✅ aria-invalid
- ✅ aria-describedby

### Modal
```tsx
<Modal open={true} onClose={() => {}} title="Título">
  Conteúdo
</Modal>
```
Fornece automaticamente:
- ✅ Focus trap
- ✅ Return focus
- ✅ Escape key handler
- ✅ aria-modal
- ✅ aria-labelledby

### WizardStepper
```tsx
<WizardStepper 
  steps={steps} 
  currentStep={current}
  completedSteps={completed}
/>
```
Fornece automaticamente:
- ✅ Progress bar com ARIA
- ✅ aria-current="step"
- ✅ aria-labels
- ✅ Navegação por teclado

---

## 🐛 Problemas Comuns

### Problema: Input sem aria-describedby
**Solução**: Use FormField ao redor do input
```tsx
// ❌ ANTES
<label>Email</label>
<input />
<span>{error}</span>

// ✅ DEPOIS
<FormField label="Email" error={error}>
  <Input />
</FormField>
```

### Problema: Botão com só ícone não tem label
**Solução**: Adicione aria-label
```tsx
// ❌ ANTES
<button><X /></button>

// ✅ DEPOIS
<button aria-label="Fechar"><X aria-hidden="true" /></button>
```

### Problema: Modal não retorna foco
**Solução**: Use Modal component que implementa tudo
```tsx
// ✅ Modal já faz focus management
<Modal open={true} onClose={() => {}}>
  Conteúdo
</Modal>
```

### Problema: Contraste insuficiente
**Solução**: Use cores do tema CSS que atendem WCAG AA
```tsx
// ✅ CORRETO - usa variáveis CSS com bom contraste
className="text-[var(--color-text)]"

// ❌ ERRADO - cor fixa sem validação
className="text-gray-400"
```

---

## 📱 Testes Rápidos

### Teste 1: Navegação por Teclado
1. Desabilitar mouse (ou deixá-lo de lado)
2. Navegar com Tab
3. Verificar:
   - ✅ Focus ring visível
   - ✅ Ordem lógica (top-to-bottom, left-to-right)
   - ✅ Sem armadilhas de foco

### Teste 2: Leitor de Tela
1. Abrir NVDA (ou VoiceOver em Mac)
2. Navegar
3. Verificar:
   - ✅ Labels anunciados
   - ✅ Status de campos
   - ✅ Erros descritos
   - ✅ Botões identificáveis

### Teste 3: Contraste
1. Usar https://webaim.org/resources/contrastchecker/
2. Testar cada cor
3. Validar >= 4.5:1 para texto

### Teste 4: Acessibilidade Panel
1. Clicar ícone de acessibilidade (topo direito)
2. Testar:
   - ✅ Alto Contraste
   - ✅ Escala de Cinza
   - ✅ Foco Destacado
   - ✅ Espaçamento

---

## 🔗 Links Úteis

- **NVDA**: https://www.nvaccess.org/
- **WebAIM Contrast**: https://webaim.org/resources/contrastchecker/
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **eMAG**: https://www.gov.br/acessibilidade
- **MDN ARIA**: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA

---

## 💡 Dicas Profissionais

1. **Sempre teste com teclado primeiro**
   - Se funciona com teclado, provavelmente é acessível

2. **Ícones decorativos → aria-hidden="true"**
   - Apenas ícones que são apenas visuais
   - Ícones em botões não são decorativos

3. **Labels sempre conectadas**
   - Usar `<label htmlFor="id">` + `<input id="id">`
   - FormField faz isso automaticamente

4. **Contraste é obrigatório**
   - 4.5:1 para texto (WCAG AA)
   - Use o painel de acessibilidade para testar

5. **Focus ring sempre visível**
   - Nunca remova outline com `outline: none`
   - Use os estilos do tema que já têm rings

---

## 🎓 Exemplo Completo

```tsx
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useState } from 'react'

export function MyForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = () => {
    if (!email) {
      setError('Email é obrigatório')
      return
    }
    setError('')
    setIsOpen(true)
  }

  return (
    <>
      <FormField 
        label="Email" 
        required 
        error={error}
      >
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
        />
      </FormField>

      <Button onClick={handleSubmit}>
        Enviar
      </Button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Sucesso"
        description="Email enviado com sucesso"
      >
        Verifique sua caixa de entrada
      </Modal>
    </>
  )
}
```

✅ Este exemplo:
- FormField + Input: Labels associados automaticamente
- aria-required automático (porque required={true})
- aria-invalid e aria-describedby automáticos (porque error)
- Botão acessível por Enter
- Modal com focus trap e return focus
- Tudo testável com teclado

---

## 📞 FAQ Rápido

**P: Como faço um botão com só ícone acessível?**
A: Adicione aria-label
```tsx
<button aria-label="Fechar"><X aria-hidden="true" /></button>
```

**P: Como faço um campo obrigatório?**
A: Use FormField com required
```tsx
<FormField label="Nome" required><Input /></FormField>
```

**P: Como faço um modal ser acessível?**
A: Use Modal component do projeto
```tsx
<Modal open={true} onClose={() => {}} title="Título">Conteúdo</Modal>
```

**P: Como testo acessibilidade?**
A: Teste com teclado e baixe NVDA
- Tab/Shift+Tab para navegar
- Enter para ativar
- Escape para fechar

**P: Qual é o contraste mínimo?**
A: 4.5:1 para texto (WCAG AA)
- Use https://webaim.org/resources/contrastchecker/

---

**Última atualização**: 2026-06-04  
**Status**: ✅ Pronto para Produção
