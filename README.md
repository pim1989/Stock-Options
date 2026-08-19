# RCO Dash

Plataforma pessoal de gestão de operações estruturadas com opções na B3 —
carteira recomendada com estruturas sempre cobertas (risco definido, nunca
descoberto), acompanhamento de P&L desde a montagem de cada operação, visão
geral consolidada da carteira, e um módulo de apoio ao cálculo de IR/DARF.

> **Aviso importante:** este é um projeto de organização pessoal e apoio
> educacional. Não é uma recomendação formal de investimento (não é emitida
> por um analista CNPI credenciado) e não substitui orientação de um
> contador para fins de Imposto de Renda. Preços e prêmios das recomendações
> são valores de referência — sempre confira as cotações reais na sua
> corretora antes de montar qualquer operação.

## Princípio central

Toda estrutura recomendada ou registrada tem **perda máxima conhecida no
momento da montagem**. O app nunca modela venda de opção a descoberto (naked
call/put) — as únicas estratégias suportadas são:

- **Venda Coberta de Call** (covered call)
- **Venda de Put com Caixa Reservado** (cash-secured put)
- **Put de Proteção** (protective put)
- **Collar** (ação + put comprada + call vendida)
- **Travas de débito**: Bull Call Spread, Bear Put Spread
- **Travas de crédito**: Bull Put Spread, Bear Call Spread

## O que o app faz

1. **Carteira Recomendada** — estruturas com tese fundamentada (macro,
   microeconômico, técnico e riscos), calibradas a partir de cenário real de
   mercado (Selic, câmbio, commodities, geopolítica, ciclo eleitoral,
   resultados corporativos). Cada recomendação mostra ganho máximo, perda
   máxima, capital necessário e um **gráfico de payoff** (resultado no
   vencimento x preço do ativo). Toda recomendação exibe sua **data de
   emissão** e **validade**, e a tela mostra a **data da última revisão**
   de toda a safra — se a validade já passou, o card é marcado como
   "Expirada" com um aviso para reavaliar antes de montar.
2. **Aceite e acompanhamento** — ao aceitar uma recomendação (ou registrar
   uma operação manual), você informa os preços reais obtidos na corretora.
   A partir da data de montagem, o app calcula o resultado (P&L) da operação
   a cada atualização de marcação que você fizer, até o encerramento. Como
   prêmios e cotações variam frente ao que foi sugerido, qualquer operação
   aberta pode ser **ajustada depois** (botão "Ajustar prêmios/valores") —
   strikes, prêmios, quantidades e preço do ativo — sem perder o histórico
   de marcações já registrado. Cada operação aberta também tem seu próprio
   gráfico de payoff, calculado com os valores reais da montagem.
3. **Visão Geral** — cards de capital alocado, P&L aberto, P&L realizado
   acumulado e número de operações, além de gráficos de evolução do
   resultado, P&L por operação aberta e alocação de capital por ativo.
4. **Módulo de Imposto de Renda** — apura o IR mensal sobre as operações de
   opções encerradas, seguindo as regras da Receita Federal para renda
   variável (ver abaixo), com compensação de prejuízos, cálculo do DARF e
   alertas de vencimento (pendente, próximo do vencimento, atrasado).
5. **Auditoria** — toda recomendação passa por uma auditoria antes de ficar
   disponível para aceite, em duas camadas (ver detalhes abaixo). Uma
   recomendação reprovada fica visível, mas sem botão de aceite, com o
   motivo exato explicado.
6. **Biblioteca de Opções** — glossário, guia de cada estratégia coberta,
   regras de gestão de risco e leituras recomendadas.

### Como funciona a Auditoria

A auditoria roda em duas camadas bem diferentes — é importante entender os
limites de cada uma:

1. **Verificação automática determinística** (`src/lib/audit.ts`) — roda no
   seu navegador a cada carregamento da página, para cada recomendação:
   - Valida se a **forma da estrutura** corresponde ao tipo declarado e
     continua com risco definido (ex.: covered call precisa ter ativo
     suficiente para cobrir a call vendida; trava de crédito precisa ter
     crédito líquido positivo; nenhuma perna vendida pode ficar sem
     cobertura).
   - **Recalcula** ganho máximo, perda máxima, breakeven e capital alocado
     diretamente a partir das pernas informadas (usando a mesma matemática
     do gráfico de payoff) e compara com os valores divulgados na
     recomendação.
   - Valida consistência de datas (validade posterior à emissão, pernas não
     vencendo antes da validade) e a presença de uma tese mínima.
   - Qualquer divergência vira uma **reprovação**: a recomendação continua
     visível (transparência), mas sem o botão de aceite, com o(s) motivo(s)
     exato(s) listado(s).
2. **Checagem cruzada com fontes públicas** (`src/data/auditBenchmark.ts`) —
   o app roda inteiramente no navegador, sem backend, então **não varre a
   internet sozinho em tempo real**. Essa camada é preenchida manualmente
   (com apoio de busca) a cada revisão da safra: compara a tese e o preço de
   referência de cada recomendação com carteiras públicas de corretoras e
   cotações recentes, e registra o resultado com fonte, link e data. Uma
   divergência de preço ou a ausência de confirmação pública vira um
   **alerta** (não bloqueia o aceite, mas fica visível no card e na aba
   Auditoria) até a próxima revisão.

A aba **Auditoria** no menu mostra o relatório completo: metodologia, contagem
de aprovadas/com alerta/reprovadas, os achados gerais da checagem cruzada
(com links para as fontes) e o detalhamento por recomendação.

### Regras de IR aplicadas no módulo de DARF

- Operações com **opções não têm** a isenção de R$20.000/mês em vendas que
  existe para ações à vista — todo ganho líquido mensal é tributável.
- Alíquota de **15%** em operações comuns (código DARF 6015) e **20%** em
  day trade (código DARF 5273), sobre o ganho líquido do mês.
- Prejuízos apurados compensam ganhos futuros **dentro da mesma
  modalidade**, sem prazo de prescrição.
- DARF vence no **último dia útil do mês seguinte** ao da apuração.
- Recolhimento dispensado quando o imposto do mês, após compensações, é
  **inferior a R$10,00**.

Este módulo organiza e calcula a partir do que você mesmo registra no app —
ele não acessa dados da Receita Federal nem envia nada automaticamente. A
apuração final e a entrega da declaração continuam sob sua responsabilidade,
idealmente com apoio de um contador.

## Onde ficam os seus dados

Tudo fica salvo **localmente no seu navegador** (`localStorage`) — não há
backend nem envio de dados para nenhum servidor. Use os botões **Exportar
backup** / **Importar backup** na tela "Minhas Operações" para salvar um
arquivo `.json` com todo o seu histórico (recomendado fazer isso
periodicamente, já que dados de navegador podem ser perdidos ao limpar o
cache ou trocar de dispositivo).

## Rodando localmente

```bash
npm install
npm run dev       # ambiente de desenvolvimento
npm run build     # build de produção (checagem de tipos + bundle em dist/)
npm run preview   # servir o build de produção localmente
npm run lint       # checagem de lint (oxlint)
```

## Stack técnica

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Recharts (gráficos)
- Persistência 100% client-side em `localStorage`, sem dependências de rede
  em tempo de execução

## Estrutura do código

```
src/
  types/domain.ts          modelo de dados (Recommendation, Position, Leg...)
  types/audit.ts           tipos do relatório de auditoria
  data/recommendations.ts  carteira recomendada (safra atual, com teses)
  data/auditBenchmark.ts   checagem cruzada com fontes públicas (por safra)
  data/education.ts        glossário, guias de estratégia, referências
  lib/calculations.ts      motor de cálculo de P&L (aberto e realizado)
  lib/payoff.ts            motor de payoff (gráfico + extremos exatos)
  lib/audit.ts             motor de auditoria determinística
  lib/darf.ts              motor de apuração de IR / DARF
  lib/storage.ts           persistência em localStorage + backup
  hooks/usePortfolio.ts    estado da carteira do usuário
  components/              modais e componentes de UI reutilizáveis
  pages/                   Dashboard, Recommendations, Positions, TaxModule, Audit, Education
```

## Atualizando a carteira recomendada

A safra de recomendações vive em `src/data/recommendations.ts`, com a data
de emissão, cenário considerado e tese completa de cada estrutura. Para
publicar uma nova safra:

1. Adicione os novos itens (ou marque os antigos como
   `EXPIRADA`/`ENCERRADA_PELO_GESTOR`), sempre com o mesmo padrão: tese em
   macro/micro/técnico/riscos e ganho/perda máximos explícitos e finitos.
2. Atualize `CARTEIRA_REVISADA_EM` em `src/data/meta.ts`.
3. Refaça a checagem cruzada com fontes públicas e atualize
   `src/data/auditBenchmark.ts` (achados, fontes e
   `AUDIT_BENCHMARK_REVIEWED_AT`) — é o que mantém a aba Auditoria honesta
   sobre até quando a comparação externa vale.
4. Rode `npm run build` — se algum número de ganho/perda/breakeven/capital
   estiver errado, a auditoria reprova a recomendação e o build passa
   normalmente, mas vale abrir a aba Auditoria localmente para conferir
   antes de publicar.
