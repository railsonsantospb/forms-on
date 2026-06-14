# UFPB Forms On

Sistema web para geração automatizada dos formulários de Diárias e Passagens da UFPB (Anexo I — Requisição e Anexo II — Relatório de Viagem). Guia o servidor passo a passo, valida regras institucionais e gera os documentos finais em DOCX ou PDF com um clique.

---

## O que é este sistema e por que ele existe

Quando um servidor público de uma universidade federal precisa viajar a trabalho — para participar de um congresso, realizar uma pesquisa ou representar a instituição —, ele é obrigado a preencher formulários administrativos específicos antes e depois da viagem. Na UFPB, esses documentos são o **Anexo I** (solicitação prévia de diárias e passagens) e o **Anexo II** (relatório de prestação de contas após o retorno).

O processo tradicional é inteiramente manual: o servidor baixa um arquivo Word, preenche campo por campo, calcula prazos mentalmente, verifica se está dentro das regras da instituição e, muitas vezes, comete erros que exigem retrabalho ou geram pendências administrativas.

O **UFPB Forms On** resolve esse problema oferecendo uma interface digital que:

1. **Guia o preenchimento** — em vez de um formulário em branco, o sistema apresenta um assistente passo a passo (chamado de *wizard*) que mostra apenas o que é necessário naquele momento, em linguagem clara.
2. **Valida as regras automaticamente** — o sistema conhece as normas da UFPB: sabe que uma solicitação de diárias deve ser feita com pelo menos 10 dias de antecedência, que o relatório deve ser entregue em até 5 dias após o retorno, que a data de retorno não pode ser anterior à de ida, entre outras dezenas de restrições. Se algo estiver errado, avisa imediatamente.
3. **Gera o documento pronto** — ao final do preenchimento, o servidor clica em "Gerar" e recebe o arquivo Word (DOCX) ou PDF com todos os campos já preenchidos, no formato oficial exigido pela UFPB.
4. **Salva o trabalho automaticamente** — o formulário é salvo a cada digitação, então o servidor pode fechar o navegador e continuar de onde parou em outro momento.
5. **Importa documentos anteriores** — se o servidor já tem um Anexo I preenchido, pode enviá-lo ao sistema e os dados são extraídos automaticamente para pré-preencher o Anexo II, eliminando retrabalho.

---

## Como o sistema funciona, explicado de forma simples

Imagine que você está preenchendo um formulário em papel, mas com a ajuda de um assistente experiente ao seu lado. Esse assistente:

- Só te pede a informação certa no momento certo
- Verifica, em tempo real, se o que você digitou faz sentido
- Calcula prazos por você
- Detecta se a viagem envolve fim de semana (o que exige justificativa adicional)
- Ao final, preenche o formulário oficial com os seus dados e entrega o arquivo pronto

É exatamente isso que o sistema faz, mas de forma digital, acessível pelo navegador de qualquer computador.

### O que acontece por trás dos bastidores

Quando o servidor digita uma informação e clica em "Próximo", o navegador envia esses dados para um programa rodando no servidor da universidade. Esse programa:

1. Verifica se os dados estão no formato correto (datas válidas, CPF com 11 dígitos, etc.)
2. Aplica as regras institucionais (prazos, encadeamento de trechos, obrigatoriedade de justificativas)
3. Salva o rascunho de forma segura
4. Quando o servidor solicita a geração do documento, monta o arquivo Word com os dados preenchidos e, se necessário, converte para PDF

Nenhuma informação pessoal é armazenada além do necessário para gerar o documento, e os rascunhos são apagados automaticamente após 15 dias.

---

## Tecnologias utilizadas e o que cada uma faz

Esta seção explica, em linguagem acessível, as tecnologias que compõem o sistema e por que cada uma foi escolhida.

### Interface do usuário (o que você vê no navegador)

O sistema usa **React** (versão 19), uma biblioteca criada pelo Facebook para construir interfaces web modernas. O React funciona dividindo a tela em componentes independentes — como peças de Lego — que se atualizam automaticamente quando os dados mudam. Isso significa que, quando você digita o nome de uma cidade no campo de origem, os campos relacionados (como o de destino) podem reagir imediatamente, sem precisar recarregar a página.

**TypeScript** é uma extensão da linguagem JavaScript que adiciona verificação de tipos. Em termos simples: ela ajuda os desenvolvedores a encontrar erros no código antes de o sistema entrar em funcionamento, como um revisor que lê o texto antes de publicar.

**Vite** é a ferramenta que empacota todo o código do navegador em arquivos otimizados para produção. Ela é responsável por tornar o sistema rápido ao carregar.

**Tailwind CSS** é uma forma de escrever estilos visuais (cores, tamanhos, espaçamentos) de maneira eficiente. Em vez de escrever folhas de estilo separadas, os estilos são aplicados diretamente nos componentes.

**Zustand** é a biblioteca responsável por manter o estado do formulário enquanto o servidor navega entre os passos. Funciona como uma memória compartilhada: todos os componentes da tela sabem o que foi preenchido até agora.

**Zod** é a biblioteca de validação do lado do cliente. Ela verifica, localmente no navegador, se os dados preenchidos respeitam o formato esperado, antes mesmo de enviar ao servidor.

### Servidor (o programa que processa os dados)

**FastAPI** (Python 3.12) é o framework que recebe as requisições do navegador e executa a lógica do sistema. Foi escolhido por ser moderno, rápido e por oferecer documentação automática dos endpoints de API. Python foi a linguagem escolhida por sua enorme biblioteca de ferramentas para manipulação de documentos e dados.

**python-docx** é a biblioteca que abre o template Word oficial da UFPB e substitui os marcadores (como `{{nome_completo}}`) pelos dados reais do servidor. É como um sistema de mala direta, mas para documentos administrativos.

**LibreOffice** (em modo *headless*, ou seja, sem interface gráfica) é o programa responsável por converter o arquivo Word gerado em PDF. O mesmo LibreOffice que você usa no computador pode ser executado no servidor sem mostrar janelas, apenas processando a conversão.

**pdfplumber** é a biblioteca que extrai texto de arquivos PDF. Ela é usada na funcionalidade de importação: quando o servidor envia um Anexo I em PDF, o sistema lê o conteúdo e tenta identificar os campos (nome, CPF, datas, etc.) usando expressões regulares.

**Redis** é um banco de dados em memória usado para controle de taxa de acesso (*rate limiting*). Ele conta quantas requisições cada endereço IP fez nos últimos 60 segundos e bloqueia temporariamente os que excedem o limite, protegendo o sistema contra uso abusivo.

**JSON Schema** é um padrão internacional para descrever a estrutura esperada de dados no formato JSON. O sistema define um schema para o Anexo I e outro para o Anexo II, e qualquer dado enviado ao servidor é validado contra esses schemas antes de ser processado.

### Infraestrutura (como o sistema roda)

**Docker** é uma tecnologia que empacota o sistema inteiro — o código, as dependências, o LibreOffice — em um contêiner isolado. Isso garante que o sistema funcione da mesma forma em qualquer ambiente, seja no computador do desenvolvedor ou no servidor de produção.

**Docker Compose** orquestra múltiplos contêineres simultaneamente. No caso deste sistema, dois contêineres rodam juntos: o da aplicação principal (FastAPI + React) e o do Redis.

**GitHub Actions** é o sistema de integração contínua (CI/CD) que automatiza verificações a cada mudança de código: análise estática, varredura de segurança, testes automatizados e, em caso de sucesso, publicação automática.

### Segurança

O sistema implementa diversas camadas de proteção:

- **HMAC (Hash-based Message Authentication Code)**: cada rascunho recebe um token secreto único. O servidor armazena apenas o *hash* (uma impressão digital) desse token — nunca o valor original. Assim, mesmo que alguém acesse os arquivos do servidor, não consegue usar os tokens. A verificação usa comparação em tempo constante para evitar ataques de temporização.

- **AES-GCM**: os dados são criptografados no próprio navegador usando AES-GCM, um algoritmo de criptografia simétrica amplamente recomendado, antes de serem armazenados localmente.

- **Headers de segurança HTTP (OWASP)**: o servidor adiciona automaticamente cabeçalhos de resposta que instrui o navegador a se comportar de forma segura, prevenindo ataques como *clickjacking*, *cross-site scripting* (XSS) e injeção de conteúdo.

- **Validação de arquivos enviados**: quando o servidor envia um PDF ou DOCX para importação, o sistema verifica os primeiros bytes do arquivo (*magic bytes*) para confirmar que o arquivo é realmente do tipo declarado, impedindo envio de arquivos maliciosos disfarçados.

---

## Arquitetura técnica

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

### Padrão Arquitetural — Arquitetura Hexagonal (Ports and Adapters)

O backend adota a **Arquitetura Hexagonal**, proposta por Alistair Cockburn em 2005 [1]. Nesse padrão, o núcleo da aplicação (lógica de negócio e regras de domínio) é isolado do mundo externo por meio de *Ports* (interfaces) e *Adapters* (implementações concretas). Isso permite, por exemplo, substituir o armazenamento em sistema de arquivos por um banco de dados relacional sem alterar nenhuma linha de código de negócio.

```
app/
├── domain/           # Núcleo — entidades e interfaces (Ports)
│   ├── entities.py   # Servidor, Trecho, Anexo1Payload, Anexo2Payload
│   ├── ports.py      # DraftRepository, TemplateRepository, DocumentRenderer, PDFConverter
│   └── services.py   # DateValidationService, PrazoValidationService
├── application/      # Casos de uso (orquestração)
│   ├── use_cases.py  # PreviewAnexo1UseCase, PreviewAnexo2UseCase, GenerateDocumentUseCase
│   └── draft_auth.py # Autenticação HMAC de rascunhos
├── infrastructure/   # Adapters — implementações concretas
│   └── repositories.py  # FileSystemDraftRepository (com cleanup automático de 15 dias)
├── middleware/
│   ├── security.py   # SecurityHeadersMiddleware, RequestSizeLimitMiddleware
│   ├── rate_limit.py # RedisRateLimiter — sliding window de 60s por IP
│   ├── trace.py      # TraceIDMiddleware — UUID por requisição
│   └── upload.py     # validate_upload, sanitize_filename
├── core/
│   └── logging.py    # JSONFormatter — logs estruturados em stdout
├── schemas/
│   ├── anexo1.schema.json  # JSON Schema draft-2020-12
│   ├── anexo2.schema.json
│   └── validator.py
├── services/
│   ├── validate_anexo1.py  # Regras de negócio e cálculo de flags
│   ├── validate_anexo2.py
│   ├── placeholders.py     # Monta dicionário de substituição para templates
│   ├── docx_render.py      # Preenchimento de templates via python-docx
│   ├── pdf_convert.py      # DOCX → PDF via LibreOffice headless
│   ├── anexo1_import.py    # Extração heurística de dados de PDF/DOCX
│   └── anexo2_import.py
├── templates/
│   ├── anexo1_template.docx
│   └── anexo2_template.docx
└── main.py
```

### Frontend — React 19 + TypeScript

```
frontend/src/
├── api/                  # client.ts (apiFetch, apiBlob, ApiError)
├── components/
│   ├── ErrorBoundary.tsx # Captura erros React — detalhes apenas no log do servidor
│   ├── layout/           # Topbar, Footer
│   ├── ui/               # Design system: Button, Input, Select, FormField, Card, Modal
│   └── wizard/           # WizardStepper, WizardNavigation, StepTransition
├── features/
│   ├── anexo1/           # Wizard 9 passos, store Zustand, schema Zod
│   ├── anexo2/           # Wizard 7 passos, store Zustand, schema Zod
│   ├── chat/             # Assistente "Dira" — máquina de estados determinística
│   ├── import/           # Upload e aplicação de prefill
│   ├── review/           # Tela de revisão antes da geração
│   └── theme/            # Dark/light, acessibilidade
├── hooks/                # useAutoSave, useBeforeUnload, useDebounce
├── lib/                  # crypto.ts (AES-GCM), dates.ts, validators.ts
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

## Referências

As referências a seguir fundamentam as escolhas técnicas, arquiteturais e de experiência do usuário implementadas neste sistema. Estão organizadas por tema para facilitar a consulta em contexto de dissertação.

---

### Governo Digital, Desburocratização e Serviços Públicos Eletrônicos

[1] BRASIL. **Lei nº 14.129, de 29 de março de 2021** — Lei do Governo Digital. Dispõe sobre princípios, regras e instrumentos para o Governo Digital. Diário Oficial da União, Brasília, DF, 30 mar. 2021. Disponível em: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14129.htm

[2] BRASIL. **Decreto nº 10.332, de 28 de abril de 2020** — Estratégia de Governo Digital 2020–2022. Institui a Estratégia de Governo Digital para o período de 2020 a 2022. Diário Oficial da União, Brasília, DF, 29 abr. 2020.

[3] FOUNTAIN, J. E. **Building the Virtual State: Information Technology and Institutional Change**. Washington, DC: Brookings Institution Press, 2001. — Obra seminal sobre como tecnologia transforma instituições públicas e processos burocráticos.

[4] JANSSEN, M.; ESTEVEZ, E. **Lean Government and Platform-based Governance — Doing More with Less**. Government Information Quarterly, v. 30, n. Supplement 1, p. S1–S8, 2013. https://doi.org/10.1016/j.giq.2012.11.003

[5] SCHOLL, H. J. **E-Government Reference Library (EGRL)**. Disponível em: http://faculty.washington.edu/jscholl/egrl/ — Base de referência sobre governo eletrônico e transformação digital no setor público.

[6] UNITED NATIONS. **E-Government Survey 2022: The Future of Digital Government**. New York: United Nations Department of Economic and Social Affairs, 2022. Disponível em: https://publicadministration.un.org/egovkb/en-us/Reports/UN-E-Government-Survey-2022

---

### Experiência do Usuário (UX) e Formulários Digitais

[7] NIELSEN, J. **Usability Engineering**. San Francisco: Morgan Kaufmann, 1994. — Fundamento dos princípios de usabilidade aplicados ao design do wizard (visibilidade do estado do sistema, controle do usuário, prevenção de erros).

[8] NIELSEN, J.; MOLICH, R. **Heuristic evaluation of user interfaces**. In: Proceedings of the SIGCHI Conference on Human Factors in Computing Systems (CHI '90). New York: ACM, 1990. p. 249–256. https://doi.org/10.1145/97243.97281

[9] SHNEIDERMAN, B. et al. **Designing the User Interface: Strategies for Effective Human-Computer Interaction**. 6. ed. Pearson, 2016. — Referência clássica sobre design de interfaces, incluindo o padrão wizard para guiar usuários em tarefas complexas e sequenciais.

[10] WROBLEWSKI, L. **Web Form Design: Filling in the Blanks**. New York: Rosenfeld Media, 2008. — Obra de referência sobre design de formulários web: organização, validação inline, feedback em tempo real e redução de erros de preenchimento.

[11] BABICH, N. **Best Practices for Form Design**. UX Planet, 2018. Disponível em: https://uxplanet.org/best-practices-for-form-design-ff5de6ca6e5 — Diretrizes práticas para formulários com múltiplos passos (wizards), validação progressiva e mensagens de erro contextuais.

[12] ISO 9241-11:2018. **Ergonomics of human-system interaction — Part 11: Usability: Definitions and concepts**. International Organization for Standardization, 2018. — Norma internacional que define usabilidade como a medida em que um sistema pode ser usado por usuários específicos para atingir objetivos com eficácia, eficiência e satisfação.

---

### Arquitetura de Software — Hexagonal, Camadas e Clean Architecture

[13] COCKBURN, A. **Hexagonal Architecture** (*Ports and Adapters*). 2005. Disponível em: https://alistair.cockburn.us/hexagonal-architecture/ — Artigo original que propõe isolar o núcleo da aplicação de tecnologias externas por meio de portas (interfaces) e adaptadores (implementações concretas), padrão adotado no backend deste sistema.

[14] MARTIN, R. C. **Clean Architecture: A Craftsman's Guide to Software Structure and Design**. Upper Saddle River, NJ: Prentice Hall, 2017. — Fundamenta o princípio da independência de frameworks, bancos de dados e interface, alinhado à separação domain/application/infrastructure adotada no projeto.

[15] EVANS, E. **Domain-Driven Design: Tackling Complexity in the Heart of Software**. Upper Saddle River, NJ: Addison-Wesley, 2003. — Introduz conceitos como Entidades, Objetos de Valor, Repositórios e Serviços de Domínio utilizados na camada `domain/` do sistema.

[16] FOWLER, M. **Patterns of Enterprise Application Architecture**. Upper Saddle River, NJ: Addison-Wesley, 2002. — Descreve os padrões Repository (usado no `FileSystemDraftRepository`) e Gateway, além do padrão Template Method utilizado na renderização de documentos.

[17] RICHARDSON, C. **Microservices Patterns: With Examples in Java**. Manning Publications, 2018. — Referência sobre padrões de API REST, versionamento de rotas e separação de responsabilidades em serviços backend.

---

### APIs REST e Desenvolvimento Web

[18] FIELDING, R. T. **Architectural Styles and the Design of Network-based Software Architectures**. Tese de Doutorado, University of California, Irvine, 2000. Disponível em: https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm — Dissertação original que define o estilo arquitetural REST (Representational State Transfer), base dos endpoints `/api/v1/` implementados.

[19] MASSE, M. **REST API Design Rulebook**. O'Reilly Media, 2011. — Guia de boas práticas para design de APIs RESTful, incluindo versionamento, métodos HTTP semânticos (GET, POST, PATCH) e códigos de status.

[20] RAMÍREZ, S. **FastAPI Documentation**. 2018–present. Disponível em: https://fastapi.tiangolo.com — Documentação oficial do framework FastAPI, que combina validação automática com Pydantic e documentação interativa OpenAPI/Swagger.

---

### Validação de Dados e JSON Schema

[21] PEZOA, F. et al. **Foundations of JSON Schema**. In: Proceedings of the 25th International Conference on World Wide Web (WWW '16). New York: ACM, 2016. p. 263–273. https://doi.org/10.1145/2872427.2883029 — Artigo acadêmico que formaliza as bases teóricas do JSON Schema, padrão utilizado para validação dos payloads de Anexo I e Anexo II.

[22] DROETTBOOM, M. et al. **Understanding JSON Schema**. Disponível em: https://json-schema.org/understanding-json-schema — Guia de referência do padrão JSON Schema draft-2020-12, incluindo validações condicionais (`if/then/else`) e referências entre schemas.

[23] GARCIA-MOLINA, H.; ULLMAN, J. D.; WIDOM, J. **Database Systems: The Complete Book**. 2. ed. Prentice Hall, 2008. — Cap. 6 e 7 abordam validação de esquemas e restrições de integridade, princípios análogos à validação aplicada nos schemas JSON do sistema.

---

### Segurança de Aplicações Web

[24] OWASP FOUNDATION. **OWASP Top Ten 2021**. Disponível em: https://owasp.org/Top10/ — Lista dos dez riscos mais críticos em aplicações web. O sistema implementa proteções contra XSS (Content-Security-Policy), injeção (validação de dados), broken authentication (HMAC tokens) e security misconfiguration (hardening de container).

[25] OWASP FOUNDATION. **OWASP Application Security Verification Standard (ASVS) 4.0**. Disponível em: https://owasp.org/www-project-application-security-verification-standard/ — Padrão de verificação de segurança que fundamenta os requisitos de autenticação, criptografia e controle de acesso implementados.

[26] KRAWCZYK, H.; BELLARE, M.; CANETTI, R. **HMAC: Keyed-Hashing for Message Authentication**. RFC 2104. Internet Engineering Task Force (IETF), 1997. https://doi.org/10.17487/RFC2104 — Especificação original do HMAC, algoritmo utilizado na autenticação dos tokens de rascunho com comparação em tempo constante.

[27] DWORKIN, M. **Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC**. NIST Special Publication 800-38D. National Institute of Standards and Technology, 2007. https://doi.org/10.6028/NIST.SP.800-38D — Especificação do AES-GCM utilizado para criptografar dados no sessionStorage do navegador.

[28] BARTH, A. **HTTP State Management Mechanism**. RFC 6265. IETF, 2011. — Base para entendimento de sessionStorage e gerenciamento de estado no cliente, incluindo restrições de acesso entre origens.

[29] STAMM, S.; STERNE, B.; MARKHAM, G. **Reining in the Web with Content Security Policy**. In: Proceedings of the 19th International World Wide Web Conference (WWW 2010). p. 921–930. — Artigo de referência sobre Content Security Policy (CSP), implementado no `SecurityHeadersMiddleware` para prevenir ataques XSS.

[30] TSYRKLEVICH, E.; YENER, B. **Single Sign-On for the Internet: A Security Story**. Usenix Security, 2006. — Contexto sobre tokens de sessão e autenticação stateless, princípios aplicados nos draft tokens.

---

### Criptografia e Privacidade de Dados

[31] BONEH, D.; SHOUP, V. **A Graduate Course in Applied Cryptography**. Draft 0.6. 2023. Disponível em: https://toc.cryptobook.us — Livro texto que cobre AES-GCM, HMAC-SHA256 e fundamentos de criptografia simétrica e autenticada usados no sistema.

[32] BRASIL. **Lei nº 13.709, de 14 de agosto de 2018** — Lei Geral de Proteção de Dados Pessoais (LGPD). Diário Oficial da União, Brasília, DF, 15 ago. 2018. — O sistema coleta dados pessoais de servidores (nome, CPF, SIAPE) e deve operar em conformidade com os princípios da LGPD: finalidade, necessidade, segurança e prevenção.

---

### Geração de Documentos e Automação de Escritório

[33] ADOBE SYSTEMS. **PDF Reference, sixth edition: Adobe Portable Document Format version 1.7**. Adobe Systems Incorporated, 2006. — Especificação do formato PDF gerado pelo LibreOffice a partir dos arquivos DOCX preenchidos pelo sistema.

[34] ECMA INTERNATIONAL. **Office Open XML File Formats (ECMA-376)**. 5. ed. Genebra: ECMA, 2016. Disponível em: https://www.ecma-international.org/publications-and-standards/standards/ecma-376/ — Padrão internacional do formato DOCX (Office Open XML) manipulado pela biblioteca python-docx.

[35] KNUTH, D. E. **The TeXbook**. Addison-Wesley, 1984. — Referência histórica sobre composição tipográfica automatizada, contexto intelectual da geração programática de documentos a partir de templates.

---

### Extração de Informação e Processamento de Documentos

[36] ZANIBBI, R.; BLOSTEIN, D. **Recognition and Retrieval of Mathematical Expressions**. International Journal of Document Analysis and Recognition, v. 15, n. 4, p. 331–357, 2012. — Contexto sobre reconhecimento de padrões em documentos, área relacionada à extração heurística de campos de formulários PDF realizada pelo `anexo1_import.py`.

[37] DÉJEAN, H.; MEUNIER, J. L. **A system for converting PDF documents into structured XML format**. In: Proceedings of the 7th IAPR International Workshop on Document Analysis Systems (DAS 2006). p. 129–140. — Artigo sobre extração de estrutura de documentos PDF, problema central na funcionalidade de importação/prefill do sistema.

[38] CHITICARIU, L. et al. **Rule-Based Information Extraction is Dead! Long Live Rule-Based Information Extraction Systems!** In: Proceedings of the 2013 Conference on Empirical Methods in Natural Language Processing (EMNLP 2013). p. 827–832. — Defende a eficácia de sistemas de extração baseados em regras (como regex e heurísticas) em domínios específicos e bem definidos, justificativa para a abordagem adotada no módulo de importação.

---

### Interfaces Conversacionais e Assistentes Digitais

[39] ALLEN, J. **Natural Language Understanding**. 2. ed. Benjamin/Cummings, 1995. — Fundamentos dos sistemas de diálogo e máquinas de estado, base teórica do assistente conversacional "Dira" implementado como *finite-state machine* determinística.

[40] JURAFSKY, D.; MARTIN, J. H. **Speech and Language Processing**. 3. ed. (draft). 2023. Disponível em: https://web.stanford.edu/~jurafsky/slp3/ — Cap. 24 e 25 cobrem sistemas de diálogo orientados a tarefa (*task-oriented dialogue systems*), paradigma adotado no chat guiado do sistema (sem LLM, com máquina de estados explícita).

[41] RAUX, A. et al. **Let's Go Public! Taking a Spoken Dialogue System to the Real World**. In: Proceedings of Interspeech 2005. — Experiência prática com sistemas de diálogo guiados por regras em contexto institucional, análogo ao assistente Dira.

---

### Conteinerização, DevOps e Infraestrutura

[42] MERKEL, D. **Docker: Lightweight Linux Containers for Consistent Development and Deployment**. Linux Journal, v. 2014, n. 239, p. 2, 2014. — Artigo seminal sobre Docker, tecnologia utilizada para empacotar e implantar o sistema de forma reproduzível.

[43] BURNS, B. et al. **Borg, Omega, and Kubernetes**. Communications of the ACM, v. 59, n. 5, p. 50–57, 2016. https://doi.org/10.1145/2898442 — Contexto sobre orquestração de contêineres e os princípios que fundamentam o Docker Compose utilizado no projeto.

[44] HUMBLE, J.; FARLEY, D. **Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation**. Upper Saddle River, NJ: Addison-Wesley, 2010. — Fundamento do pipeline CI/CD implementado via GitHub Actions: lint → security scan → testes → build → deploy.

[45] FOWLER, M. **Continuous Integration**. 2006. Disponível em: https://martinfowler.com/articles/continuousIntegration.html — Artigo que define e populariza o conceito de integração contínua, prática adotada no projeto.

---

### Acessibilidade e Design Inclusivo

[46] W3C. **Web Content Accessibility Guidelines (WCAG) 2.1**. World Wide Web Consortium, 2018. Disponível em: https://www.w3.org/TR/WCAG21/ — Diretrizes de acessibilidade para conteúdo web. O sistema implementa opções de alto contraste, escala de fonte, espaçamento de linhas e redução de movimento, alinhando-se aos critérios WCAG 2.1.

[47] HENRY, S. L. **Just Ask: Integrating Accessibility Throughout Design**. Lulu.com, 2007. — Obra sobre como incorporar acessibilidade desde as fases iniciais do design, refletida nas opções de tema e acessibilidade do sistema.

---

### Transformação Digital na Educação Superior

[48] CASTELLS, M. **A Sociedade em Rede**. 8. ed. São Paulo: Paz e Terra, 2005. — Obra de referência sobre a sociedade da informação e a transformação das instituições pela tecnologia, contexto macro do qual este sistema faz parte.

[49] BRYNJOLFSSON, E.; McAFEE, A. **The Second Machine Age: Work, Progress, and Prosperity in a Time of Brilliant Technologies**. New York: W.W. Norton & Company, 2014. — Contextualiza a automação de processos rotineiros em organizações, motivação central deste projeto.

[50] AGUNE, R. M.; CARLOS, J. A. **Governo Eletrônico e Novos Processos de Trabalho**. In: LEVY, E.; DRAGO, P. A. (org.). Gestão Pública no Brasil Contemporâneo. São Paulo: FUNDAP/Casa Civil, 2005. — Contextualiza a automação de processos administrativos no setor público brasileiro.

---

## Contribuindo

1. Abra uma _issue_ descrevendo o bug ou melhoria
2. Fork → branch → commit → Pull Request
3. Os PRs passam por lint, security scan, testes unitários e E2E antes do merge

---

## Licença

Este sistema foi desenvolvido no âmbito da **Universidade Federal da Paraíba (UFPB)**, com envolvimento do **Centro de Ciências Humanas, Sociais e Agrárias (CCHSA)** e do **Centro Acadêmico de Vitória de Santo Antão (CAVN)**.

O código-fonte é de propriedade da UFPB. Uso, reprodução ou distribuição dependem de autorização formal da instituição.

> Para solicitações de uso ou parcerias, entre em contato com a UFPB por meio dos canais institucionais do CCHSA ou do CAVN.
