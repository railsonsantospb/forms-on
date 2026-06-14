# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-14

### Added

#### DevOps & CI/CD
- **Complete CI/CD Pipeline** with 6 stages:
  - Lint (frontend + backend)
  - Security Scan (Snyk, Bandit, Safety)
  - Tests (backend unit, frontend unit, E2E)
  - Docker Build with healthcheck
  - Deploy Staging & Production (with environments)
- **Security scanning tools**:
  - `npm audit` for frontend dependencies
  - `safety` for Python dependency vulnerabilities
  - `bandit` for Python SAST (Static Application Security Testing)
  - Snyk integration (with `SNYK_TOKEN` secret)
- **Backend linting** with Ruff (format + lint)

#### Logging & Observability
- **Structured JSON logging** with `app/core/logging.py`
  - JSON format for all logs with timestamp, level, source
  - `trace_id` correlation across requests
  - Exception tracking with stack traces
- **Trace ID Middleware** (`app/middleware/trace.py`)
  - Injects `x-trace-id` header in every request
  - Logs request start/completion with trace correlation
  - Returns trace ID in response headers for debugging

#### API Versioning
- **API v1 routes** under `/api/v1/` prefix
  - All existing endpoints available at `/api/v1/...`
  - Legacy `/api/...` routes preserved for backward compatibility
  - No breaking changes to existing clients

#### Architecture (Clean Architecture - Phase 1)
- **Domain Layer** (`app/domain/`)
  - `entities.py`: Value objects (Servidor, Trecho, Anexo1Payload, Anexo2Payload)
  - `services.py`: Pure business logic (DateValidationService, PrazoValidationService)
  - `ports.py`: Repository interfaces (DraftRepository, TemplateRepository, DocumentRenderer, PDFConverter)
- **Application Layer** (`app/application/`)
  - `use_cases.py`: Orchestration layer (PreviewAnexo1UseCase, PreviewAnexo2UseCase, GenerateDocumentUseCase)
- **Infrastructure Layer** (`app/infrastructure/`)
  - `repositories.py`: Concrete adapters (FileSystemDraftRepository, FileSystemTemplateRepository)

### Changed

#### Backend (`app/main.py`)
- Replaced standard `logging` with structured JSON logging
- Updated all security log events to use structured format with trace IDs
- Added `trace_id` to error responses (422, 500) for debugging
- Fixed path traversal logging to include trace correlation

#### Dependencies (`requirements-dev.txt`)
- Added `ruff` for linting
- Added `bandit` for security scanning
- Added `safety` for dependency vulnerability scanning

### Security
- All error responses now include `trace_id` for audit trails
- Security events (token missing/invalid, path traversal) include trace correlation
- CI/CD pipeline includes automated security scanning

## [1.0.0] - 2026-06-05

### Added
- Initial release of UFPB Diárias Wizard
- FastAPI backend with document generation (DOCX/PDF)
- React 19 frontend with wizard interface
- Docker multi-stage build with hardened security
- Redis rate limiting
- Security headers middleware (CSP, HSTS, X-Frame)
- File upload validation (magic bytes, path traversal protection)
- Draft auto-save with encryption (AES-GCM)
- Accessibility panel (WCAG 2.1 AA / e-MAG compliance)
- Chatbot assistant ("Dira") with state machine
- Document import (PDF/DOCX extraction)
