# ===== Stage 1: Build do frontend React =====
FROM node:22-slim AS frontend-builder

WORKDIR /app/frontend
COPY ./frontend/package*.json ./
RUN npm ci

COPY ./frontend ./
RUN npm run build

# ===== Stage 2: Backend Python =====
FROM python:3.12-slim

# LibreOffice para converter DOCX->PDF e opcionalmente DOC->DOCX
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-common \
    fonts-dejavu-core \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia o backend
COPY ./app /app/app
COPY ./README.md /app/README.md

# Copia o build do frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    python-multipart \
    pydantic \
    jsonschema \
    python-docx \
    pdfplumber \
    requests

EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
