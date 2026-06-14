# UFPB Forms On

Sistema web para geração automatizada dos formulários de Diárias e Passagens da UFPB (Anexo I — Requisição e Anexo II — Relatório de Viagem). Guia o servidor passo a passo, valida regras institucionais e gera os documentos finais em DOCX ou PDF com um clique.

---

## O que o sistema faz

- **Wizard guiado** para Anexo I (requisição) e Anexo II (relatório de viagem)
- **Validação automática** de datas, prazos, encadeamento de trechos e regras da UFPB
- **Detecção de fins de semana e feriados** com solicitação de justificativa quando necessário
- **Geração de documentos** em DOCX (Word) ou PDF via LibreOffice headless
- **Importação de documentos anteriores** para pré-preencher o formulário (PDF/DOCX)
- **Assistente conversacional "Dira"** — preenche o formulário via chat determinístico
- **Auto-save** com armazenamento local criptografado (AES-GCM) e sincronização via rascunhos
- **Tema e acessibilidade** configuráveis (dark/light, escala de fonte, alto contraste, espaçamento)

---

## Arquitetura

### Visão geral

```
Browser (React SPA)
       │  HTTPS / HTTP
       ▼
FastAPI (Python 3.12)
  ├── Middleware: TraceID → RateLimit (Redis) → SecurityHeaders → RequestSizeLimit
  ├── API /api  e  /api/v1  (rotas idênticas via duplo include_router)
  │    ├── Drafts: criar / ler / atualizar rascunhos (filesystem JSON)
  │    ├── Anexo1: preview, generate (DOCX/PDF), prefill
  │    └── Anexo2: preview, generate (DOCX/PDF), prefill
  └── Static: serve dist/ do Vite (SPA) com fallback HTML legado
```

### Backend — Arquitetura Hexagonal

```
app/
├── domain/           # Entidades, regras puras e interfaces (Ports)
│   ├── entities.py   # Servidor, Trecho, Anexo1Payload, Anexo2Payload
│   ├── ports.py      # DraftRepository, TemplateRepository, DocumentRenderer, PDFConverter
│   └── services.py   # DateValidationService, PrazoValidationService
├── application/      # Casos de uso
│   ├── use_cases.py  # PreviewAnexo1UseCase, PreviewAnexo2UseCase, GenerateDocumentUseCase
│   └── draft_auth.py # Token HMAC: hash_token, require_draft_token, public_draft
├── infrastructure/   # Adapters concretos
│   └── repositories.py  # FileSystemDraftRepository (com cleanup automático de 15 dias)
├── middleware/
│   ├── security.py   # SecurityHeadersMiddleware, RequestSizeLimitMiddleware
│   ├── rate_limit.py # RedisRateLimiter — sliding window de 60s por IP
│   ├── trace.py      # TraceIDMiddleware — UUID por requisição em x-trace-id
│   └── upload.py     # validate_upload, sanitize_filename (magic bytes, MIME, 5 MB)
├── core/
│   └── logging.py    # JSONFormatter — logs estruturados em stdout
├── schemas/
│   ├── anexo1.schema.json  # JSON Schema draft-2020-12 (Anexo I)
│   ├── anexo2.schema.json  # JSON Schema draft-2020-12 (Anexo II)
│   └── validator.py        # validate_payload com cache de schemas compilados
├── services/
│   ├── validate_anexo1.py  # Regras de negócio + cálculo de flags e placeholders
│   ├── validate_anexo2.py  # Idem para Anexo II
│   ├── placeholders.py     # Monta dicionário de substituição para templates Word
│   ├── docx_render.py      # Preenchimento de templates via python-docx ({{campo}})
│   ├── pdf_convert.py      # DOCX → PDF via LibreOffice headless (subprocess assíncrono)
│   ├── anexo1_import.py    # Extração de dados de PDF/DOCX com pdfplumber + regex
│   └── anexo2_import.py    # Idem para Anexo II
├── templates/
│   ├── anexo1_template.docx
│   └── anexo2_template.docx
└── main.py           # Ponto de entrada — instância de app, routers, singleton FileSystemDraftRepository
```

### Frontend — React 19 + TypeScript

```
frontend/src/
├── api/                  # client.ts (apiFetch, apiBlob, ApiError), anexo1.ts, anexo2.ts
├── components/
│   ├── ErrorBoundary.tsx # Captura erros React — exibe mensagem genérica; detalhes só no log
│   ├── layout/           # Topbar, Footer
│   ├── ui/               # Design system: Button, Input, Select, FormField, Card, Modal, Badge
│   └── wizard/           # WizardStepper, WizardNavigation, StepTransition
├── features/
│   ├── anexo1/           # Wizard 9 passos, store Zustand, schema Zod, helpers
│   ├── anexo2/           # Wizard 7 passos, store Zustand, schema Zod, helpers
│   ├── chat/             # Assistente "Dira" — máquina de estados determinística
│   ├── import/           # DocumentImport — upload e aplicação de prefill
│   ├── review/           # ReviewGrid, ReviewSection, ReviewTimeline
│   └── theme/            # store Zustand + Provider (dark/light, a11y)
├── hooks/                # useAutoSave, useBeforeUnload, useDebounce
├── lib/                  # crypto.ts, dates.ts, strings.ts, trechos.ts, validators.ts
└── pages/                # HomePage, Anexo1Page, Anexo2Page, NotFoundPage
```

---

## Wizard — Passos

### Anexo I (Requisição de Diárias/Passagens)

| Passo | Conteúdo |
|-------|----------|
| 1 | Tipo de solicitação (Diárias / Passagens / Ambos) + data |
| 2 | Dados do servidor (nome, CPF, SIAPE, vínculo, banco) |
| 3 | Trechos de ida (origem/destino/data-hora, múltiplos trechos) |
| 4 | Trechos de retorno — botão para espelhar automaticamente os destinos da ida |
| 5 | Missão (data/hora início e término) |
| 6 | Motivo da viagem e relação de pertinência |
| 7 | Débito de recurso (CCHSA / CAVN / Projeto / Outros) + meios de transporte |
| 8 | Justificativas (exigidas se fora do prazo ou envolve fim de semana/feriado) |
| 9 | Revisão + geração (DOCX ou PDF) |

### Anexo II (Relatório de Viagem)

| Passo | Conteúdo |
|-------|----------|
| 1 | Data do relatório |
| 2 | Dados do proposto |
| 3 | Datas de afastamento (ida e retorno) |
| 4 | Tabela de atividades realizadas |
| 5 | Prazo de prestação de contas |
| 6 | Confirmação da viagem realizada |
| 7 | Revisão + geração (DOCX ou PDF) |

---

## API — Endpoints

Todas as rotas estão disponíveis em `/api` e `/api/v1` (idênticas).

### Rascunhos

| Método | Rota | Descrição | Rate limit |
|--------|------|-----------|------------|
| `POST` | `/api/v1/drafts` | Cria rascunho; retorna `draft_id` + `draft_token` | 20/min |
| `GET` | `/api/v1/drafts/{id}` | Recupera rascunho (requer `x-draft-token`) | 60/min |
| `PATCH` | `/api/v1/drafts/{id}` | Atualiza rascunho com merge (requer `x-draft-token`) | 30/min |

### Anexo I

| Método | Rota | Descrição | Rate limit |
|--------|------|-----------|------------|
| `POST` | `/api/v1/anexo1/preview` | Valida + calcula flags e placeholders | 30/min |
| `POST` | `/api/v1/anexo1/generate?format=docx\|pdf` | Gera documento final | 10/min |
| `POST` | `/api/v1/anexo1/prefill-from-anexo1` | Extrai dados de PDF/DOCX para pré-preencher | 10/min |

### Anexo II

| Método | Rota | Descrição | Rate limit |
|--------|------|-----------|------------|
| `POST` | `/api/v1/anexo2/preview` | Valida + calcula flags e placeholders | 30/min |
| `POST` | `/api/v1/anexo2/generate?format=docx\|pdf` | Gera documento final | 10/min |
| `POST` | `/api/v1/anexo2/prefill-from-anexo1` | Extrai de Anexo I para pré-preencher Anexo II | 10/min |
| `POST` | `/api/v1/anexo2/prefill-from-anexo2` | Extrai de Anexo II existente | 10/min |

### Utilitários

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/server-date` | Data/hora atual do servidor (sincronização) |

---

## Validações e Regras de Negócio

### Prazos (Anexo I)

| Tipo | Prazo mínimo | Consequência se ultrapassado |
|------|-------------|------------------------------|
| Diárias | 10 dias antes da viagem | Flag `fora_do_prazo = true` → justificativa obrigatória |
| Passagens | 30 dias antes da viagem | Idem |
| Relatório (Anexo II) | 5 dias após retorno | Flag `prestacao_contas_fora_prazo = true` → justificativa obrigatória |

### Regras de datas (Anexo I)

- Data de retorno deve ser >= ida
- Término da missão deve ser <= data de retorno
- Início da missão deve ser <= término
- Detecção automática de fins de semana e feriados no primeiro trecho de ida

### Regras condicionais (JSON Schema)

- Se `tipo_vinculo = "outro"` → campo `vinculo_outro_especificar` obrigatório
- Se `debito_recurso.tipo ∈ {projeto, outros}` → campo `detalhe` obrigatório
- Se `flags.fora_do_prazo = true` → `justificativas.justificativa_fora_prazo` obrigatório
- Se `flags.envolve_fds_feriado_ou_dia_anterior = true` → justificativa FDS obrigatória

---

## Segurança

### Headers OWASP (SecurityHeadersMiddleware)

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), geolocation=(), microphone=()
Content-Security-Policy: default-src 'self'; object-src 'none'; frame-src 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload  (apenas HTTPS)
```

### Rate Limiting (Redis Sliding Window)

- Janela deslizante de 60 segundos por IP
- Limites distintos por endpoint (10 a 60 req/min)
- Redis obrigatório em produção — falha aberta em desenvolvimento

### Autenticação de Rascunho (HMAC)

- Cada rascunho recebe um token aleatório de 32 bytes (`secrets.token_urlsafe`)
- Armazenado apenas como hash SHA-256 (`_token_hash`) no JSON do servidor
- Toda operação exige header `x-draft-token`
- Comparação timing-safe via `hmac.compare_digest`
- Cliente armazena token em sessionStorage com AES-GCM (fallback base64 em HTTP)

### Validação de Upload

- Magic bytes verificados no início do arquivo (PDF: `%PDF`, DOCX: `PK\x03\x04`, DOC: `\xd0\xcf\x11\xe0`)
- MIME type em lista branca
- Limite de 5 MB
- Sanitização de filename (remove `..`, trunca a 255 caracteres)
- Limite de 10 MB por requisição (RequestSizeLimitMiddleware)

### Hardening do Container

- Usuário não-root (`appuser`)
- `read_only: true` — filesystem somente leitura (exceto `/tmp` e `/app/data`)
- `no-new-privileges: true`
- Capabilities: `cap_drop: ALL`, adiciona apenas CHOWN / SETGID / SETUID
- Redis exposto apenas em `127.0.0.1`
- Backend exposto apenas em `127.0.0.1:8090` (proxy reverso na frente)

---

## Infraestrutura

### Docker Compose

```yaml
services:
  redis:   # redis:7-alpine — rate limiting, 64 MB limit
  wizard:  # python:3.12-slim + LibreOffice + frontend dist, 1 GB limit
```

Variáveis de ambiente relevantes:

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `REDIS_URL` | `redis://redis:6379/0` | Conexão Redis |
| `FORMS_ON_DATA_DIR` | `PROJECT_ROOT/data` | Pasta de rascunhos |
| `FORMS_ON_TEMPLATES_DIR` | `app/templates` | Pasta de templates Word |
| `TZ` | `America/Recife` | Timezone para cálculos de prazo |

### Pipeline CI/CD (.github/workflows/ci.yml)

```
lint-frontend  ──┐
lint-backend   ──┼──► security-scan ──► tests ──► build-docker ──► deploy-staging ──► deploy-production
                 │       (bandit +               (pytest +
                 │        npm audit)              vitest +
                 │                               playwright)
```

### Rascunhos — Armazenamento

- JSON simples em `data/{uuid}.json`
- Cleanup automático de arquivos com mais de 15 dias (executado a cada hora via singleton)
- Token de autenticação armazenado apenas como hash — nunca em texto plano

---

## Geração de Documentos

### Fluxo completo

```
Payload JSON
    ↓
JSON Schema (jsonschema)
    ↓
validate_and_enrich_anexo*(payload)  →  flags calculadas, placeholders montados
    ↓
render_docx_from_template()          →  python-docx substitui {{campo}} no template
    ↓
[se PDF] convert_docx_to_pdf_async() →  LibreOffice headless (soffice --headless)
    ↓
FileResponse + BackgroundTask (cleanup de /tmp)
```

### Formato dos placeholders no template Word

```
Template:  O servidor {{nome_completo}} solicita viagem de {{ida_origem}} a {{ida_destino}}.
Resultado: O servidor Railson Santos solicita viagem de João Pessoa/PB a Fortaleza/CE.
```

Placeholders de checkbox: preenchidos com `X` ou ` ` (espaço) conforme o valor booleano.

---

## Desenvolvimento Local

### Pré-requisitos

- Docker + Docker Compose
- (opcional) Python 3.12+, Node 22+, LibreOffice

### Com Docker

```bash
git clone https://github.com/railsonsantospb/forms-on.git
cd forms-on
docker compose up --build
# Acesse: http://localhost:8090
```

### Sem Docker

```bash
# Backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8090

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev   # http://localhost:5173 com proxy para :8090
```

### Comandos úteis

```bash
# Logs em tempo real
docker compose logs -f wizard

# Reconstruir após mudanças
docker compose up --build -d

# Testes backend
pytest tests/ --cov=app

# Testes frontend
cd frontend && npm run test        # unitários (vitest)
cd frontend && npm run test:e2e    # E2E (playwright)

# Linting
cd frontend && npm run lint
ruff check app/
```

---

## Stack

### Backend

| Biblioteca | Versão | Uso |
|-----------|--------|-----|
| FastAPI | 0.115.6 | Framework web + validação |
| Uvicorn | 0.32.1 | Servidor ASGI |
| python-docx | 1.1.2 | Preenchimento de templates Word |
| jsonschema | 4.23.0 | Validação JSON Schema (draft-2020-12) |
| pdfplumber | 0.11.5 | Extração de texto de PDFs |
| redis | 5.0.1 | Rate limiting (sliding window) |
| pydantic | 2.10.4 | Modelos de dados |

### Frontend

| Biblioteca | Versão | Uso |
|-----------|--------|-----|
| React | 19.2.5 | UI (concurrent rendering) |
| TypeScript | ~6.0.2 | Tipagem estática |
| Vite | 8.0.10 | Bundler + dev server |
| Zustand | 5.0.12 | Estado global (stores por feature) |
| TanStack Query | 5.100.7 | Data fetching e cache |
| Zod | 4.4.1 | Validação de schemas no frontend |
| Tailwind CSS | 4.2.4 | Estilização utilitária |
| Sonner | 2.0.7 | Notificações toast |
| Vitest | 4.1.8 | Testes unitários |
| Playwright | 1.60.0 | Testes E2E |

---

## Solução de Problemas

| Erro | Causa | Solução |
|------|-------|---------|
| Erro ao converter para PDF | LibreOffice não disponível | Com Docker está incluído; local: instale `libreoffice` |
| Template não encontrado | Arquivos ausentes em `app/templates/` | Verifique se `anexo1_template.docx` e `anexo2_template.docx` existem |
| Rascunho não encontrado | Arquivo JSON deletado ou expirado (>15 dias) | Inicie novo formulário |
| Redis connection error (logs) | Redis não acessível | Esperado em dev local; rate limiting falha aberto (não bloqueia) |
| `crypto.randomUUID is not a function` | App acessada via HTTP sem localhost | Corrigido — fallback automático para `Math.random` |

---

## Contribuindo

1. Abra uma _issue_ descrevendo o bug ou melhoria
2. Fork → branch → commit → Pull Request
3. Os PRs passam por lint, security scan, testes unitários e E2E antes do merge

---

## Licença

A definir.
