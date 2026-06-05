# Guia de Melhorias e Correções — UFPB Forms On

**Data**: 2026-06-04  
**Baseado em**: Análise completa de design, arquitetura, engenharia, acessibilidade, lógica de negócio, formulários e chat  
**Situação atual**: 8.5/10 — Sistema sólido, pronto para produção, com oportunidades claras de evolução

---

## Como usar este documento

Cada item tem:
- **O problema** — o que está errado ou pode melhorar
- **Por que importa** — impacto real se não for resolvido
- **Como corrigir** — orientação técnica objetiva
- **Esforço estimado** — tempo aproximado para um desenvolvedor experiente

Os itens estão ordenados por prioridade: **🔴 Crítico → 🟠 Importante → 🟡 Melhoria**.

---

## 🔴 Correções Críticas

### 1. `Anexo1Wizard.tsx` tem 1139 linhas — componente God Object

**O problema**  
Todo o wizard do Anexo I vive em um único arquivo: os 9 passos, a lógica de validação, o chat, a revisão e a geração do documento. Qualquer mudança em qualquer passo exige navegar por centenas de linhas sem relação com a alteração.

**Por que importa**  
- Aumenta o risco de regressões: modificar o Passo 2 pode quebrar o Passo 8 sem que o desenvolvedor perceba
- Dificulta revisão de código (code review)
- Torna impossível testar passos em isolamento

**Como corrigir**  
Criar um arquivo por passo dentro de `features/anexo1/components/steps/`:

```
steps/
  Step1Tipo.tsx
  Step2Servidor.tsx
  Step3Ida.tsx
  Step4Retorno.tsx
  Step5Missao.tsx
  Step6Motivo.tsx
  Step7Recurso.tsx
  Step8Justificativas.tsx
  Step9Revisao.tsx
```

O `Anexo1Wizard.tsx` passa a ser apenas o orquestrador que renderiza o step ativo:

```tsx
// Anexo1Wizard.tsx — após refatoração (~80 linhas)
const stepComponents = [
  Step1Tipo, Step2Servidor, Step3Ida, Step4Retorno,
  Step5Missao, Step6Motivo, Step7Recurso, Step8Justificativas, Step9Revisao,
]

const StepComponent = stepComponents[currentStep - 1]
return <StepComponent store={store} errors={stepErrors} />
```

**Esforço estimado**: 4–6 horas

---

### 2. Sem testes de frontend (zero cobertura)

**O problema**  
Todo o código React — wizard, chat engine, validações Zod, hooks — não tem nenhum teste automatizado. Apenas o backend Python tem testes (1171 linhas cobrindo a API e os serviços).

**Por que importa**  
- Regressões em fluxos críticos (geração do documento, validação de trechos) são detectadas só em produção
- Refatorações ficam arriscadas sem rede de segurança
- O chat engine tem lógica complexa (skipIf, autoValue, updateFieldValue) que se beneficia muito de testes unitários

**Como corrigir**  
Instalar Vitest + Testing Library e criar testes em três camadas:

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event jsdom
```

```
# Estrutura sugerida
src/features/chat/lib/__tests__/useChatEngine.test.ts   # motor de estados
src/features/anexo1/schemas/__tests__/anexo1.schema.test.ts  # validações Zod
src/components/ui/__tests__/Button.test.tsx              # componentes UI
src/hooks/__tests__/useAutoSave.test.ts                  # hooks
```

Casos mínimos para o chat engine:
- Fluxo feliz: resposta válida avança para o próximo estado
- Validação falha: erro exibido, estado não muda
- `skipIf`: estado pulado corretamente
- `updateFieldValue`: valor editado sem refazer o fluxo

**Esforço estimado**: 8–12 horas para cobertura inicial útil

---

### 3. Sem CI/CD — testes não rodam em PRs

**O problema**  
A pasta `.github/` existe mas não há workflows configurados. Os testes Python e o build do frontend nunca são executados automaticamente.

**Por que importa**  
- Um PR com erro de compilação TypeScript pode ser mergeado sem que ninguém perceba
- Os 1171 linhas de testes Python nunca protegem o branch principal automaticamente

**Como corrigir**  
Criar `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v --tb=short

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22" }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
      # Adicionar quando testes forem criados:
      # - run: cd frontend && npm test
```

**Esforço estimado**: 1–2 horas

---

### 4. `relacao_pertinencia` inconsistente entre schema e chatFlow

**O problema**  
O schema Zod declara `relacao_pertinencia` como `z.string().max(2000).optional()`, permitindo vazio. O chatFlow exige mínimo de 10 caracteres. As duas fontes de verdade discordam.

**Por que importa**  
- O backend valida usando o schema JSON gerado a partir do Zod; com `optional()`, um payload sem `relacao_pertinencia` passa na validação do backend mesmo que o chat exija a resposta
- Cria uma inconsistência invisível: usuário via chat é obrigado a preencher, mas via importação de documento o campo pode chegar vazio

**Como corrigir**  
Em `frontend/src/features/anexo1/schemas/anexo1.schema.ts`, linha 53:

```typescript
// ANTES
relacao_pertinencia: z.string().max(2000, 'Máximo 2000 caracteres').optional(),

// DEPOIS
relacao_pertinencia: z.string()
  .min(10, 'Mínimo 10 caracteres')
  .max(2000, 'Máximo 2000 caracteres'),
```

**Esforço estimado**: 15 minutos + testar formulário

---

## 🟠 Melhorias Importantes

### 5. Geração de PDF bloqueia o servidor (operação síncrona)

**O problema**  
Ao gerar um PDF, o endpoint `/api/anexo1/generate?format=pdf` chama `convert_docx_to_pdf()`, que executa o LibreOffice por um subprocesso. Isso pode levar 5–15 segundos e mantém o worker uvicorn ocupado durante todo esse tempo.

**Por que importa**  
- Com dois usuários gerando PDF simultaneamente, um espera o outro terminar
- O timeout do cliente pode disparar antes da conversão terminar

**Como corrigir**  
Usar `asyncio.to_thread` para não bloquear o event loop:

```python
# app/services/pdf_convert.py
import asyncio

async def convert_docx_to_pdf_async(docx_path: Path) -> Path:
    return await asyncio.to_thread(convert_docx_to_pdf, docx_path)
```

```python
# app/main.py — no endpoint generate
if format == "pdf":
    out_pdf = await convert_docx_to_pdf_async(out_docx)
```

Para operações com muita carga, a evolução seria retornar um `job_id` e o frontend fazer polling em `/api/jobs/{job_id}`.

**Esforço estimado**: 2–3 horas

---

### 6. `aria-pressed` hardcoded no botão de tema

**O problema**  
Em `Topbar.tsx`, o botão que alterna entre modo dark/light tem `aria-pressed={false}` fixo, independente do tema atual.

**Por que importa**  
Leitores de tela (NVDA, VoiceOver) anunciam sempre "não pressionado" para esse botão, mesmo quando o modo escuro está ativo. É um bug de acessibilidade que afeta diretamente usuários com deficiência visual.

**Como corrigir**  
Em `frontend/src/components/layout/Topbar.tsx`, linha 245:

```tsx
// ANTES
aria-pressed={false}

// DEPOIS
aria-pressed={store.theme === 'dark'}
```

**Esforço estimado**: 5 minutos

---

### 7. Falta validar `vinculo_outro_especificar` quando tipo é `outro`

**O problema**  
Quando o usuário seleciona `tipo_vinculo: 'outro'`, o campo `vinculo_outro_especificar` deveria ser obrigatório. O schema define o campo como `optional()` sem nenhuma regra condicional.

**Por que importa**  
O documento gerado pode sair com o campo de vínculo em branco, o que pode causar recusa administrativa.

**Como corrigir**  
Adicionar no `.superRefine()` em `anexo1.schema.ts`, após a validação de `lotacao_orgao`:

```typescript
// Vínculo "outro" precisa de especificação
if (data.servidor.tipo_vinculo === 'outro' &&
    (!data.servidor.vinculo_outro_especificar ||
     data.servidor.vinculo_outro_especificar.trim().length < 3)) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'Especifique o tipo de vínculo',
    path: ['servidor', 'vinculo_outro_especificar'],
  })
}
```

E expor o campo de erro no formulário em `Anexo1Wizard.tsx` (Step 2, seção de vínculo).

**Esforço estimado**: 30 minutos

---

### 8. Persistência do estado do chat ao reabrir o modal

**O problema**  
Ao fechar e reabrir o ChatModal, o fluxo reinicia do zero. Se o usuário já havia respondido 8 de 15 perguntas, perde todo o progresso visual dentro do chat.

**Por que importa**  
O formulário mantém os dados corretamente — o problema é apenas visual: o histórico de mensagens é apagado. Para o usuário, parece que os dados foram perdidos.

**Como corrigir**  
Mover o estado do `useChatEngine` para fora do componente `ChatModal`, para o store do wizard. Assim o histórico de mensagens sobrevive ao fechar/abrir:

```typescript
// useAnexo1WizardStore.ts — adicionar
chatMessages: ChatMessage[]
chatCurrentStateId: string
chatData: Record<string, unknown>
setChatState: (state: Partial<ChatEngineState>) => void
```

O `ChatModal` passa a ler e escrever no store em vez de manter estado local.

**Esforço estimado**: 3–4 horas

---

### 9. Remover dependências instaladas mas não usadas

**O problema**  
`react-hook-form` e `@hookform/resolvers` estão no `package.json` mas não são usados em nenhum arquivo do projeto. O wizard usa estado manual com Zustand + Zod direto.

**Por que importa**  
- Aumentam o bundle desnecessariamente
- Confundem novos desenvolvedores que tentam entender a arquitetura de formulários

**Como corrigir**  
```bash
cd frontend
npm uninstall react-hook-form @hookform/resolvers
npm run build  # confirmar que o build não quebra
```

**Esforço estimado**: 10 minutos

---

### 10. Rate limiter em memória não sobrevive a restarts

**O problema**  
O `RateLimiter` em `app/middleware/rate_limit.py` armazena os contadores em um dicionário Python em memória. Reiniciar o container zera todos os contadores, permitindo que um atacante burle o limite reiniciando antes de atingi-lo.

**Por que importa**  
Em ambiente de produção com deploy frequente ou múltiplos workers uvicorn (`--workers 4`), cada processo tem seu próprio contador, multiplicando o limite efetivo por 4.

**Como corrigir — nível 1 (simples)**  
Garantir que uvicorn rode com `--workers 1` (atual, pelo docker-compose). Documentar essa limitação.

**Como corrigir — nível 2 (robusto)**  
Substituir o dicionário por Redis com TTL:

```python
# requirements.txt
redis==5.0.1

# rate_limit.py
import redis
r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

def is_allowed(self, key: str) -> bool:
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, 60)
    count, _ = pipe.execute()
    return count <= self.requests_per_minute
```

**Esforço estimado**: 2–3 horas (nível 2)

---

## 🟡 Melhorias de Qualidade

### 11. Máscara visual nos campos bancários

**O problema**  
Os campos `agencia` e `conta` aceitam qualquer sequência numérica sem formatação visual. O campo `banco` aceita texto livre sem lista de opções conhecidas.

**Como corrigir**  
Aplicar a mesma lógica já existente para CPF (`maskCPF`) e telefone (`maskPhone`) em `lib/validators.ts`:

```typescript
// lib/validators.ts — adicionar
export function maskAgencia(value: string): string {
  return onlyDigits(value).slice(0, 6)
}

export function maskConta(value: string): string {
  const digits = onlyDigits(value).slice(0, 12)
  if (digits.length > 1) {
    return digits.slice(0, -1) + '-' + digits.slice(-1)
  }
  return digits
}
```

**Esforço estimado**: 1–2 horas

---

### 12. `setPath` duplicado em dois arquivos

**O problema**  
A função `setPath` (atualiza um campo num objeto aninhado por caminho em string) está implementada identicamente em `useChatEngine.ts` e `useAnexo1WizardStore.ts`.

**Como corrigir**  
Mover para `lib/object-utils.ts` (arquivo já existe) e importar nos dois locais:

```typescript
// lib/object-utils.ts — adicionar
export function setPath<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown,
): T {
  const keys = path.split('.')
  const next = { ...obj }
  let current: Record<string, unknown> = next
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    current[k] = { ...(current[k] as Record<string, unknown> ?? {}) }
    current = current[k] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
  return next as T
}
```

**Esforço estimado**: 30 minutos

---

### 13. Usar o componente `Card` no wizard

**O problema**  
O `Card` component foi criado com hover effect e sombra progressiva, mas o `Anexo1Wizard.tsx` usa divs com classes Tailwind inline em vez de aproveitar o componente.

**Como corrigir**  
Substituir padrões como:

```tsx
// ANTES (em Anexo1Wizard.tsx)
<div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-card)]">

// DEPOIS
<Card>
  <CardContent>
    ...
  </CardContent>
</Card>
```

**Esforço estimado**: 1–2 horas (durante a refatoração dos steps)

---

### 14. Skeleton no step de revisão durante carregamento do preview

**O problema**  
Quando o usuário chega ao Passo 9 (Revisão), o preview é carregado via API. Durante esse tempo, a seção aparece vazia ou com um spinner genérico, sem indicar quais seções estão carregando.

**Como corrigir**  
As classes `skeleton` e `shimmer` já estão definidas em `globals.css`. Basta usá-las:

```tsx
// Step9Revisao.tsx
{preview.isLoading ? (
  <div className="space-y-4">
    <div className="skeleton h-6 w-48 rounded" />
    <div className="skeleton h-4 w-full rounded" />
    <div className="skeleton h-4 w-3/4 rounded" />
    <div className="skeleton h-4 w-5/6 rounded" />
  </div>
) : (
  <ReviewSection ... />
)}
```

**Esforço estimado**: 1 hora

---

### 15. `allowEmpty` é propriedade morta no tipo `ChatStateDefinition`

**O problema**  
O campo `allowEmpty` está definido em `chat/types.ts` mas o `useChatEngine.ts` nunca o verifica. Estados que declaram `allowEmpty: true` comportam-se igual aos que não declaram.

**Como corrigir**  
Duas opções:

**Opção A** — Remover a propriedade (mais limpo):
```typescript
// types.ts — remover a linha
allowEmpty?: boolean
```
E remover todas as ocorrências em `chatFlow.ts`.

**Opção B** — Implementar o comportamento (mais correto):
```typescript
// useChatEngine.ts — no início de processReply
if (!stateDef.allowEmpty && value === '') {
  return { ...prev, error: 'Por favor, preencha este campo.' }
}
```

**Esforço estimado**: 30 minutos

---

### 16. Validação de data de nascimento sem limites razoáveis

**O problema**  
O campo `data_nascimento` em `anexo1.schema.ts` aceita qualquer string que passe o `min(1)`. Datas como `0001-01-01` ou datas futuras são aceitas pelo schema.

**Como corrigir**  
```typescript
// anexo1.schema.ts
data_nascimento: z.string()
  .min(1, 'Informe a data de nascimento')
  .refine((val) => {
    const d = new Date(val)
    const now = new Date()
    const minDate = new Date('1920-01-01')
    return !isNaN(d.getTime()) && d < now && d > minDate
  }, 'Data de nascimento inválida'),
```

**Esforço estimado**: 30 minutos

---

### 17. Variáveis CSS de tipografia não são usadas pelo Tailwind

**O problema**  
As variáveis `--text-xs` até `--text-3xl` definidas em `globals.css` seguem a sintaxe `font: 11px/14px` que o CSS suporta, mas o Tailwind 4 não as mapeia para suas classes utilitárias (`text-xs`, `text-lg`, etc.). As classes do Tailwind têm seus próprios valores. As variáveis definidas são CSS morto.

**Por que importa**  
Desenvolvedores podem achar que `className="text-lg"` usa `--text-lg: 17px/24px` e ficarem surpresos que não é assim.

**Como corrigir**  
Duas opções:

**Opção A** — Remover as variáveis e documentar que o Tailwind já define a escala:
```css
/* Remover do globals.css as variáveis --text-* */
```

**Opção B** — Mapear via `@theme` do Tailwind 4 (sintaxe correta):
```css
@theme {
  --font-size-xs: 11px;
  --font-size-sm: 13px;
  --font-size-base: 15px;
  /* ... */
}
```
Dessa forma o Tailwind 4 usará esses valores ao interpretar `text-xs`, `text-sm`, etc.

**Esforço estimado**: 1 hora

---

## 📋 Resumo Executivo

| # | Item | Prioridade | Esforço | Impacto |
|---|------|-----------|---------|---------|
| 1 | Quebrar `Anexo1Wizard.tsx` em steps | 🔴 Crítico | 4–6h | Manutenibilidade |
| 2 | Testes de frontend (Vitest) | 🔴 Crítico | 8–12h | Confiabilidade |
| 3 | CI/CD com GitHub Actions | 🔴 Crítico | 1–2h | Qualidade |
| 4 | `relacao_pertinencia` no schema Zod | 🔴 Crítico | 15min | Consistência |
| 5 | PDF geração assíncrona | 🟠 Importante | 2–3h | Performance |
| 6 | `aria-pressed` dinâmico no tema | 🟠 Importante | 5min | Acessibilidade |
| 7 | Validar `vinculo_outro_especificar` | 🟠 Importante | 30min | Regra de negócio |
| 8 | Persistir histórico do chat | 🟠 Importante | 3–4h | UX |
| 9 | Remover dependências não usadas | 🟠 Importante | 10min | Performance |
| 10 | Rate limiter persistente (Redis) | 🟠 Importante | 2–3h | Segurança |
| 11 | Máscaras nos campos bancários | 🟡 Melhoria | 1–2h | UX |
| 12 | `setPath` como utilitário shared | 🟡 Melhoria | 30min | Qualidade |
| 13 | Usar `Card` no wizard | 🟡 Melhoria | 1–2h | Consistência |
| 14 | Skeleton no step de revisão | 🟡 Melhoria | 1h | UX |
| 15 | Remover `allowEmpty` do tipo | 🟡 Melhoria | 30min | Qualidade |
| 16 | Limites na data de nascimento | 🟡 Melhoria | 30min | Validação |
| 17 | Variáveis CSS de tipografia mortas | 🟡 Melhoria | 1h | Código limpo |

**Total estimado**: 30–50 horas de desenvolvimento para todas as melhorias  
**Apenas os 4 críticos**: ~14–21 horas

---

## Ordem de execução recomendada

**Sprint 1** — Rápido e estrutural (1 dia)
1. Item 6: `aria-pressed` (5 min)
2. Item 9: remover dependências (10 min)
3. Item 4: schema Zod (15 min)
4. Item 7: validar `vinculo_outro_especificar` (30 min)
5. Item 3: CI/CD (1–2h)

**Sprint 2** — Qualidade de código (2–3 dias)
1. Item 1: quebrar Anexo1Wizard por steps
2. Item 12: `setPath` shared
3. Item 15: `allowEmpty` morto
4. Item 17: variáveis CSS

**Sprint 3** — Testes (2–3 dias)
1. Item 2: testes de frontend
2. Integrar ao CI do Sprint 1

**Sprint 4** — UX e robustez (2 dias)
1. Item 5: PDF assíncrono
2. Item 8: persistência do chat
3. Item 11: máscaras bancárias
4. Item 14: skeleton na revisão
5. Item 16: validação de data de nascimento

**Sprint 5** — Infraestrutura (1 dia)
1. Item 10: rate limiter com Redis
2. Item 13: usar Card no wizard

---

**Última atualização**: 2026-06-04  
**Gerado por**: Análise técnica completa do sistema
