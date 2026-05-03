# Forms On: Documentação de Segurança, Tecnologia e Conformidade Legal

> **Documento de referência para gestores, servidores públicos e auditores que não possuem formação em Tecnologia da Informação.**
>
> *Versão: maio de 2026*

---

## 1. Resumo Executivo

O **Forms On** é um sistema web desenvolvido para automatizar o preenchimento de formulários de solicitação de diárias e passagens da Universidade Federal da Paraíba (UFPB), especificamente para os Centros de Ciências Humanas, Sociais e Agrárias (CCHSA) e o Campus de Areia (CAVN). Em vez de preencher manualmente documentos em editores de texto — processo que demanda horas, está sujeito a erros de digitação e exige conhecimento de normas internas — o usuário responde a um assistente digital (semelhante a um "chat" inteligente) e o sistema gera automaticamente os documentos oficiais nos formatos DOCX e PDF.

Este documento explica, em linguagem acessível, como o sistema funciona, quais tecnologias o sustentam, como ele protege os dados dos servidores e usuários, e quais normas jurídicas brasileiras e padrões internacionais de segurança da informação são observados.

---

## 2. O que o sistema faz: do papel ao digital

### 2.1. O problema antes do Forms On

Servidores públicos e pesquisadores da UFPB que precisam viajar a trabalho devem preencher dois documentos oficiais:

1. **Anexo I — Requisição de Diárias e/ou Passagens**: solicitação prévia da viagem, com dados pessoais, objetivo, trechos de ida e volta, datas e meio de transporte.
2. **Anexo II — Relatório de Viagem**: prestação de contas após a viagem, descrevendo atividades realizadas, alterações de passagem, comprovantes e justificativas.

Anteriormente, esses documentos eram preenchidos manualmente em editores de texto (como Microsoft Word ou LibreOffice), copiando dados de formulários anteriores, corrigindo datas e formatos, e revisando ortografia. O processo era demorado, propenso a erros e exigia que o servidor soubesse detalhes normativos (prazos de antecedência, justificativas obrigatórias para viagens em finais de semana, entre outros).

### 2.2. A solução: um assistente virtual para documentos oficiais

O Forms On transforma esse processo em uma conversa guiada:

1. O usuário acessa o sistema pelo navegador (como se fosse um site comum).
2. Um assistente ("wizard") faz perguntas passo a passo: nome, CPF, datas da viagem, origem, destino, motivo da missão.
3. O sistema valida automaticamente as respostas: se a data de retorno é anterior à ida, alerta; se a solicitação está fora do prazo legal, solicita justificativa; se o campo CPF não tem 11 dígitos, impede o avanço.
4. Ao final, com um clique, o sistema gera o documento oficial pronto para assinatura, nos formatos DOCX (editável) ou PDF (imutável).

### 2.3. Importação inteligente: reaproveitamento de dados

Se o usuário já possui um Anexo I preenchido anteriormente (em PDF ou DOCX), o sistema consegue **ler o documento** e extrair automaticamente os dados pessoais (nome, CPF, SIAPE, banco, agência, conta), trechos de viagem e datas. Isso elimina a necessidade de redigitar informações repetitivas. Essa funcionalidade é comparável à leitura de documentos que contadores e advogados fazem manualmente, mas realizada pelo computador em segundos.

---

## 3. Tecnologias utilizadas: como o sistema funciona "por dentro"

Para entender como o Forms On funciona, imagine uma lanchonete com cozinha (onde a comida é preparada), balcão (onde o cliente faz o pedido) e entrega (onde o pedido chega à mesa). O sistema segue uma arquitetura semelhante:

### 3.1. A cozinha: Python e FastAPI (backend)

O **backend** é a parte do sistema que o usuário não vê, mas que executa todas as operações. Ele foi construído em **Python** (linguagem de programação muito usada em ciência e automação) com o framework **FastAPI**, que é especializado em criar sistemas web rápidos e seguros.

Funções do backend:
- Receber os dados preenchidos pelo usuário.
- Validar se os dados estão corretos (CPF válido, datas coerentes, campos obrigatórios preenchidos).
- Ler documentos PDF e DOCX enviados pelo usuário (usando bibliotecas como `pdfplumber` e `python-docx`).
- Gerar novos documentos DOCX a partir de modelos (templates) previamente formatados.
- Converter DOCX para PDF usando o LibreOffice (suite de escritório livre) em modo automático.
- Salvar rascunhos ("drafts") temporários, permitindo que o usuário continue o preenchimento depois.

### 3.2. O balcão: React e TypeScript (frontend)

O **frontend** é a parte que o usuário vê e interage: as telas, botões, campos de texto e o assistente de conversa. Foi construído em **React** (biblioteca de interface criada pelo Facebook/Meta) com **TypeScript** (uma versão do JavaScript que previne erros de digitação no código).

Funções do frontend:
- Exibir o assistente de perguntas de forma amigável.
- Validar dados em tempo real (ex.: ao digitar o CPF, a interface mostra se está correto).
- Salvar dados localmente no navegador, de forma criptografada, para que o usuário não perca o progresso se fechar a aba.
- Enviar os dados para o backend e receber o documento gerado para download.

### 3.3. A entrega: Docker e nginx (infraestrutura)

- **Docker** é uma tecnologia que "empacota" o sistema em um container (uma caixa isolada), garantindo que ele funcione da mesma forma em qualquer computador — seja no computador do desenvolvedor, seja no servidor da universidade. Isso evita o famoso problema "funciona na minha máquina, mas não no servidor".
- **nginx** é um software de proxy reverso (uma espécie de porteiro digital). Ele recebe as requisições da internet, verifica se são seguras (via HTTPS), e encaminha para o sistema interno. Ele também bloqueia acessos diretos às portas internas.

---

## 4. Facilidade de geração de documentos: uma experiência próxima a um agente de inteligência artificial

### 4.1. O conceito de "agente de IA"

Na computação moderna, um **agente de inteligência artificial** é um programa que percebe o ambiente, toma decisões e executa ações de forma autônoma para atingir um objetivo. Em termos simples: é como um assistente virtual que entende o que você precisa, faz perguntas inteligentes, corrige seus erros e entrega um resultado pronto.

O Forms On se aproxima desse comportamento em vários aspectos:

| Característica de um agente de IA | Como o Forms On implementa |
|---|---|
| **Percepção do ambiente** | Detecta automaticamente se a solicitação está fora do prazo legal, se cai em fim de semana, se há inconsistências nas datas. |
| **Tomada de decisão** | Decide quais justificativas são obrigatórias com base nas respostas do usuário. |
| **Interação em linguagem natural** | Embora não use um chatbot de linguagem natural (como o ChatGPT), o assistente faz perguntas sequenciais, contextualiza respostas anteriores e adapta o fluxo. |
| **Aprendizado e adaptação** | Ao importar um documento anterior, o sistema "aprende" os dados do usuário e os reaplica no novo formulário. |
| **Execução autônoma** | Gera o documento final, aplica formatação profissional, substitui placeholders (campos dinâmicos) e converte para PDF sem intervenção humana. |

### 4.2. Comparativo: processo manual vs. Forms On

| Etapa | Processo Manual | Forms On |
|---|---|---|
| Preencher dados pessoais | Digitar nome, CPF, banco, etc. | Importa do documento anterior ou preenche uma vez |
| Calcular prazos | Consultar normas e contar dias na mão | Calcula automaticamente e alerta |
| Verificar inconsistências | Revisar manualmente datas e cidades | Valida em tempo real e bloqueia erros |
| Formatar documento | Ajustar tabelas, fontes e espaçamentos | Formato profissional aplicado automaticamente |
| Converter para PDF | Abrir editor, exportar, salvar | Um clique gera DOCX e PDF |
| **Tempo total** | **30 minutos a 2 horas** | **5 a 10 minutos** |

### 4.3. O que ainda não é IA (e por que isso é uma vantagem)

O Forms On não utiliza modelos de linguagem generativos (como GPT-4, Claude ou Gemini). Isso é intencional e traz vantagens:

1. **Determinismo**: o resultado é sempre previsível e auditable. Um sistema de IA generativa pode "alucinar" e inventar dados; o Forms On segue regras rígidas.
2. **Privacidade**: os dados não são enviados para servidores externos de IA (como OpenAI, Google ou Anthropic). Tudo processado internamente na UFPB.
3. **Conformidade legal**: em processos administrativos públicos, é obrigatório que o sistema seja transparente e auditável. IA generativa "caixa-preta" não atende a esse requisito.
4. **Custo zero de API**: não há cobrança por tokens de processamento de linguagem.

---

## 5. Segurança da informação: como os dados são protegidos

### 5.1. Princípios gerais

A segurança do Forms On foi projetada seguindo três princípios fundamentais da segurança da informação (confidencialidade, integridade e disponibilidade), conforme a **ISO/IEC 27001** (ABNT NBR ISO/IEC 27001:2022) e a **Lei 14.129/2021** (Estatuto da Segurança Cibernética):

- **Confidencialidade**: apenas quem deve acessar os dados, acessa.
- **Integridade**: os dados não podem ser alterados por pessoas não autorizadas.
- **Disponibilidade**: o sistema deve estar acessível quando necessário.

### 5.2. Camadas de proteção implementadas

#### 5.2.1. Firewall de rede (UFW) e proxy reverso (nginx)

O sistema não está exposto diretamente à internet. Um firewall (UFW — Uncomplicated Firewall) bloqueia todas as portas, exceto:
- Porta 22: acesso administrativo seguro (SSH).
- Porta 80: redirecionamento automático para HTTPS.
- Porta 443: acesso seguro criptografado (HTTPS).

O nginx atua como "porteiro": recebe as conexões externas, termina o SSL/TLS (criptografia), e encaminha apenas para o sistema interno. Isso impede que atacantes acessem diretamente o banco de dados ou o código-fonte.

#### 5.2.2. Criptografia em trânsito (TLS/SSL)

Toda comunicação entre o navegador do usuário e o servidor é criptografada via **HTTPS** (TLS 1.2 ou superior), usando certificados emitidos pelo **Let's Encrypt** (Autoridade Certificadora gratuita reconhecida internacionalmente). Isso impede que terceiros interceptem dados pessoais (CPF, SIAPE, dados bancários) durante a transmissão.

> **Referência legal**: Art. 46 da **Lei nº 13.709/2018** (LGPD) exige "o uso de técnicas de criptografia" para proteção de dados pessoais em trânsito.

#### 5.2.3. Headers de segurança HTTP

O sistema envia instruções ao navegador do usuário para reforçar a segurança:

- **Content-Security-Policy (CSP)**: impede que scripts maliciosos de outros sites sejam executados.
- **X-Frame-Options: DENY**: impede que o site seja embarcado em iframes fraudulentos (ataque de clickjacking).
- **X-Content-Type-Options: nosniff**: impede que o navegador "adivinhe" o tipo de arquivo, evitando execução de arquivos maliciosos.
- **Strict-Transport-Security (HSTS)**: força o navegador a sempre usar HTTPS, mesmo que o usuário digite "http://".
- **Permissions-Policy**: desativa recursos do navegador desnecessários (câmera, microfone, geolocalização), reduzindo a superfície de ataque.

#### 5.2.4. Proteção contra Path Traversal (travessia de diretórios)

Esta é uma vulnerabilidade crítica em que um atacante tenta acessar arquivos do sistema operacional (como `/etc/passwd`) manipulando a URL. O Forms On implementa três camadas de defesa:

1. O nginx rejeita URLs com sequências de escape (`%2e%2e`) antes mesmo de encaminhar ao sistema.
2. O código-fonte sanitiza todo path, rejeitando qualquer requisição que contenha `..`.
3. Uma verificação de `is_safe_path` garante que o arquivo solicitado está fisicamente dentro da pasta permitida.

#### 5.2.5. Validação estruturada de dados (jsonschema)

Todos os dados enviados pelos usuários passam por validação rigorosa contra schemas JSON formais. Isso significa que:
- Campos desconhecidos são rejeitados (evita injeção de dados maliciosos).
- O CPF deve ter exatamente 11 dígitos.
- O email deve ter formato válido.
- Textos têm limites de tamanho (evita ataques de negação de serviço — DoS).
- Datas devem seguir o padrão ISO 8601.

> **Referência técnica**: Essa prática alinha-se com o **OWASP Top 10 2021**, categoria A03:2021 — *Injection* e A05:2021 — *Security Misconfiguration*.

#### 5.2.6. Proteção de uploads de arquivos

Quando o usuário envia um PDF ou DOCX para importação, o sistema valida:
- **Extensão do arquivo**: apenas `.pdf`, `.docx` e `.doc` são aceitos.
- **Magic bytes (assinatura do arquivo)**: verifica se o conteúdo binário corresponde ao formato declarado. Um arquivo `.exe` renomeado para `.pdf` é rejeitado.
- **Tamanho máximo**: 5 MB.
- **Sanitização do nome do arquivo**: remove caracteres de travessia de diretório.

> **Referência técnica**: Alinhado ao **OWASP Top 10 2021**, A01:2021 — *Broken Access Control*.

#### 5.2.7. Rate Limiting (limitação de taxa de requisições)

Para evitar que um atacante sobrecarregue o sistema com milhares de requisições (ataque DDoS), o sistema limita quantas requisições cada IP pode fazer por minuto. Além disso, o rate limiter possui proteção contra "memory leak" (vazamento de memória), limpando automaticamente registros antigos.

#### 5.2.8. Containerização segura (Docker)

O sistema roda dentro de um container Docker com as seguintes restrições de segurança:
- **Usuário não-root**: o processo não executa como administrador.
- **Filesystem somente leitura (read_only)**: impede que o sistema seja modificado em tempo de execução.
- **No-new-privileges**: impede que processos escalem privilégios.
- **Drop de capabilities**: remove permissões desnecessárias do kernel Linux.
- **Bind em localhost**: a aplicação só aceita conexões vindas do próprio servidor (via nginx), nunca diretamente da internet.
- **Limites de recursos (cgroups)**: CPU e memória limitados, evitando que um processo consuma todos os recursos do servidor.

> **Referência técnica**: Alinhado à **NIST Cybersecurity Framework** (Função *Protect* — PR.IP-1) e à **ISO/IEC 27002:2022** (Controle 8.24 — *Use of Cryptography*; 8.28 — *Secure Coding*).

#### 5.2.9. Criptografia local no navegador

O sistema utiliza a **Web Crypto API** (padrão nativo dos navegadores modernos) para criptografar os rascunhos armazenados no `localStorage` do navegador. A chave de criptografia é gerada automaticamente no dispositivo do usuário e nunca transmitida ao servidor. Isso garante que, mesmo que alguém tenha acesso físico ao computador, não consiga ler os dados dos formulários sem a chave.

Algoritmo utilizado: **AES-GCM-256**, reconhecido pelo **NIST** como padrão de criptografia simétrica de alto nível de segurança.

> **Referência legal**: Art. 7º, inciso VIII, da **Lei nº 13.709/2018** (LGPD) consagra o "uso de técnicas de criptografia" como medida técnica de proteção a dados pessoais.

---

## 6. Normas e legislações observadas

### 6.1. Normas brasileiras

#### Lei nº 13.709/2018 — Lei Geral de Proteção de Dados (LGPD)
A LGPD estabelece regras para coleta, armazenamento, tratamento e compartilhamento de dados pessoais no Brasil. O Forms On observa os seguintes princípios da LGPD:

- **Finalidade** (art. 6º, I): os dados são coletados apenas para o propósito de geração dos documentos oficiais de diárias.
- **Adequação** (art. 6º, II): o tratamento é compatível com as finalidades informadas ao usuário.
- **Necessidade** (art. 6º, III): apenas dados estritamente necessários são solicitados.
- **Segurança** (art. 6º, VII; art. 46): adoção de medidas técnicas (criptografia, validação, firewall) para proteger os dados.
- **Prevenção** (art. 6º, VIII): implementação de headers de segurança e validação de inputs para prevenir vazamentos.

#### Lei nº 14.129/2021 — Estatuto da Segurança Cibernética
Institui princípios, diretrizes e medidas para a segurança cibernética no Brasil. O Forms On implementa:
- Gestão de vulnerabilidades (auditoria periódica de código).
- Proteção de infraestrutura crítica (hardening de Docker, firewall, proxy reverso).
- Monitoramento de logs e rate limiting para detecção de anomalias.

#### Lei nº 8.112/1990 — Regime Jurídico dos Servidores Públicos Civis
Base legal para o pagamento de diárias e passagens. O Forms On implementa as regras desta lei (e respectivas portarias) nos cálculos automáticos de prazo:
- **10 dias** de antecedência para solicitações sem passagens.
- **30 dias** de antecedência para solicitações com passagens.
- **5 dias** após o retorno para prestação de contas (Anexo II).

#### Lei nº 14.133/2021 — Lei de Licitações e Contratos Administrativos
Embora não trate diretamente de diárias, estabelece princípios de transparência e eficiência que justificam a adoção de sistemas automatizados na administração pública.

#### IN SLTI/MPOG nº 01/2010 — Segurança da Informação
Instrução Normativa do antigo Ministério do Planejamento (atual MGI) que estabelece diretrizes para segurança da informação em órgãos da administração pública federal. O Forms On observa:
- Controle de acesso (apenas via HTTPS).
- Proteção contra código malicioso (validação de uploads).
- Continuidade de negócio ( Docker com healthchecks).

### 6.2. Normas e padrões internacionais

#### ISO/IEC 27001:2022 — Sistemas de Gestão de Segurança da Informação
Padrão internacional para gestão de segurança da informação. O Forms On implementa controles alinhados aos Anexos A da ISO 27001:2022:
- **A.5.1** — Políticas de segurança da informação (headers HTTP, CSP).
- **A.5.7** — Proteção contra ameaças (rate limiting, path traversal protection).
- **A.5.9** — Inventário de ativos de informação (schemas de validação).
- **A.5.12** — Proteção da informação (criptografia AES-GCM, HTTPS/TLS).
- **A.5.14** — Transferência de informação (HSTS, TLS 1.2+).
- **A.5.24** — Segurança do desenvolvimento (validação de inputs, sanitização).
- **A.5.28** — Codificação segura (OWASP guidelines, jsonschema).

#### ISO/IEC 27002:2022 — Código de Prática para Controles de Segurança da Informação
Guia de boas práticas que detalha os controles da ISO 27001. O Forms On observa:
- **Controle 5.7** — Proteção contra malware (magic bytes, validação de uploads).
- **Controle 5.9** — Inventário de ativos (validação estruturada de dados).
- **Controle 5.12** — Criptografia (AES-GCM-256, TLS 1.2+).
- **Controle 5.28** — Codificação segura (sanitização de paths, schemas).

#### OWASP Top 10 (2021)
Projeto Open Web Application Security Project, referência mundial em segurança de aplicações web. O Forms On mitiga:
- **A01:2021 — Broken Access Control** (path traversal fix, bind localhost).
- **A03:2021 — Injection** (jsonschema validation, sanitized inputs).
- **A05:2021 — Security Misconfiguration** (headers HTTP, Docker hardening).
- **A07:2021 — Identification and Authentication Failures** (rate limiting).
- **A09:2021 — Security Logging and Monitoring Failures** (rate limiter com tracking de IP).

#### NIST Cybersecurity Framework (CSF) 1.1/2.0
Framework do Instituto Nacional de Padrões e Tecnologia dos EUA, adotado globalmente:
- **Função PROTECT (PR)**: PR.AC (controle de acesso), PR.DS (proteção de dados), PR.IP (proteção de processos), PR.MA (manutenção).
- **Função DETECT (DE)**: DE.AE (anomalias detectadas via rate limiting).
- **Função RESPOND (RS)**: RS.AN (análise de incidentes via logs).

---

## 7. Considerações finais

O Forms On não é apenas uma ferramenta de produtividade: é um exemplo de como a tecnologia pode ser aplicada à administração pública de forma **segura, transparente e alinhada às normas jurídicas**. Ao automatizar processos repetitivos, reduz erros humanos, acelera tramitações e libera servidores para atividades de maior valor agregado.

A arquitetura do sistema privilegia a **privacidade por design** (privacy by design), princípio consagrado pela LGPD e pela ISO 27001: os dados são processados localmente, criptografados no navegador, transmitidos de forma segura e nunca compartilhados com serviços de IA de terceiros.

Para auditorias, fiscalizações ou requisições de acesso à informação (Lei nº 12.527/2011), o sistema oferece total rastreabilidade: código-fonte aberto, logs de acesso, schemas de validação documentados e infraestrutura protegida por múltiplas camadas de segurança.

---

## Referências

ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **NBR ISO/IEC 27001:2022** — Tecnologia da informação — Técnicas de segurança — Sistemas de gestão de segurança da informação — Requisitos. Rio de Janeiro: ABNT, 2022.

ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **NBR ISO/IEC 27002:2022** — Tecnologia da informação — Técnicas de segurança — Código de prática para controles de segurança da informação. Rio de Janeiro: ABNT, 2022.

BRASIL. **Lei nº 8.112, de 11 de dezembro de 1990**. Dispõe sobre o regime jurídico dos servidores públicos civis da União, das autarquias e das fundações públicas federais. Diário Oficial da União, Brasília, DF, 12 dez. 1990.

BRASIL. **Lei nº 12.527, de 18 de novembro de 2011**. Regula o acesso a informações previsto no inciso XXXIII do art. 5º, no inciso II do § 3º do art. 37 e no § 2º do art. 216 da Constituição Federal. Diário Oficial da União, Brasília, DF, 19 nov. 2011.

BRASIL. **Lei nº 13.709, de 14 de agosto de 2018**. Lei Geral de Proteção de Dados Pessoais (LGPD). Diário Oficial da União, Brasília, DF, 15 ago. 2018.

BRASIL. **Lei nº 14.129, de 29 de março de 2021**. Estatuto da Segurança Cibernética. Diário Oficial da União, Brasília, DF, 30 mar. 2021.

BRASIL. **Lei nº 14.133, de 1º de abril de 2021**. Lei de Licitações e Contratos Administrativos. Diário Oficial da União, Brasília, DF, 2 abr. 2021.

BRASIL. Ministério do Planejamento, Orçamento e Gestão. **Instrução Normativa SLTI/MPOG nº 01, de 19 de fevereiro de 2010**. Dispõe sobre as diretrizes para o desenvolvimento, aquisição e manutenção de sistemas de informação do Governo Federal. Diário Oficial da União, Brasília, DF, 22 fev. 2010.

NATIONAL INSTITUTE OF STANDARDS AND TECHNOLOGY. **Cybersecurity Framework Version 1.1**. Gaithersburg: NIST, 2018. Disponível em: <https://www.nist.gov/cyberframework>. Acesso em: 3 maio 2026.

NATIONAL INSTITUTE OF STANDARDS AND TECHNOLOGY. **FIPS 197: Advanced Encryption Standard (AES)**. Gaithersburg: NIST, 2001. Disponível em: <https://csrc.nist.gov/publications/detail/fips/197/final>. Acesso em: 3 maio 2026.

NATIONAL INSTITUTE OF STANDARDS AND TECHNOLOGY. **SP 800-38D: Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC**. Gaithersburg: NIST, 2007. Disponível em: <https://csrc.nist.gov/publications/detail/sp/800-38d/final>. Acesso em: 3 maio 2026.

OPEN WEB APPLICATION SECURITY PROJECT. **OWASP Top 10:2021**. OWASP Foundation, 2021. Disponível em: <https://owasp.org/Top10/>. Acesso em: 3 maio 2026.

SCHNEIER, B. **Applied Cryptography: Protocols, Algorithms, and Source Code in C**. 2. ed. New York: John Wiley & Sons, 1996.

STALLINGS, W. **Cryptography and Network Security: Principles and Practice**. 8. ed. Boston: Pearson, 2020.

W3C. **Web Cryptography API**. W3C Recommendation, 17 jan. 2017. Disponível em: <https://www.w3.org/TR/WebCryptoAPI/>. Acesso em: 3 maio 2026.

---

*Documento elaborado em maio de 2026 pelo time de desenvolvimento do Forms On — UFPB/CCHSA/CAVN.*
