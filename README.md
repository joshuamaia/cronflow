# CronFlow — Visual Cron Scheduler

> Crie, visualize e simule expressões CRON no padrão **Spring Framework**, sem decorar a sintaxe.

![Angular](https://img.shields.io/badge/Angular-22-dd0031?logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)
![Material](https://img.shields.io/badge/Angular%20Material-M3%20dark-1976d2)
![Tests](https://img.shields.io/badge/testes-Vitest-6e9f18?logo=vitest)

O CronFlow é uma ferramenta para desenvolvedores que monta expressões CRON a partir de uma interface visual, explica cada expressão em português e simula as próximas execuções dentro de um período. Todo o processamento roda no navegador: não há backend, banco de dados nem chamadas a APIs.

---

## Sumário

- [Objetivo](#objetivo)
- [Funcionalidades](#funcionalidades)
- [Stack tecnológica](#stack-tecnológica)
- [Como instalar e executar](#como-instalar-e-executar)
- [Testes](#testes)
- [O padrão Spring CRON](#o-padrão-spring-cron)
- [Exemplos de expressões](#exemplos-de-expressões)
- [Como o simulador funciona](#como-o-simulador-funciona)
- [Web Workers, cancelamento e timeout](#web-workers-cancelamento-e-timeout)
- [Limites de processamento](#limites-de-processamento)
- [Arquitetura](#arquitetura)
- [Limitações do MVP](#limitações-do-mvp)

---

## Objetivo

Expressões como `0 0 9 * * MON-FRI` são fáceis de errar e difíceis de revisar. O CronFlow permite:

- montar agendamentos **sem conhecer a sintaxe CRON**;
- gerar automaticamente uma expressão **válida no padrão Spring (6 campos)**;
- ler a expressão em **português** ("Executar de segunda a sexta-feira às 09h");
- **simular** as próximas execuções em um período, com segurança, mesmo em cenários extremos (por exemplo, uma execução por segundo ao longo de 1.000 anos).

## Funcionalidades

| Área | O que faz |
|---|---|
| **Construtor visual** | Seis modalidades: diariamente, semanalmente, mensalmente, a cada X minutos, a cada X horas e a cada X segundos |
| **Configuração** | Hora, minuto e segundo; dias da semana (seleção múltipla); dia do mês (1–31); intervalos predefinidos |
| **Expressão CRON** | Gerada a cada alteração válida, em destaque e com legenda por campo. O botão **Copiar CRON** mostra a confirmação "Expressão copiada com sucesso." |
| **Interpretação** | Descrição em português derivada da própria expressão, por isso as duas sempre correspondem |
| **Validação** | Configurações inválidas não geram expressão, a cópia fica desabilitada e a mensagem do problema aparece |
| **Período de simulação** | Data inicial (hoje), data final (+30 dias) e quantidade de execuções (5, 10 ou 20; padrão 10), no fuso local exibido na tela |
| **Linha do tempo** | Número da execução, data, dia da semana e horário com segundos |
| **Estados explícitos** | Aguardando configuração · Calculando · Concluído · Sem execuções · Configuração inválida · Tempo excedido · Erro de processamento |
| **Exemplos** | Cinco exemplos prontos, incluindo um de alta frequência que mostra a interface responsiva |
| **Meus exemplos** | Crie quantos exemplos quiser, com nome, descrição opcional e agendamento. Eles ficam em uma lista para aplicar, editar ou excluir (com **Desfazer**), e a edição acontece em um modal com prévia da expressão. Ficam salvos no navegador (localStorage) |
| **Layout** | Tema escuro, duas colunas no desktop e coluna única no mobile, sem rolagem horizontal |

## Stack tecnológica

| Tecnologia | Uso |
|---|---|
| **Angular 22** | Standalone Components, Signals (`signal`, `computed`, `input`, `output`), detecção de mudanças zoneless e sintaxe `@if` / `@for` / `@switch` |
| **TypeScript** | `strict` e `strictTemplates` habilitados |
| **Reactive Forms** | Formulários tipados (`FormGroup<…>`) convertidos em Signals com `toSignal` |
| **Angular Material (M3)** | Selects, datepicker, snackbar, barra de progresso e ícones; tema escuro com paleta azul |
| **SCSS** | Design tokens em CSS custom properties |
| **Web Workers** | Simulação fora da thread principal |
| **[croner](https://github.com/Hexagon/croner)** | Cálculo incremental da próxima ocorrência (veja a [compatibilidade com o Spring](#compatibilidade-croner--spring)) |
| **RxJS** | Debounce e cancelamento (`switchMap`) das simulações |
| **Vitest** | Testes unitários pelo builder `@angular/build:unit-test` |

O projeto não usa backend, NgRx nem NgModules de funcionalidade. A única persistência é o localStorage do navegador, usado para os exemplos criados pelo usuário.

## Como instalar e executar

Pré-requisitos: **Node.js 20.19+** (recomendado 22 ou 24) e **npm 10+**.

```bash
# 1. Instalar as dependências
npm install

# 2. Iniciar o servidor de desenvolvimento (http://localhost:4200)
npm start

# 3. Gerar o build de produção (saída em dist/cronflow/browser)
npm run build
```

O build gera arquivos estáticos que podem ser servidos por qualquer servidor HTTP. As fontes (Inter, JetBrains Mono e Material Symbols) vêm do Google Fonts. Sem conexão, a interface continua funcionando com as fontes do sistema, mas os ícones não aparecem.

## Testes

```bash
npm test            # execução única
npm run test:watch  # modo observação
```

São **126 testes** em 9 arquivos:

| Suíte | Cobertura |
|---|---|
| `cron-generator.service.spec` | CRON diário, semanal, mensal e intervalos de segundos, minutos e horas; configurações inválidas; toda expressão gerada é aceita pelo parser em modo Spring |
| `cron-description.service.spec` | Todas as interpretações da especificação, listas, intervalos de dias e formatos não suportados |
| `cron-simulation.spec` | Próximas execuções, finais de semana, virada de mês e de ano, ano bissexto, dia 31, período sem ocorrências, limites inclusivos, limite de resultados, alta frequência, datas não suportadas e contrato de mensagens do Worker |
| `cron-worker-manager.service.spec` | Envio de parâmetros, retorno de resultados, erros estruturados, cancelamento, descarte de respostas obsoletas, timeout, reaproveitamento e liberação de Workers |
| `cron-simulator.service.spec` | Debounce, estado "calculando", troca de configuração durante o cálculo e timeout ponta a ponta |
| `simulation-period.spec` | Início e fim do dia, período invertido, limites suportados e parser `dd/mm/aaaa` |
| `saved-examples.service.spec` | Criação sem limite, persistência e recarga, edição, exclusão com desfazer, descarte de dados corrompidos e falha ou bloqueio do armazenamento |
| `example-editor-dialog.component.spec` | Modal: prévia ao vivo, validação de nome e agendamento e dados devolvidos ao salvar |
| `cron-builder.component.spec` | Integração: exemplos, renderização da timeline, validação na tela, período de 1.000 anos com 20 resultados e o fluxo completo de *Meus exemplos* (criar pelo modal, listar, aplicar, editar, excluir e desfazer) |

### Teste de desempenho

Usa `* * * * * *` em um período de **1.000 anos** (01/01/2000 a 31/12/2999, o máximo representável) com limite de **20**. Medir o tempo sozinho não prova que o cálculo é incremental, então o teste também verifica a estratégia:

- retorna exatamente 20 resultados, e são os 20 primeiros segundos do período;
- conta as consultas feitas à biblioteca: **20**, e não ~3,15 × 10¹⁰, que seria o número de segundos do período;
- compara 1 dia com 1.000 anos: o resultado, o número de consultas e o tamanho da coleção são **idênticos**, ou seja, o custo não cresce com o período;
- o tempo de execução entra só como verificação complementar.

Como o jsdom não executa Web Workers, os testes de concorrência usam um Worker falso (`src/testing/fake-simulation-worker.ts`) que roda a mesma função do Worker real. O Worker real foi verificado manualmente no navegador.

## O padrão Spring CRON

O Spring Framework (`@Scheduled(cron = "…")` / `CronExpression`) usa **seis campos**, com segundos:

```
┌───────────── segundo        (0–59)
│ ┌─────────── minuto         (0–59)
│ │ ┌───────── hora           (0–23)
│ │ │ ┌─────── dia do mês     (1–31)
│ │ │ │ ┌───── mês            (1–12 ou JAN–DEC)
│ │ │ │ │ ┌─── dia da semana  (0–7 ou SUN–SAT; 0 e 7 = domingo)
│ │ │ │ │ │
* * * * * *
```

Diferenças importantes em relação ao crontab do Linux:

- existe o campo de **segundos**, e por isso são 6 campos em vez de 5;
- quando dia do mês **e** dia da semana estão restritos, o Spring exige que **ambos** coincidam (AND). O cron clássico (Vixie) usa OR;
- `*/N` é **alinhado ao relógio**: `0 0 */2 * * *` executa às 00h, 02h, 04h…, e não a cada 2 horas contadas a partir da criação do agendamento;
- um dia do mês inexistente (ex.: 31 em abril) **não** gera execução naquele mês.

### Compatibilidade croner × Spring

Antes de implementar o simulador, verifiquei empiricamente o comportamento do croner 10 configurado com:

```ts
{ mode: '6-part', domAndDow: true, paused: true }
```

| Comportamento Spring | croner configurado |
|---|---|
| Exatamente 6 campos | `mode: '6-part'` rejeita padrões com 5 ou 7 campos |
| AND entre dia do mês e dia da semana | `domAndDow: true` |
| `0` e `7` = domingo; nomes `MON-FRI`, listas `SUN,SAT` | suportado |
| `*/N` alinhado ao relógio | mesmo comportamento |
| Dia 31 / 29 de fevereiro inexistentes são pulados | mesmo comportamento |
| Próxima ocorrência **estritamente posterior** ao instante informado | o simulador consulta a partir de `início − 1 ms` para tornar o início inclusivo |

O construtor gera um subconjunto que as duas implementações tratam da mesma forma. Recursos como `L`, `W` e `#` não são gerados nesta etapa.

## Exemplos de expressões

| Expressão | Interpretação |
|---|---|
| `* * * * * *` | Executar a cada segundo |
| `*/5 * * * * *` | Executar a cada 5 segundos |
| `0 */15 * * * *` | Executar a cada 15 minutos |
| `0 0 */2 * * *` | Executar a cada 2 horas |
| `0 30 8 * * *` | Executar todos os dias às 08h30 |
| `0 0 9 * * MON-FRI` | Executar de segunda a sexta-feira às 09h |
| `0 0 9 * * MON,WED,FRI` | Executar nos dias segunda-feira, quarta-feira e sexta-feira, às 09h |
| `0 0 6 10 * *` | Executar no dia 10 de cada mês às 06h |

No Spring Boot:

```java
@Scheduled(cron = "0 0 9 * * MON-FRI")
public void executarTarefa() { /* ... */ }
```

## Como o simulador funciona

O simulador **nunca calcula todas as execuções do período**. Ele pede à biblioteca apenas a *próxima* ocorrência, uma por vez:

```ts
let cursor = new Date(request.startMs - 1);   // torna o início inclusivo
while (executions.length < request.limit) {   // 1. para no limite
  const next = scheduler.next(cursor);        //    salta direto para a próxima ocorrência
  if (next === null) break;                   // 2. para quando não há novas ocorrências
  if (next.getTime() > request.endMs) break;  // 3. para ao ultrapassar a data final
  executions.push(next.getTime());
  cursor = next;
}
```

- No máximo **`limit + 1` consultas**, ou seja, até 21, qualquer que seja o tamanho do período.
- A biblioteca calcula a próxima ocorrência saltando campo a campo (mês → dia → hora → minuto → segundo), sem percorrer o período segundo a segundo.
- Nenhum array cresce além de `limit` itens, e a interface renderiza apenas esses itens.
- As datas do formulário viram limites **inclusivos**: 00:00:00.000 do dia inicial até 23:59:59.999 do dia final, no fuso horário do navegador.

## Web Workers, cancelamento e timeout

```
 Formulários ─► computed(SimulationInput) ─► toObservable ─► switchMap ─┬─► "calculando"
  (Signals)        (equal personalizado)                                └─► debounce 150 ms ─► WorkerManager ─► Web Worker
                                                                                              ◄─ resposta { id, ... } ◄─┘
```

- **Worker isolado** (`src/app/workers/cron-simulator.worker.ts`): não depende do DOM nem do Angular. Valida a mensagem, calcula e devolve resultado ou um **erro estruturado** (`INVALID_REQUEST`, `INVALID_EXPRESSION`, `UNSUPPORTED_RANGE`, `INTERNAL_ERROR`). Nenhuma stack trace chega à interface.
- **Contratos tipados**: `SimulateMessage` (thread principal → Worker) e `WorkerResponseMessage` (Worker → thread principal).
- **ID por solicitação**: respostas com ID diferente da solicitação pendente são descartadas.
- **Cancelamento**: quando a configuração muda, o `switchMap` cancela a solicitação anterior. Se o Worker ainda estiver ocupado com ela, ele é encerrado com `terminate()`, porque um loop dentro de um Worker não pode ser interrompido de outra forma.
- **Sem concorrência desnecessária**: só uma simulação roda por vez. Um Worker ocioso é reaproveitado.
- **Debounce de 150 ms**: agrupa alterações sucessivas em uma única simulação.
- **Timeout de 2 s** controlado pela thread principal: o Worker é encerrado, os recursos são liberados e a interface mostra *"Não foi possível calcular as próximas execuções dentro do tempo permitido. Tente ajustar o período ou a expressão."*. O timeout aparece como **tempo excedido**, nunca como "sem execuções".
- **Sem resultados antigos**: enquanto uma nova simulação roda, a linha do tempo mostra o estado "calculando" e não os resultados da configuração anterior.

## Limites de processamento

| Limite | Valor | Motivo |
|---|---|---|
| Execuções por simulação | 5, 10 ou 20 (validado até 20 também no Worker) | custo e renderização constantes |
| Consultas à biblioteca | até `limit + 1` | estratégia incremental |
| Período suportado | 01/01/1970 a 31/12/2999 | o croner encerra a busca de padrões sem ano no ano 3000 |
| Timeout | 2 s | proteção contra travamentos |
| Tamanho da expressão | 120 caracteres | validação defensiva no Worker |

Um período fora dos limites (por exemplo, até 3026) **não inicia cálculo**: a interface mostra uma mensagem clara.

## Arquitetura

```text
src/app/
├── core/
│   ├── cron/
│   │   ├── cron-engine.ts            # croner configurado no modo Spring
│   │   ├── cron-limits.ts            # limites de datas (sem dependências)
│   │   └── cron-simulation.ts        # simulação incremental + handler do Worker
│   ├── date/
│   │   ├── pt-br-date-adapter.ts     # datepicker em dd/mm/aaaa
│   │   └── simulation-period.ts      # limites inclusivos e fuso local
│   ├── models/                       # CronConfig, SimulationRequest, SimulationState…
│   └── services/
│       └── cron-worker-manager.service.ts   # IDs, descarte, cancelamento, timeout
├── features/cron-builder/
│   ├── components/
│   │   ├── frequency-selector/       # cards de modalidade
│   │   ├── schedule-config/          # dias, horário e intervalos (@switch)
│   │   ├── simulation-period/        # datas, limite e fuso
│   │   ├── cron-result/              # expressão, descrição, validação e cópia
│   │   ├── execution-timeline/       # linha do tempo e estados
│   │   ├── cron-examples/            # "Experimente um exemplo"
│   │   ├── saved-examples/           # lista "Meus exemplos"
│   │   └── example-editor-dialog/    # modal de criação/edição
│   ├── services/
│   │   ├── cron-generator.service.ts
│   │   ├── cron-description.service.ts
│   │   ├── cron-simulator.service.ts # Signal de entrada → Signal de estado
│   │   └── saved-examples.service.ts # exemplos do usuário (Signal + localStorage)
│   └── cron-builder.component.ts     # formulários, Signals e computed
├── workers/
│   └── cron-simulator.worker.ts
├── app.component.ts
├── app.config.ts
└── app.routes.ts
```

**Fluxo de estado**: os formulários reativos tipados viram Signals (`toSignal`). A expressão, a descrição, a validação do período e a entrada da simulação são `computed()` síncronos e baratos; nenhuma simulação roda dentro de um `computed()`. O resultado assíncrono do Worker volta como um Signal de estado. Não há `effect()` manual.

## Limitações do MVP

- Gera apenas o subconjunto de expressões das seis modalidades. Não há editor livre nem recursos `L`, `W` e `#`.
- Um único dia do mês por agendamento mensal, e intervalos limitados às opções predefinidas.
- O fuso horário é sempre o do navegador, sem configuração manual. Execuções que caem em transições de horário de verão seguem o comportamento do `Date` do navegador e podem divergir do `ZonedDateTime` do Spring nesses instantes.
- O período simulado vai de 1970 a 2999.
- Prévia de no máximo 20 execuções, sem paginação.
- Os exemplos criados ficam só no navegador atual (localStorage): não são sincronizados entre dispositivos e somem se os dados do site forem apagados. Se o navegador bloquear o armazenamento, eles duram até a página ser recarregada, e a interface avisa.
- Somente tema escuro. Não há execução real de tarefas, suporte a Quartz ou crontab Linux, nem geração de código Java.
