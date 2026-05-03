# ===== Stage 1: Build do frontend React =====
FROM node:22-slim AS frontend-builder

WORKDIR /app/frontend
COPY ./frontend/package*.json ./
RUN npm ci

COPY ./frontend ./
RUN npm run build

# ===== Stage 2: Backend Python =====
FROM python:3.12-slim

# Instala dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-common \
    fonts-dejavu-core \
    fonts-liberation \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Cria usuário não-root
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

# Copia o backend
COPY ./app /app/app
COPY ./README.md /app/README.md

# Copia o build do frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Instala dependências Python
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    python-multipart \
    pydantic \
    jsonschema \
    python-docx \
    pdfplumber \
    requests

# Cria diretórios necessários e ajusta permissões
RUN mkdir -p /app/data /tmp && \
    chown -R appuser:appgroup /app && \
    chmod 755 /app/data

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
