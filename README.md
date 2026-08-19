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
   máxima e capital necessário — nunca um valor desconhecido.
2. **Aceite e acompanhamento** — ao aceitar uma recomendação (ou registrar
   uma operação manual), você informa os preços reais obtidos na corretora.
   A partir da data de montagem, o app calcula o resultado (P&L) da operação
   a cada atualização de marcação que você fizer, até o encerramento.
3. **Visão Geral** — cards de capital alocado, P&L aberto, P&L realizado
   acumulado e número de operações, além de gráficos de evolução do
   resultado, P&L por operação aberta e alocação de capital por ativo.
4. **Módulo de Imposto de Renda** — apura o IR mensal sobre as operações de
   opções encerradas, seguindo as regras da Receita Federal para renda
   variável (ver abaixo), com compensação de prejuízos, cálculo do DARF e
   alertas de vencimento (pendente, próximo do vencimento, atrasado).
5. **Biblioteca de Opções** — glossário, guia de cada estratégia coberta,
   regras de gestão de risco e leituras recomendadas.

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
  types/domain.ts        modelo de dados (Recommendation, Position, Leg...)
  data/recommendations.ts carteira recomendada (safra atual, com teses)
  data/education.ts       glossário, guias de estratégia, referências
  lib/calculations.ts     motor de cálculo de P&L (aberto e realizado)
  lib/darf.ts             motor de apuração de IR / DARF
  lib/storage.ts          persistência em localStorage + backup
  hooks/usePortfolio.ts   estado da carteira do usuário
  components/             modais e componentes de UI reutilizáveis
  pages/                  Dashboard, Recommendations, Positions, TaxModule, Education
```

## Atualizando a carteira recomendada

A safra de recomendações vive em `src/data/recommendations.ts`, com a data
de emissão, cenário considerado e tese completa de cada estrutura. Para
publicar uma nova safra, adicione novos itens (ou marque os antigos como
`EXPIRADA`/`ENCERRADA_PELO_GESTOR`), sempre com o mesmo padrão: tese em
macro/micro/técnico/riscos e ganho/perda máximos explícitos e finitos.
