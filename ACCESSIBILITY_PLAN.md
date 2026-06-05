# Plano de Conformidade de Acessibilidade

**Data**: 2026-06-04  
**Status**: Em Execução  
**Lei Base**: Lei nº 13.146/2015 (Lei Brasileira de Inclusão)  
**Padrões**: WCAG 2.1 AA, eMAG 3.1, ABNT NBR 15599

---

## 📊 Métricas Iniciais

| Métrica | Antes | Alvo |
|---------|-------|------|
| Lei de Inclusão | 60% | 95% |
| WCAG 2.1 Level A | 70% | 100% |
| WCAG 2.1 Level AA | 40% | 90% |
| eMAG 3.1 | 55% | 95% |

---

## 🎯 Fases de Implementação

### FASE 1: Infraestrutura Básica (Crítica - 2-3 horas)

#### 1.1 Associação de Labels com Inputs
**Arquivo**: `frontend/src/components/ui/form-field.tsx`
- [ ] Adicionar ID único gerado no FormField
- [ ] Passar htmlFor para Label
- [ ] Adicionar aria-describedby para erros
- [ ] Adicionar aria-required para campos obrigatórios

**Impacto**: WCAG 1.3.1 Info and Relationships - CRÍTICO

#### 1.2 Melhorar Input Component
**Arquivo**: `frontend/src/components/ui/input.tsx`
- [ ] Suporte a aria-describedby
- [ ] Suporte a aria-invalid quando há erro
- [ ] Melhorar focus ring visibilidade
- [ ] Adicionar suporte a aria-label para inputs sem label

**Impacto**: WCAG 2.4.7 Focus Visible

#### 1.3 Melhorar Select Component
**Arquivo**: `frontend/src/components/ui/select.tsx`
- [ ] Suporte a aria-describedby
- [ ] Suporte a aria-invalid
- [ ] Melhorar appearence para leitores de tela

#### 1.4 Criar/Melhorar Textarea
**Arquivo**: `frontend/src/components/ui/textarea.tsx`
- [ ] Garantir aria-describedby
- [ ] aria-invalid support
- [ ] Focus ring improvement

---

### FASE 2: Componentes Complexos (Alta - 2-3 horas)

#### 2.1 Modal Accessibility
**Arquivo**: `frontend/src/components/ui/modal.tsx`
- [ ] Implementar role="dialog" e aria-modal="true"
- [ ] Adicionar aria-labelledby e aria-describedby
- [ ] Implementar focus trap (capturar foco dentro modal)
- [ ] Implementar return focus ao fechar
- [ ] Suportar Escape para fechar
- [ ] Adicionar inert ao body enquanto modal aberto

**Impacto**: WCAG 2.4.3 Focus Order - CRÍTICO

#### 2.2 WizardStepper ARIA
**Arquivo**: `frontend/src/components/wizard/WizardStepper.tsx`
- [ ] Adicionar role="group" ou role="tablist"
- [ ] Adicionar aria-current="step" ao step ativo
- [ ] Adicionar aria-label descritivo em cada step
- [ ] Adicionar aria-label ao progress bar
- [ ] Adicionar aria-live para atualizações de progresso

**Impacto**: WCAG 4.1.3 Status Messages

#### 2.3 WizardNavigation Buttons
**Arquivo**: `frontend/src/components/wizard/WizardNavigation.tsx`
- [ ] Garantir aria-labels descritivos
- [ ] Adicionar disabled state
- [ ] Adicionar aria-describedby para mensagens de erro

---

### FASE 3: Componentes de Formulário (Média - 2 horas)

#### 3.1 ChatModal
**Arquivo**: `frontend/src/features/chat/components/ChatModal.tsx`
- [ ] Adicionar aria-live="polite" para mensagens de chat
- [ ] Adicionar aria-label em inputs
- [ ] Adicionar role="region" para área de chat
- [ ] Garantir sequência correta de tab order

#### 3.2 Validation Error Modals
**Arquivo**: `frontend/src/components/ui/modal.tsx` (ValidationErrorsModal)
- [ ] Adicionar role="alertdialog" ao invés de dialog
- [ ] Adicionar aria-live="assertive"
- [ ] Garantir focus no fechar modal
- [ ] Lista de erros com markup acessível

**Impacto**: WCAG 3.3.4 Error Prevention (Critical)

---

### FASE 4: Navegação e Header (Média - 1.5 horas)

#### 4.1 Topbar Accessibility
**Arquivo**: `frontend/src/components/layout/Topbar.tsx`
- [ ] Adicionar aria-label em botões com ícones apenas
- [ ] Melhorar SegmentedControl com aria-pressed
- [ ] Garantir contraste em todos os estados
- [ ] Adicionar landmark role se necessário

#### 4.2 Skip to Content Link
**Arquivo**: `frontend/src/App.tsx`
- [ ] Verificar visibilidade ao receber foco
- [ ] Garantir contrast adequado
- [ ] Testar navegação

---

### FASE 5: Testes e Validação (Media - 2 horas)

#### 5.1 Testes de Leitor de Tela
- [ ] Testar com NVDA (Windows)
- [ ] Testar estrutura de headers
- [ ] Testar navegação por teclado
- [ ] Testar anúncio de erros

#### 5.2 Validação Automática
- [ ] Setup axe-core para CI
- [ ] Setup pa11y para testes
- [ ] Criar script de validação

#### 5.3 Teste de Contraste
- [ ] Validar todos os texto/background
- [ ] Validar estados hover/focus
- [ ] Validar modo dark/light
- [ ] Validar modo alto contraste

---

### FASE 6: Documentação (Leve - 1 hora)

#### 6.1 Documentação de Acessibilidade
- [ ] Criar ACCESSIBILITY.md
- [ ] Documentar padrões ARIA do projeto
- [ ] Criar checklist para PRs
- [ ] Adicionar exemplos de componentes acessíveis

#### 6.2 Treinamento para Time
- [ ] Criar guia de desenvolvimento acessível
- [ ] Documentar pitfalls comuns
- [ ] Adicionar exemplos de boas práticas

---

## 📋 Checkpoints Críticos

### Checkpoint 1: Label Association (BLOQUEANTE)
Todos os inputs DEVEM ter labels associados via htmlFor/id

### Checkpoint 2: Modal Focus Management (BLOQUEANTE)
Modal DEVE capturar e retornar foco adequadamente

### Checkpoint 3: ARIA em Erros (BLOQUEANTE)
Erros DEVEM ser anunciados por leitores de tela

### Checkpoint 4: Keyboard Navigation
Todos os componentes DEVEM ser acessíveis por teclado

---

## ⏱️ Estimativa Total

- **Fase 1**: ~3 horas
- **Fase 2**: ~3 horas
- **Fase 3**: ~2 horas
- **Fase 4**: ~1.5 horas
- **Fase 5**: ~2 horas
- **Fase 6**: ~1 hora

**Total**: ~12.5 horas

---

## 🎯 Resultado Esperado

Após todas as implementações:
- ✅ Lei de Inclusão: 95%
- ✅ WCAG 2.1 Level A: 100%
- ✅ WCAG 2.1 Level AA: 90%
- ✅ eMAG 3.1: 95%
- ✅ Pronto para publicação em portal governamental

---

## 📝 Notas

- Todas as mudanças preservam retrocompatibilidade
- Nenhuma mudança em API de componentes
- Testes manuais com leitores de tela são essenciais
- Setup de CI/CD para acessibilidade é recomendado
