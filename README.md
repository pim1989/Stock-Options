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
call/put). Esse é o ÚNICO critério de exclusão — sofisticação, número de
pernas ou quão pouco comum é a estrutura nunca são motivo para tirar algo do
usuário: se o risco é finito, a estrutura fica disponível e cabe ao usuário
decidir se quer usá-la. Um motor de auditoria interno (`lib/audit.ts`)
aplica isso de forma matemática, não por opinião: calcula a inclinação do
resultado acima do maior strike envolvido (`netSlopeAboveHighestStrike` em
`lib/payoff.ts`) — se houver mais calls vendidas do que compradas/cobertas
por ação, a perda cresce sem limite e a estrutura é bloqueada; caso
contrário, ela é liberada, mesmo que o ganho não tenha teto (isso é uma
característica, não um risco — ver Ratio Backspread abaixo).

Estratégias suportadas hoje:

- **Venda Coberta de Call** (covered call) e **Venda de Put com Caixa
  Reservado** (cash-secured put)
- **Put de Proteção** (protective put) e **Collar** (ação + put comprada +
  call vendida)
- **Travas de débito**: Bull Call Spread, Bear Put Spread
- **Travas de crédito**: Bull Put Spread, Bear Call Spread
- **Iron Condor** e **Iron Butterfly** (4 pernas, venda de volatilidade,
  crédito)
- **Straddle** e **Strangle comprados** (2 pernas, aposta bidirecional,
  risco = débito pago)
- **Jade Lizard** (3 pernas: put com caixa reservado + trava de baixa com
  calls)
- **Put Ratio Spread** (2:1, crédito, perda finita porém desproporcional)
- **Call e Put Ratio Backspread** (1:2, risco finito e ganho **sem teto**
  na direção favorável — o app mostra "Sem teto" em vez de inventar um
  limite falso)
- **Booster** (venda coberta + call comprada ATM, financiada por vender o
  dobro de calls OTM)
- **Inverse Line — Bull** (compra sintética da ação: call comprada + put
  vendida no mesmo strike)
- **Trava Horizontal de Linha / Calendário** (vencimentos diferentes —
  disponível para registro, mas sem gráfico de payoff: ver limitação
  abaixo)

Só ficam de fora as estruturas com perna de call vendida genuinamente
descoberta, sem exceção possível: **Short Straddle/Strangle**, **Call
Ratio Spread** (mais vendido que comprado) e **Inverse Line — Bear**. A
Biblioteca do app documenta essas três com o motivo exato.

**Limitação conhecida, não uma exclusão de risco:** para a trava de
calendário (pernas com vencimentos diferentes), o app não desenha o
gráfico de payoff — o resultado no vencimento curto depende do valor a
mercado da perna de vencimento longo, que exige um modelo de precificação
(o app usa apenas valor intrínseco no vencimento). A estrutura continua
disponível para registro, só o gráfico fica indisponível, com aviso
explicando o porquê.

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
5. **Biblioteca de Opções** — glossário, guia de cada estratégia coberta,
   regras de gestão de risco e leituras recomendadas.

### Auditoria (roda em background, sem tela própria)

Nenhuma recomendação chega à Carteira Recomendada sem passar por uma
auditoria antes — mas essa auditoria não é uma funcionalidade visível do
app: é um filtro que roda silenciosamente e um processo de curadoria por
trás de cada safra. Duas camadas, com objetivos bem diferentes:

1. **Verificação automática determinística** (`src/lib/audit.ts`) — roda no
   seu navegador a cada carregamento da página e filtra `recommendations`
   antes de renderizar qualquer card. Para cada recomendação:
   - Valida se a **forma da estrutura** corresponde ao tipo declarado e
     continua com risco definido (ex.: covered call precisa ter ativo
     suficiente para cobrir a call vendida; trava de crédito precisa ter
     crédito líquido positivo; nenhuma perna vendida pode ficar sem
     cobertura).
   - **Recalcula** ganho máximo, perda máxima, breakeven e capital alocado
     diretamente a partir das pernas informadas (mesma matemática exata do
     gráfico de payoff — não por amostragem) e compara com os valores
     divulgados na recomendação.
   - Valida consistência de datas (validade posterior à emissão, pernas não
     vencendo antes da validade) e a presença de uma tese mínima.
   - Qualquer divergência **reprova silenciosamente** a recomendação: ela
     simplesmente não aparece — sem banner, sem aba, sem explicação na
     tela. Isso é código puro, cego a interpretação de mercado: pega bugs
     de digitação/matemática, não julga se a tese é boa.
2. **Revisão de mérito da tese** (`src/data/auditBenchmark.ts` e os
   comentários no topo de `src/data/recommendations.ts`) — o app roda
   inteiramente no navegador, sem backend, então não existe como "varrer a
   internet sozinho em tempo real" para julgar se uma tese ainda faz
   sentido. Essa camada é o trabalho de curadoria feito a cada revisão da
   safra (com apoio de busca), cobrindo o que uma checagem de matemática
   nunca pega:
   - **Ciclo de mercado** — o Ibovespa está em bull de longo prazo ou bear?
     Em qual fase da correção/tendência?
   - **Ciclo de commodity** (petróleo, minério) — o driver da tese é
     estrutural ou um pico de curto prazo que tende a reverter?
   - **Geopolítica e calendário eleitoral** — guerra, eleições e outros
     eventos que caem dentro da janela de validade da estrutura.
   - **Valuation** — P/L, P/VP, dividend yield e ROE do ativo-objeto,
     cruzados com o padrão histórico da própria empresa/setor.
   - **Convergência com o mercado** — a tese bate com o que carteiras
     recomendadas públicas de corretoras estão dizendo sobre o mesmo ativo?
   - **Literatura de opções** — a estrutura escolhida é mesmo a ferramenta
     certa para o objetivo declarado (renda vs. proteção vs. direcional
     com risco limitado), como ensinam as referências listadas na
     Biblioteca?

   Uma recomendação que não se sustenta sob essa revisão é corrigida (tese,
   estrutura ou preços) ou descartada **antes** de entrar em
   `recommendations.ts` — não é publicada com um aviso. A safra atual já
   passou por essa correção uma vez: a primeira leitura usava cotações
   desatualizadas (até 33% de erro no caso da VALE3); os preços de
   referência, strikes e prêmios de todas as 6 recomendações foram
   recalculados antes de publicar.

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

## Hospedagem e atualização automática de dados de mercado

O app é 100% estático (sem backend) — pode ser hospedado em qualquer
provedor de hospedagem estática com deploy automático a partir do GitHub
(Vercel, Netlify, Cloudflare Pages, GitHub Pages). Basta conectar o
repositório: cada push na branch de produção já dispara um novo deploy
sozinho, sem passo manual.

Separado disso, há uma atualização automática **só de dados de mercado**
(preço atual + P/L, P/VP, Dividend Yield, ROE, Margem Líquida), via GitHub
Actions:

- **O quê**: `.github/workflows/update-market-data.yml` roda
  `scripts/update-market-data.mjs`, que busca preço (Yahoo Finance, com
  fallback pra [brapi.dev](https://brapi.dev)) e indicadores fundamentalistas
  ([Fundamentus](https://www.fundamentus.com.br)) para os tickers em
  `src/data/watchlist.json`, e salva em `src/data/marketSnapshot.json`. Se
  uma fonte falhar para algum ticker, o valor anterior é mantido (marcado
  como desatualizado) em vez de apagado — o app nunca fica sem número por
  causa de uma falha de rede pontual.
- **Quando**: 1x por dia, **09h (horário de Brasília), antes da abertura do
  pregão** (10h–17h na B3) — assim o dado já está consolidado do fechamento
  do dia anterior quando você abre o app de manhã, sem o ruído dos primeiros
  minutos de pregão. Dá pra disparar manualmente a qualquer momento pela aba
  *Actions* do GitHub (botão "Run workflow").
- **O que isso NÃO faz**: não gera nem publica novas recomendações. Preço e
  indicadores são só contexto de mercado ao vivo, mostrado ao lado do preço
  de referência auditado de cada recomendação — a carteira em si (estruturas,
  strikes, teses) continua sendo uma decisão editorial, revisada sob pedido,
  nunca publicada sem passar pela auditoria (`lib/audit.ts`).
- **Fontes gratuitas e não-oficiais**: Yahoo Finance, brapi.dev e Fundamentus
  não são fontes oficiais da B3 — são as mesmas fontes públicas usadas por
  boa parte das ferramentas de finanças pessoais no Brasil, mas o formato das
  páginas pode mudar sem aviso. Se `pl`/`pvp`/`dy` vierem `null` no
  snapshot por um tempo, é sinal de que o layout do Fundamentus mudou e o
  script em `scripts/update-market-data.mjs` precisa de ajuste. Opcionalmente
  dá pra cadastrar um token gratuito do brapi.dev como secret
  `BRAPI_TOKEN` do repositório para um limite de requisições maior.

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
  data/watchlist.json      tickers acompanhados pela atualização automática de mercado
  data/marketSnapshot.json snapshot de preço/fundamentos (gerado pelo workflow, não editar à mão)
  lib/calculations.ts      motor de cálculo de P&L (aberto e realizado)
  lib/payoff.ts            motor de payoff (gráfico + extremos exatos)
  lib/audit.ts             motor de auditoria determinística
  lib/darf.ts              motor de apuração de IR / DARF
  lib/storage.ts           persistência em localStorage + backup
  lib/marketData.ts        leitura do snapshot de mercado
  hooks/usePortfolio.ts    estado da carteira do usuário
  components/              modais e componentes de UI reutilizáveis
  pages/                   Dashboard, Recommendations, Positions, TaxModule, Education
scripts/
  update-market-data.mjs   busca preço/fundamentos e atualiza data/marketSnapshot.json
.github/workflows/
  update-market-data.yml   agenda a execução diária do script acima (09h BRT)
```

## Atualizando a carteira recomendada

A safra de recomendações vive em `src/data/recommendations.ts`, com a data
de emissão, cenário considerado e tese completa de cada estrutura. Para
publicar uma nova safra:

1. Confirme as cotações atuais dos ativos-objeto por múltiplas fontes antes
   de calibrar strikes e prêmios — a checagem cruzada de preço é a parte
   mais fácil de errar (já aconteceu nesta safra, ver acima).
2. Refaça a revisão de mérito (ciclo de mercado, commodity, geopolítica,
   calendário eleitoral, valuation) e atualize `src/data/auditBenchmark.ts`
   e `AUDIT_BENCHMARK_REVIEWED_AT` com os achados e fontes.
3. Adicione os novos itens em `src/data/recommendations.ts` (ou marque os
   antigos como `EXPIRADA`/`ENCERRADA_PELO_GESTOR`), sempre com o mesmo
   padrão: tese em macro/micro/técnico/riscos e ganho/perda máximos
   explícitos e finitos.
4. Atualize `CARTEIRA_REVISADA_EM` em `src/data/meta.ts`.
5. Rode `npm run build`. Se algum número de ganho/perda/breakeven/capital
   estiver errado, o filtro silencioso de `lib/audit.ts` vai excluir a
   recomendação da tela sem avisar — para conferir antes de publicar, rode
   um script rápido chamando `auditPortfolio(recommendations)` (veja o
   histórico de commits para um exemplo) e confirme `passed: true` em
   todas.
