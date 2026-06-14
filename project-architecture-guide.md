# Guia Universal de Arquitetura de Software

## Versao 1.0 | Uso: Projetos Web, Mobile e Desktop

---

## INDICE

1. [Como Usar Este Guia](#1-como-usar-este-guia)
2. [Questionario de Decisao Arquitetural](#2-questionario-de-decisao-arquitetural)
3. [Arquiteturas por Plataforma](#3-arquiteturas-por-plataforma)
4. [Estrutura de Camadas Profissional](#4-estrutura-de-camadas-profissional)
5. [UX/UI e Design System](#5-uxui-e-design-system)
6. [Seguranca](#6-seguranca)
7. [Qualidade e DevOps](#7-qualidade-e-devops)
8. [Padroes e Principios](#8-padroes-e-principios)
9. [Uso com Kimi Code](#9-uso-com-kimi-code)

---

## 1. COMO USAR ESTE GUIA

### 1.1. Proposito

Este guia serve como referencia tecnica para definir a arquitetura de qualquer projeto de software. Ele responde tres perguntas fundamentais:

1. **Qual arquitetura usar?** → Consulte a secao 2 (Questionario)
2. **Como estruturar as camadas?** → Consulte a secao 4 (Camadas)
3. **O que nao esquecer?** → Consulte as secoes 5-7 (UX/UI, Seguranca, Qualidade)

### 1.2. Quando Usar

| Cenario | Como Aplicar |
|---------|-------------|
| Projeto do zero | Siga o questionario da secao 2 integralmente |
| Projeto existente | Use como checklist de melhorias nas secoes 4-7 |
| Refatoracao | Priorize a secao 4 (Camadas) e secao 8 (Padroes) |
| Onboarding de equipe | Compartilhe como padrao de referencia |

### 1.3. Principios Norteadores

- **Decisoes baseadas em contexto**: Nao existe arquitetura perfeita, existe arquitetura adequada
- **Custo de mudanca**: Quanto mais tarde uma decisao e tomada, mais cara ela fica
- **Simplicidade primeiro**: Adicione complexidade apenas quando necessario
- **Separation of Concerns**: Cada camada tem uma responsabilidade unica

---

## 2. QUESTIONARIO DE DECISAO ARQUITETURAL

### 2.1. Fluxo de Decisao Principal

Responda as perguntas em ordem. Cada resposta direciona para a proxima pergunta ou para uma recomendacao.

#### PERGUNTA 1: Qual e a plataforma principal?

```
A) Web (acessado via navegador)
   → Va para PERGUNTA 2

B) Mobile (iOS/Android nativo ou hibrido)
   → Va para PERGUNTA 3

C) Desktop (Windows/Mac/Linux)
   → Va para PERGUNTA 4

D) Multiplataforma (Web + Mobile + Desktop)
   → Va para PERGUNTA 5
```

#### PERGUNTA 2: (Web) Qual e o perfil de interatividade?

```
A) Site institucional/blog com pouca interatividade
   → RECOMENDACAO: SSR (Next.js/Nuxt) ou SSG estatico
   → Arquitetura: MVC simplificado
   → Prioridade: SEO, performance de carregamento

B) Aplicacao web com alta interatividade (SPA)
   → Va para PERGUNTA 2.1

C) Dashboard/administrativo com dados em tempo real
   → RECOMENDACAO: SPA com arquitetura em camadas
   → Estado global obrigatorio (Redux/Zustand/Pinia)
   → WebSocket para dados em tempo real

D) E-commerce com alto trafego
   → RECOMENDACAO: SSR/SSG hibrido
   → Arquitetura: Micro-frontends para escalar equipes
   → Cache agressivo, CDN, otimizacao de imagens
```

#### PERGUNTA 2.1: (Web SPA) Qual e a escala e complexidade?

```
A) Pequeno (1-3 desenvolvedores, < 10 paginas)
   → RECOMENDACAO: React/Vue/Svelte simples
   → Arquitetura: Feature-based folders
   → Estado: Context API / composables nativos

B) Medio (3-10 desenvolvedores, 10-50 paginas)
   → RECOMENDACAO: React/Vue/Angular com camadas
   → Arquitetura: Clean Architecture adaptada
   → Estado: Zustand / Pinia / Redux Toolkit

C) Grande (10+ desenvolvedores, 50+ paginas)
   → RECOMENDACAO: Micro-frontends
   → Arquitetura: Module Federation ou iframes isolados
   → Estado: Cada micro-frontend gerencia seu estado
   → Design System obrigatorio
```

#### PERGUNTA 3: (Mobile) Qual e a estrategia de desenvolvimento?

```
A) Desempenho nativo maximo (jogos, AR/VR, apps pesados)
   → RECOMENDACAO: Swift (iOS) + Kotlin (Android) nativos
   → Arquitetura: MVVM ou Clean Architecture
   → Camada de dominio compartilhada via Kotlin Multiplatform

B) Equipe unica, codebase unificado
   → Va para PERGUNTA 3.1

C) App hibrido/leve (lojas, catalogos, apps simples)
   → RECOMENDACAO: Flutter ou React Native
   → Arquitetura: BLoC (Flutter) ou Redux (RN)
   → Atenção: Testes em dispositivos reais obrigatorios
```

#### PERGUNTA 3.1: (Mobile Cross-platform) Prioridade: UI nativa ou velocidade?

```
A) UI pixel-perfect nativa em cada plataforma
   → RECOMENDACAO: React Native com native modules
   → Arquitetura: MVVM + Redux/Zustand
   → Bridging nativo para recursos especificos

B) Desenvolvimento rapido, UI consistente
   → RECOMENDACAO: Flutter
   → Arquitetura: Clean Architecture + BLoC/Riverpod
   → Widget catalog proprio obrigatorio

C) Compartilhamento maximo de codigo (Web + Mobile)
   → RECOMENDACAO: React Native Web ou Ionic
   → Arquitetura: Monorepo com shared packages
   → Cuidado: Limitacoes de performance em mobile
```

#### PERGUNTA 4: (Desktop) Qual e o contexto de uso?

```
A) Aplicacao corporativa interna
   → RECOMENDACAO: Electron/Tauri com web tech
   → Arquitetura: Igual a aplicacao web
   → Atenção: Seguranca de dados locais

B) Software comercial para distribuicao
   → Va para PERGUNTA 4.1

C) Ferramenta de produtividade/developer
   → RECOMENDACAO: Tauri (Rust) ou Electron
   → Arquitetura: Processos isolados para plugins
   → IPC seguro entre main e renderer
```

#### PERGUNTA 4.1: (Desktop Comercial) Requisitos de performance?

```
A) Leve, startup rapido, baixo consumo de RAM
   → RECOMENDACAO: Tauri ou Flutter Desktop
   → Arquitetura: MVC com servicos
   → Bundle size otimizado

B) Complexo, integracao com hardware/sistema
   → RECOMENDACAO: C# (WPF/MAUI) ou C++ (Qt)
   → Arquitetura: MVVM ou MVC tradicional
   → Testes de integracao com hardware obrigatorios

C) Multiplataforma (Win/Mac/Linux) prioritario
   → RECOMENDACAO: Flutter Desktop ou Tauri
   → Arquitetura: Abstracao de plataforma
   → CI/CD para todas as plataformas
```

#### PERGUNTA 5: (Multiplataforma) Estrategia de codigo compartilhado?

```
A) Maximo compartilhamento (negocio e UI)
   → RECOMENDACAO: Flutter (Mobile + Web + Desktop)
   → Arquitetura: Clean Architecture unificada
   → Shared kernel de dominio

B) Compartilhamento de negocio, UI nativa
   → RECOMENDACAO: Kotlin Multiplatform + Compose/SwiftUI
   → Arquitetura: Shared ViewModel, UI nativa
   → Module de dominio compartilhado

C) Web como base, apps como wrappers
   → RECOMENDACAO: PWA + Capacitor/Tauri
   → Arquitetura: Web API + camada de adaptacao nativa
   → Service Workers, cache estrategico

D) Cada plataforma independente
   → RECOMENDACAO: Equipes separadas, Design System unificado
   → Arquitetura: API REST/GraphQL como contrato
   → Gateway BFF (Backend for Frontend) recomendado
```

### 2.2. Checklist de Decisoes criticas

Apos definir a arquitetura pelo fluxo acima, confirme:

```
□ A arquitetura suporta a escala esperada em 2 anos?
□ A equipe atual tem expertise nas tecnologias escolhidas?
□ O custo de infraestrutura esta dentro do orcamento?
□ Existe plano de rollback se a escolha for equivocada?
□ A arquitetura permite testes automatizados?
□ O debugging e possivel em ambiente de producao?
□ Ha documentacao suficiente da comunidade/ecossistema?
```

---

## 3. ARQUITETURAS POR PLATAFORMA

### 3.1. Web

#### 3.1.1. SSR (Server-Side Rendering)

**Use quando**: SEO critico, primeiro carregamento rapido, conteudo dinamico
**Tecnologias**: Next.js, Nuxt, SvelteKit, Remix

```
Estrutura de pastas:
├── app/                    # Rotas e paginas
│   ├── (routes)/           # Grupos de rotas
│   ├── layout.tsx          # Layout raiz
│   └── page.tsx            # Paginas
├── components/             # Componentes reutilizaveis
│   ├── ui/                 # Componentes genericos (Button, Input)
│   └── domain/             # Componentes de negocio
├── lib/                    # Utilitarios e helpers
├── hooks/                  # Custom hooks
├── services/               # Chamadas de API
├── types/                  # Tipos TypeScript
└── styles/                 # Estilos globais
```

#### 3.1.2. SPA (Single Page Application)

**Use quando**: Alta interatividade, aplicacao apos login, dashboards
**Tecnologias**: React, Vue, Angular, Svelte

```
Estrutura de pastas (Feature-based):
├── src/
│   ├── features/           # Modulos de negocio
│   │   ├── auth/           # Feature: Autenticacao
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── stores/
│   │   │   └── types/
│   │   └── dashboard/      # Feature: Dashboard
│   ├── shared/             # Codigo compartilhado
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── types/
│   ├── app/                # Configuracao da aplicacao
│   └── main.tsx            # Entry point
```

#### 3.1.3. Micro-frontends

**Use quando**: Multiplas equipes, escala organizacional, deploy independente
**Tecnologias**: Module Federation, Single-SPA, iframes

```
Estrutura:
├── shell/                  # Container principal
├── mf-auth/                # Micro-frontend: Autenticacao
├── mf-dashboard/           # Micro-frontend: Dashboard
├── mf-orders/              # Micro-frontend: Pedidos
└── shared/                 # Bibliotecas compartilhadas
    ├── ui-kit/             # Componentes compartilhados
    ├── utils/              # Utilitarios
    └── types/              # Tipos compartilhados
```

**Regras criticas**:
- Nunca compartilhe estado diretamente entre MFs
- Use eventos ou URL como comunicacao
- Versione a API do shared library
- Cada MF deve ser deployavel independentemente

### 3.2. Mobile

#### 3.2.1. Nativo (Swift/Kotlin)

**Use quando**: Performance critica, acesso total a APIs do SO, app premium

```swift
// iOS - Swift (MVVM + Clean Architecture)
Project/
├── App/                        # Entry point, delegates
├── Presentation/               # ViewModels, ViewControllers
│   ├── Views/
│   └── ViewModels/
├── Domain/                     # Regras de negocio puras
│   ├── Entities/
│   ├── UseCases/
│   └── RepositoryInterfaces/
├── Data/                       # Implementacoes de repositorio
│   ├── Repositories/
│   ├── Network/
│   └── Persistence/
└── Core/                       # Utilitarios, extensions
```

```kotlin
// Android - Kotlin (MVVM + Clean Architecture)
app/
├── presentation/               # Activities, Fragments, ViewModels
├── domain/                     # UseCases, Models, Repository interfaces
├── data/                       # Repositories, API, Database
├── di/                         # Modulos de injecao de dependencia
└── utils/                      # Extensions, helpers
```

#### 3.2.2. Flutter

**Use quando**: UI customizada, desenvolvimento rapido, multiplataforma

```
lib/
├── main.dart                   # Entry point
├── app.dart                    # MaterialApp, rotas
├── core/                       # Codigo compartilhado
│   ├── theme/                  # Cores, tipografia, temas
│   ├── constants/              # Constantes
│   ├── errors/                 # Tratamento de erros
│   └── utils/                  # Extensions, helpers
├── features/
│   └── auth/
│       ├── data/               # Models, datasources, repos
│       ├── domain/             # Entities, usecases, repos interfaces
│       └── presentation/       # Pages, widgets, BLoC
└── shared/                     # Componentes compartilhados
    └── widgets/
```

#### 3.2.3. React Native

**Use quando**: Equipe web experiente, necessidade de bridiging nativo

```
src/
├── app/                        # Navegacao, providers
├── screens/                    # Telas
├── components/                 # Componentes
├── hooks/                      # Hooks customizados
├── services/                   # APIs, storage
├── stores/                     # Estado global (Zustand/Redux)
├── utils/                      # Helpers
├── constants/                  # Configuracoes
└── types/                      # Tipagens
```

### 3.3. Desktop

#### 3.3.1. Tauri (Rust + Web)

**Use quando**: App leve, seguro, moderno

```
src/                            # Frontend (React/Vue/etc.)
src-tauri/
├── src/
│   ├── main.rs                 # Entry point
│   ├── commands/               # Comandos expostos ao frontend
│   ├── services/               # Logica de negocio
│   └── models/                 # Estruturas de dados
└── Cargo.toml
```

#### 3.3.2. Electron

**Use quando**: App complexo, ecossistema Node.js necessario

```
src/
├── main/                       # Processo principal (Node.js)
│   ├── index.ts                # Entry point
│   ├── ipc/                    # Handlers IPC
│   └── services/               # Servicos do main process
├── preload/                    # Script de preload (ponte segura)
└── renderer/                   # Processo de render (React/Vue)
    ├── components/
    ├── pages/
    └── stores/
```

**Regra de seguranca critica**: Nunca expoe Node.js diretamente ao renderer. Sempre use preload com contextIsolation: true.

---

## 4. ESTRUTURA DE CAMADAS PROFISSIONAL

### 4.1. Clean Architecture (Robert C. Martin)

**Use quando**: Regras de negocio complexas, testabilidade critica, longevidade do projeto

```
         ┌─────────────────────────────────────┐
         │         Presentation Layer          │
         │    (UI, Controllers, ViewModels)    │
         ├─────────────────────────────────────┤
         │         Application Layer           │
         │    (UseCases, DTOs, Mappers)        │
         ├─────────────────────────────────────┤
         │          Domain Layer               │
         │  (Entities, ValueObjects, Rules)    │
         ├─────────────────────────────────────┤
         │      Infrastructure Layer           │
         │  (DB, API, External Services, UI)   │
         └─────────────────────────────────────┘
```

**Regra da dependencia**: Camadas internas nao conhecem camadas externas. Todas as dependencias apontam para o centro (Domain).

#### Estrutura de pastas detalhada:

```
project/
├── src/
│   ├── presentation/           # Camada externa - UI/API
│   │   ├── controllers/
│   │   ├── viewmodels/
│   │   ├── components/         # (web/mobile)
│   │   └── middleware/         # Auth, logging, error handler
│   │
│   ├── application/            # Casos de uso
│   │   ├── usecases/
│   │   ├── dto/
│   │   ├── interfaces/         # Ports (contratos)
│   │   └── services/           # App services (orquestracao)
│   │
│   ├── domain/                 # Nucleo - regras de negocio
│   │   ├── entities/
│   │   ├── valueobjects/
│   │   ├── repositories/       # Interfaces (Ports)
│   │   ├── services/           # Domain services
│   │   └── exceptions/
│   │
│   └── infrastructure/         # Implementacoes tecnicas
│       ├── persistence/        # DB, ORM, migrations
│       ├── http/               # Clients HTTP, APIs externas
│       ├── cache/              # Redis, etc.
│       ├── messaging/          # Filas, eventos
│       └── security/           # Crypto, JWT, hash
│
├── tests/
│   ├── unit/                   # Testes de unidade
│   ├── integration/            # Testes de integracao
│   └── e2e/                    # Testes end-to-end
│
└── config/                     # Configuracoes por ambiente
```

### 4.2. Hexagonal Architecture (Ports and Adapters)

**Use quando**: Multiplas interfaces de entrada/saida, integracoes complexas

```
                    ┌─────────────┐
                    │     UI      │
                    └──────┬──────┘
                           │
     ┌─────────────┐  ┌────┴────────┐  ┌─────────────┐
     │    CLI      │  │             │  │    API      │
     └──────┬──────┘  │ Application │  └──────┬──────┘
            │         │   + Domain  │         │
     ┌──────┴──────┐  │             │  ┌──────┴──────┐
     │  Database   │  └──────┬──────┘  │  External   │
     │  Adapter    │         │         │  Service    │
     └─────────────┘  ┌──────┴──────┐  └─────────────┘
                      │   Port      │
                      │  (Interface)│
                      └─────────────┘
```

**Conceito chave**: O dominio define ports (interfaces). Adapters implementam essas interfaces. Novos adapters podem ser adicionados sem modificar o dominio.

### 4.3. Onion Architecture

**Use quando**: Similar a Clean Architecture, com enfase em dependency inversion

```
         [ UI / API / CLI ]
    [ Application Services ]
 [ Domain Services (interfaces) ]
[      Domain Entities         ]  ← Centro
 [ Infrastructure interfaces  ]
    [ Tests — podem tocar    ]
       todas as camadas
```

### 4.4. MVC (Model-View-Controller)

**Use quando**: Projetos simples, CRUDs, prototipos, pouca logica de negocio

```
Request → Controller → Model (dados/logica) → View → Response
              ↑__________________________________|
```

**Limitacao**: Nao escala bem para logicas complexas. O Controller tende a ficar gordo.

### 4.5. MVVM (Model-View-ViewModel)

**Use quando**: UIs com binding de dados (WPF, SwiftUI, Flutter, Angular)

```
View ←→ ViewModel ←→ Model
(Binding)   (Commands)
```

### 4.6. Comparativo Rapido

| Arquitetura | Complexidade | Testabilidade | Escalabilidade | Quando Usar |
|------------|-------------|---------------|----------------|-------------|
| MVC | Baixa | Media | Baixa | CRUDs, prototipos |
| MVVM | Media | Alta | Media | UIs reativas, mobile |
| Clean Arch | Alta | Muito Alta | Alta | Sistemas complexos, enterprise |
| Hexagonal | Alta | Muito Alta | Alta | Multiplas integracoes |
| Onion | Alta | Muito Alta | Alta | Domain-driven design |

### 4.7. Decisao de Arquitetura por Contexto

```
Complexidade do negocio:
├─ Baixa (CRUD) ─────────────→ MVC
├─ Media (Regras simples) ───→ MVVM
└─ Alta (Regras complexas) ──→ Clean / Hexagonal

Tamanho da equipe:
├─ 1-3 devs ─────────────────→ MVC ou MVVM
├─ 3-10 devs ────────────────→ Clean Architecture
└─ 10+ devs ─────────────────→ Clean + Micro-frontends/Microservices

Longevidade:
├─ < 6 meses (MVP) ──────────→ MVC, simplicidade
├─ 6 meses - 2 anos ─────────→ MVVM
└─ > 2 anos ─────────────────→ Clean / Hexagonal
```

---

## 5. UX/UI E DESIGN SYSTEM

### 5.1. Design System Obrigatorio

Qualquer projeto profissional deve ter:

```
design-system/
├── tokens/                     # Valores primitivos
│   ├── colors.json             # Paleta completa
│   ├── typography.json         # Fontes, tamanhos, pesos
│   ├── spacing.json            # Grid, padding, margin
│   ├── breakpoints.json        # Responsividade
│   └── shadows.json            # Elevacoes
│
├── components/                 # Componentes reutilizaveis
│   ├── primitives/             # Button, Input, Card
│   ├── composite/              # Form, Modal, Table
│   └── patterns/               # Header, Footer, Navigation
│
├── icons/                      # Biblioteca de icones
├── illustrations/              # Ilustracoes padrao
└── guidelines/                 # Documentacao de uso
```

### 5.2. Acessibilidade (WCAG 2.1 AA — Obrigatorio)

```
□ Contraste minimo 4.5:1 para texto normal
□ Contraste 3:1 para texto grande (18pt+)
□ Todos os elementos interativos acessiveis por teclado
□ Ordem de tabulacao logica
□ Textos alternativos para imagens
□ Labels associados a todos os inputs
□ Mensagens de erro claras e visiveis
□ Suporte a leitores de tela (ARIA labels)
□ Nao depender apenas de cor para transmitir informacao
□ Animacoes respeitam prefers-reduced-motion
```

### 5.3. Responsividade

```
Mobile First — Breakpoints:
├── sm: 640px   (phones landscape)
├── md: 768px   (tablets)
├── lg: 1024px  (desktops)
├── xl: 1280px  (large desktops)
└── 2xl: 1536px (extra large)

Regras:
- Sempre projete mobile primeiro
- Touch targets minimo 44x44px
- Font-size minimo 16px em inputs (evita zoom em iOS)
- Imagens responsivas com srcset
- Teste em dispositivos reais, nao apenas emuladores
```

### 5.4. Performance Visual

```
□ First Contentful Paint (FCP) < 1.8s
□ Largest Contentful Paint (LCP) < 2.5s
□ Cumulative Layout Shift (CLS) < 0.1
□ First Input Delay (FID) < 100ms
□ Skeleton screens para carregamento
□ Lazy loading de imagens e componentes
□ Font-display: swap para web fonts
□ Critical CSS inline
```

---

## 6. SEGURANCA

### 6.1. OWASP Top 10 — Checklist de Prevencao

```
A01:2021 – Broken Access Control
□ Principio do menor privilegio
□ Validacao de autorizacao em toda requisicao
□ Negar por padrao (default deny)
□ Desabilitar listagem de diretorios
□ Remover tokens de debug/desenvolvimento

A02:2021 – Cryptographic Failures
□ TLS 1.2+ para todas as conexoes
□ Senhas hasheadas com bcrypt/Argon2 (NUNCA MD5/SHA1)
□ Dados sensiveis criptografados em repouso
□ Nunca exponha chaves no codigo-fonte
□ Use HTTPS em producao

A03:2021 – Injection
□ Nunca concatene SQL diretamente
□ Use ORM ou parameterized queries
□ Escape output em templates
□ Valide e sanitize todos os inputs

A04:2021 – Insecure Design
□ Rate limiting em todas as APIs
□ Validacao em servidor (nunca confie apenas no client)
□ Logs de seguranca sem dados sensiveis

A05:2021 – Security Misconfiguration
□ Remova headers que identifiquem tecnologia (X-Powered-By)
□ Content-Security-Policy configurado
□ CORS restritivo (nunca use *)
□ Remova contas e credenciais padrao

A06:2021 – Vulnerable Components
□ Mantenha dependencias atualizadas
□ Use ferramenta de scan (Snyk, Dependabot)
□ Remova dependencias nao utilizadas

A07:2021 – Auth Failures
□ Use OAuth 2.0 / OpenID Connect
□ JWT com expiracao curta (< 15 min)
□ Refresh tokens rotativos
□ Multi-factor authentication quando possivel
□ Protecao contra brute force

A08:2021 – Data Integrity Failures
□ Assinatura de todos os dados criticos
□ Validacao de integridade em uploads

A09:2021 – Logging Failures
□ Log todas as operacoes de autenticacao
□ Log de acesso a dados sensiveis
□ Logs imutaveis e centralizados
□ NUNCA log senhas, tokens ou dados pessoais

A10:2021 – Server-Side Request Forgery
□ Whitelist de URLs externas permitidas
□ Validacao de IPs internos
□ Desabilite redirecionamentos nao esperados
```

### 6.2. Headers de Seguranca HTTP

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 6.3. Autenticacao e Autorizacao

```
Flow recomendado (OAuth 2.0 + PKCE para SPAs):

1. Client → Authorization Server: /authorize (code_challenge)
2. Authorization Server → Client: authorization_code
3. Client → Authorization Server: /token (code_verifier)
4. Authorization Server → Client: access_token + refresh_token
5. Client → Resource Server: API requests (Bearer token)
6. Resource Server → Client: Protected resources

Regras:
□ Access token: curta duracao (5-15 min)
□ Refresh token: duracao mais longa, rotativo
□ Armazene tokens em httpOnly cookies (web) ou Keychain/Keystore (mobile)
□ NUNCA armazene tokens em localStorage
□ Revogacao de tokens no logout
```

### 6.4. Seguranca por Camada

```
Camada              | Medidas de Seguranca
--------------------|----------------------------------------------------
Cliente             | Input validation, CSP, anti-CSRF, anti-clickjacking
Rede                | TLS 1.2+, HSTS, cert pinning (mobile)
API Gateway         | Rate limiting, WAF, DDoS protection, auth
Aplicacao           | AuthZ, input sanitization, output encoding
Banco de Dados      | Parameterized queries, least privilege, encryption
Infraestrutura      | Firewall, network segmentation, secrets manager
```

### 6.5. Tratamento de Dados (LGPD/GDPR)

```
□ Consentimento explicito para coleta de dados
□ Possibilidade de exportar dados do usuario
□ Possibilidade de exclusao completa (right to be forgotten)
□ Anonimizacao de dados em logs e analytics
□ Notificacao de vazamento em ate 72h
□ DPO (Data Protection Officer) designado
□ Privacy by design e by default
```

---

## 7. QUALIDADE E DEVOPS

### 7.1. Piramide de Testes

```
         /\
        /  \           E2E (poucos, cenarios criticos)
       /----\          (Cypress, Playwright, Detox)
      /      \
     /--------\       Integracao (servicos, APIs)
    /          \       (Supertest, MSW, WireMock)
   /------------\
  /              \    Unidade (muitos, rapido)
 /----------------\    (Jest, Vitest, XCTest, JUnit)
```

**Proporcao**: 70% unitarios / 20% integracao / 10% E2E

### 7.2. CI/CD Pipeline

```yaml
# Pipeline obrigatoria:
stages:
  - lint
  - test
  - build
  - security-scan
  - deploy-staging
  - e2e-staging
  - deploy-production

lint:
  - ESLint/Prettier/SwiftLint/Ktlint
  - Type checking (TypeScript/tsc)

test:
  - Unit tests com cobertura > 80%
  - Integration tests
  - Snapshot tests (com cautela)

security-scan:
  - SAST (SonarQube, CodeQL)
  - Dependency scan (Snyk, npm audit)
  - Secret detection (GitLeaks)

build:
  - Build otimizado para producao
  - Bundle analysis
  - Source maps separados

deploy:
  - Blue-green ou canary deployment
  - Feature flags para rollout gradual
  - Rollback automatico em caso de erro
```

### 7.3. Code Review Checklist

```
□ O codigo segue o padrao de estilo do projeto?
□ Ha testes para novas funcionalidades?
□ Os nomes sao claros e descritivos?
□ Ha tratamento de erros adequado?
□ Nao ha dados sensiveis expostos?
□ As dependencias novas sao realmente necessarias?
□ A documentacao foi atualizada?
□ Performance: N+1 queries, memory leaks?
□ Seguranca: Inputs validados, outputs escapados?
□ Acessibilidade: Labels, contraste, navegacao?
```

### 7.4. Monitoramento e Observabilidade

```
Tres pilares:
1. Logs        → Structured logging (JSON), correlacao por trace ID
2. Metrics     → Latencia, throughput, errors (RED method)
3. Traces      → Distributed tracing (OpenTelemetry)

Alertas obrigatorios:
□ Error rate > 1%
□ Latencia p95 > 500ms
□ CPU/Memory > 80%
□ Falha em health check
□ Vazamento de memoria detectado
```

---

## 8. PADROES E PRINCIPIOS

### 8.1. SOLID

```
S - Single Responsibility: Cada classe/modulo tem uma razao para mudar
O - Open/Closed: Aberto para extensao, fechado para modificacao
L - Liskov Substitution: Classes filhas devem substituir pais sem quebrar
I - Interface Segregation: Interfaces pequenas e especificas
D - Dependency Inversion: Dependa de abstracoes, nao de concretos
```

### 8.2. Outros Principios

```
DRY  - Don't Repeat Yourself (sem duplicacao)
KISS - Keep It Simple, Stupid (simplicidade)
YAGNI - You Ain't Gonna Need It (nao adicione antes de precisar)
POLA - Principle of Least Astonishment (comportamento esperado)
```

### 8.3. Padroes de Projeto (GoF) — Mais Utilizados

```
Criacionais:
├── Singleton     → Logger, config (use com moderacao)
├── Factory       → Criacao de objetos complexos
├── Builder       → Construcao de objetos passo a passo
└── Dependency Injection → Inversao de controle (preferido)

Estruturais:
├── Repository    → Abstracao de persistencia
├── Adapter       → Integracao com APIs externas
├── Facade        → Simplificacao de subsistemas complexos
├── Proxy         → Cache, lazy loading, controle de acesso
└── Composite     → Estruturas em arvore (menus, categorias)

Comportamentais:
├── Observer      → Event-driven architecture
├── Strategy      → Algoritmos intercambiaveis
├── Command       → CQRS, undo/redo
├── Chain of Resp → Middleware pipeline
└── Template Method → Frameworks, workflows
```

---

## 9. USO COM KIMI CODE

### 9.1. Como Usar Este Arquivo

Este guia pode ser utilizado como contexto tecnico no Kimi Code de tres formas:

**Forma 1: Contexto Global**
- Copie o conteudo relevante para o campo de instrucoes do projeto
- O Kimi aplicara as regras automaticamente em todas as interacoes

**Forma 2: Prompt Especifico**
- Cole trechos especificos junto com sua pergunta
- Exemplo: "Baseado na secao de Clean Architecture deste guia, como devo estruturar o modulo de autenticacao?"

**Forma 3: Checklist de Validacao**
- Use apos o Kimi gerar codigo para validar conformidade
- Exemplo: "Verifique se o codigo gerado segue o checklist de seguranca da secao 6"

### 9.2. Prompts Sugeridos por Cenario

#### Projeto do Zero

```
"Quero criar um [tipo de aplicacao] usando este guia de arquitetura. 
Responda as perguntas do questionario:
- Plataforma: [web/mobile/desktop/multipla]
- Interatividade: [baixa/media/alta]
- Escala: [pequena/media/grande]
- Equipe: [N desenvolvedores]
- Prazo: [curto/medio/longo]

Baseado nas respostas, defina:
1. Arquitetura recomendada
2. Estrutura de pastas
3. Stack tecnologica
4. Checklist de seguranca aplicavel
5. Setup inicial de testes"
```

#### Projeto Existente

```
"Analise este projeto existente usando o guia de arquitetura:
[ cole o arquivo package.json, estrutura de pastas, ou descricao ]

Identifique:
1. Qual arquitetura ele segue (ou deveria seguir)
2. Violacoes dos principios SOLID
3. Itens faltantes no checklist de seguranca
4. Melhorias na estrutura de camadas
5. Divida tecnica critica a ser enderecada"
```

#### Refatoracao

```
"Preciso refatorar [modulo especifico] seguindo Clean Architecture.
O codigo atual tem estes problemas: [descricao].

Aplique:
1. Separacao em camadas (Domain, Application, Infrastructure)
2. Inversao de dependencia
3. Testabilidade
4. Checklist de seguranca da secao 6

Forneca o codigo refatorado e explique as mudancas."
```

### 9.3. Exemplo de Conversa Completa

**Usuario**: "Crie um sistema de autenticacao completo para uma aplicacao web React"

**Contexto a fornecer ao Kimi**:
```
Seguindo o Guia Universal de Arquitetura:
- Plataforma: Web SPA (secao 3.1.2)
- Arquitetura: Clean Architecture adaptada (secao 4.1)
- Escala: Media (secao 2.1, opcao B)
- Seguranca: OWASP A07 (secao 6.1), headers HTTP (secao 6.2)
- UX: Acessibilidade WCAG 2.1 (secao 5.2)
- Qualidade: Testes unitarios + integracao (secao 7.1)

Requisitos:
1. Login com email/senha + OAuth Google
2. JWT com refresh token rotation
3. Protecao contra brute force
4. Logout com revogacao de tokens
5. Formularios acessiveis

Estrutura de pastas: features/auth/ com domain/, data/, presentation/
```

### 9.4. Variaveis de Contexto

Para reutilizacao, defina estas variaveis no inicio de cada conversa:

```
PROJETO_TIPO = [web-spa | web-ssr | mobile-nativo | mobile-flutter | desktop-tauri | multiplataforma]
ARQUITETURA = [mvc | mvvm | clean | hexagonal | onion]
ESCALA = [pequena | media | grande]
EQUIPE_TAMANHO = [N]
PRAZO = [curto | medio | longo]
FOCO = [mvp | qualidade | performance | seguranca]

Com base nessas variaveis, aplique as secoes correspondentes deste guia.
```

---

## 10. REFERENCIA RAPIDA

### 10.1. Stack Recomendada por Cenario

| Cenario | Frontend | Backend | Mobile | Desktop | Banco |
|---------|----------|---------|--------|---------|-------|
| Startup/MVP | React/Next.js | Node.js/NestJS | Flutter | Tauri | PostgreSQL |
| Enterprise | Angular/React | Java Spring/.NET | Kotlin/Swift | Electron | PostgreSQL + Redis |
| E-commerce | Next.js (SSR) | Node.js/Go | React Native | - | PostgreSQL + Mongo |
| Real-time | React + WebSocket | Node.js/Elixir | Flutter + Firebase | - | PostgreSQL |
| Jogos | Unity/WebGL | C++ / Go | Unity/Flutter | Unity | PostgreSQL |

### 10.2. Checklist de Inicio de Projeto

```
□ Definir arquitetura via questionario (secao 2)
□ Configurar repositorio com protecao de branches
□ Setup de CI/CD basico
□ Configurar linting e formatação
□ Estrutura de pastas definida
□ Design System inicial (cores, tipografia)
□ Sistema de autenticacao
□ Logging e monitoramento
□ Ambientes: dev, staging, production
□ Documentacao de API (OpenAPI/Swagger)
□ README com instrucoes de setup
□ Licenca e contributing guidelines
```

### 10.3. Anti-Patterns a Evitar

```
□ God Object / God Class
□ Spaghetti Code (acoplamento excessivo)
□ Premature Optimization
□ Magic Numbers e Strings
□ Copy-Paste Programming
□ Golden Hammer (usar ferramenta favorita para tudo)
□ Not Invented Here (reinventar bibliotecas existentes)
□ Shotgun Surgery (mudança exige alterar muitos lugares)
```

---

**Documento mantido como referencia viva. Atualize conforme evolucao do projeto e novas tecnologias.**

**Versao**: 1.0
**Compatibilidade**: Web (React, Vue, Angular, Svelte), Mobile (Swift, Kotlin, Flutter, React Native), Desktop (Tauri, Electron, Flutter Desktop, WPF)
**Uso**: Projetos novos, existentes e refatoracoes
