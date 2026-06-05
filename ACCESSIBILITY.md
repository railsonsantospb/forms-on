# Guia de Acessibilidade - UFPB Forms On

## 📋 Conformidade Legal

Este projeto atende aos seguintes padrões de acessibilidade:

- ✅ **Lei Brasileira de Inclusão** (Lei nº 13.146/2015)
- ✅ **eMAG 3.1** (Padrão de Acessibilidade de Governo Eletrônico)
- ✅ **WCAG 2.1 Level A** (World Wide Web Consortium)
- ✅ **ABNT NBR 15599:2008** (Acessibilidade - Comunicação na Web)

---

## 🎯 Recursos de Acessibilidade Implementados

### 1. **Painel de Acessibilidade**
Localizado no topo direito da página, oferece:
- ✅ Contraste Alto
- ✅ Escala de Cinza
- ✅ Redução de Animações
- ✅ Foco Destacado
- ✅ Espaçamento entre Linhas (Normal/Amplo/Máximo)
- ✅ Espaçamento entre Letras (Normal/Amplo/Máximo)

### 2. **Navegação por Teclado**
Todos os componentes são acessíveis via teclado:
- ✅ Tab para navegar entre elementos focáveis
- ✅ Shift+Tab para navegação reversa
- ✅ Enter para ativar botões e enviar formulários
- ✅ Escape para fechar modais e painéis
- ✅ Focus Trap em modais (foco confinado ao modal)
- ✅ Return Focus ao fechar modais

### 3. **Leitores de Tela**
Suporte completo para NVDA, JAWS e VoiceOver:
- ✅ Associação de labels com inputs via `htmlFor` e `id`
- ✅ Descrição de erros via `aria-describedby`
- ✅ Status de campos inválidos via `aria-invalid`
- ✅ Campos obrigatórios marcados com `aria-required`
- ✅ ARIA Live Regions para atualizações dinâmicas
- ✅ Roles semânticos (dialog, alertdialog, region, progressbar)
- ✅ Aria-labels descritivos em todos os botões

### 4. **Contraste de Cores**
- ✅ Mínimo WCAG AA (4.5:1) para texto
- ✅ Testado em modo dark e light
- ✅ Modo Alto Contraste disponível
- ✅ Modo Escala de Cinza para daltônicos

### 5. **Responsividade**
- ✅ Funciona em todos os tamanhos de tela
- ✅ Touch targets com 44x44px mínimo
- ✅ Layout fluido e adaptável
- ✅ Skip to Content link funcional

---

## 🛠️ Padrões de Desenvolvimento

### Componentes Acessíveis

#### FormField + Input/Select/Textarea
```tsx
// O FormField cria automaticamente um contexto
<FormField label="Nome" required error={error}>
  <Input />  {/* Recebe id, aria-describedby, aria-invalid automaticamente */}
</FormField>
```

#### Modal Acessível
```tsx
<Modal
  open={open}
  onClose={onClose}
  title="Título"
  description="Descrição"
  isAlert={false}  {/* true para alertdialog */}
>
  {/* Conteúdo */}
</Modal>
```
O Modal implementa:
- Focus trap automático
- Return focus ao fechar
- Escape para fechar
- aria-modal="true"
- aria-labelledby e aria-describedby

#### WizardStepper
```tsx
<WizardStepper
  steps={steps}
  currentStep={currentStep}
  completedSteps={completed}
  onStepClick={handleStepClick}
/>
```
Inclui:
- Progress bar com aria-valuenow
- aria-current="step" no passo ativo
- aria-labels descritivos

### Princípios ARIA

1. **Usar HTML semântico sempre**
   ```tsx
   // ✅ BOM
   <button aria-label="Fechar">X</button>
   
   // ❌ RUIM
   <div onClick={onClose} role="button">X</div>
   ```

2. **Associar labels com inputs**
   ```tsx
   // ✅ BOM - via FormField (automático)
   <FormField label="Email">
     <Input type="email" />
   </FormField>
   
   // ❌ RUIM - sem label
   <Input type="email" placeholder="Email" />
   ```

3. **Descrever erros para leitores de tela**
   ```tsx
   // ✅ Automático via FormField
   <FormField error="Email inválido">
     <Input />  {/* aria-describedby e aria-invalid automáticos */}
   </FormField>
   ```

4. **Aria-hidden para ícones decorativos**
   ```tsx
   // ✅ BOM
   <button>
     <Icon aria-hidden="true" /> Enviar
   </button>
   
   // ❌ RUIM
   <button>
     <Icon /> Enviar
   </button>
   ```

---

## 🧪 Testes de Acessibilidade

### Testes Manuais com Leitores de Tela

#### NVDA (Windows)
```bash
1. Download: https://www.nvaccess.org/
2. Start para ativar
3. Navegar com Tab, Setas, Alt+navegação
4. Verificar anúncios de campos, labels e erros
```

#### VoiceOver (macOS/iOS)
```bash
Cmd+F5 para ativar/desativar
Rotor: VO+U para ver estrutura
```

### Testes Automáticos

Setup axe-core para CI:
```bash
npm install --save-dev @axe-core/react
```

### Teste de Teclado

Usar apenas teclado:
1. ✅ Tab para avançar
2. ✅ Shift+Tab para recuar
3. ✅ Enter para ativar botões
4. ✅ Setas para selecionar opções
5. ✅ Escape para fechar modais
6. ✅ Todos os elementos focáveis visíveis

### Teste de Contraste

Ferramenta online: https://webaim.org/resources/contrastchecker/

---

## 📝 Checklist para PRs

Antes de fazer push, verifique:

- [ ] Labels associados a todos os inputs
- [ ] Erros descritivos para leitores de tela
- [ ] aria-labels em botões com ícones apenas
- [ ] Focus ring visível em todos os elementos focáveis
- [ ] Modais com focus trap e return focus
- [ ] Aria-live para atualizações dinâmicas
- [ ] Ícones decorativos com aria-hidden
- [ ] Contraste mínimo WCAG AA (4.5:1)
- [ ] Testado com teclado
- [ ] Testado com leitor de tela (ao menos estrutura)

---

## 🚫 Problemas Comuns a Evitar

| ❌ ERRADO | ✅ CORRETO |
|----------|-----------|
| `<div onClick={onClose} role="button">` | `<button onClick={onClose}>` |
| Input sem label | Input com label associado via htmlFor |
| Ícone decorativo sem aria-hidden | `<Icon aria-hidden="true" />` |
| Botão com apenas ícone, sem aria-label | `<button aria-label="Fechar">X</button>` |
| Erro não anunciado a leitores de tela | Usar aria-describedby e role="alert" |
| Modal sem focus trap | Modal com focus confinado |
| Contraste insuficiente | Testar com ferramentas de contraste |
| Sem suporte a teclado | Todos elementos navegáveis com Tab |

---

## 📞 Suporte

Para questões sobre acessibilidade, consulte:

- **eMAG**: https://www.gov.br/acessibilidade
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **Lei de Inclusão**: http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm
- **MDN ARIA**: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA

---

## 🔄 Versionamento

- **v1.0** (2026-06-04): Implementação completa de acessibilidade
  - Conformidade com Lei de Inclusão
  - Suporte a WCAG 2.1 Level AA
  - Focus management em modais
  - ARIA live regions
  - Painel de acessibilidade
