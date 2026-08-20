export interface EducationSection {
  id: string;
  title: string;
  paragraphs: string[];
}

export const glossary: { term: string; def: string }[] = [
  { term: "Call", def: "Opção de compra. Dá ao titular o direito (não a obrigação) de comprar o ativo-objeto pelo preço de exercício (strike) até o vencimento." },
  { term: "Put", def: "Opção de venda. Dá ao titular o direito de vender o ativo-objeto pelo strike até o vencimento." },
  { term: "Titular", def: "Quem compra a opção (paga o prêmio). Tem o direito; risco máximo limitado ao prêmio pago." },
  { term: "Lançador", def: "Quem vende a opção (recebe o prêmio). Assume a obrigação caso o titular exerça. Na B3, todo lançamento no RCO Dash é coberto — nunca a descoberto." },
  { term: "Prêmio", def: "Preço pago/recebido pela opção, cotado por ação (o valor total é o prêmio multiplicado pela quantidade negociada), dividido em valor intrínseco (o quanto a opção já está ITM) e valor extrínseco (o resto — tempo, volatilidade)." },
  { term: "Strike", def: "Preço de exercício: valor pelo qual o ativo-objeto será comprado (call) ou vendido (put) se a opção for exercida." },
  { term: "ITM / ATM / OTM", def: "In-the-money (com valor intrínseco), at-the-money (strike ≈ preço do ativo) e out-of-the-money (sem valor intrínseco, só valor tempo)." },
  { term: "Exercício americano", def: "Modelo usado nas opções de ações da B3: pode ser exercida a qualquer momento até o vencimento. Todas as puts da B3 são europeias (só no vencimento); calls existem nos dois modelos." },
  { term: "Virar pó", def: "Expressão do mercado para uma opção expirar sem valor (OTM no vencimento) — o lançador fica com 100% do prêmio recebido." },
  { term: "Trava (spread)", def: "Combinação de duas ou mais opções da mesma classe para limitar tanto o ganho quanto a perda máxima da estrutura." },
  { term: "Volatilidade implícita (IV)", def: "Expectativa de oscilação futura do ativo embutida no preço da opção. IV alta = prêmios mais caros — bom momento para vender opções cobertas." },
  { term: "IV Rank", def: "Compara a volatilidade implícita atual com a mínima e máxima dos últimos 12 meses, indicando se as opções estão \"caras\" ou \"baratas\" no momento — 50% significa que a IV atual está no meio da amplitude recente." },
  { term: "Delta", def: "Sensibilidade do prêmio da opção a uma variação de R$1 no ativo-objeto, entre 0% e 100% (ou -100% a 0% em puts) — também serve como proxy da probabilidade de a opção terminar ITM. Na linha do dinheiro, delta ≈ 50%." },
  { term: "Gamma", def: "Mede o quanto o Delta muda para cada R$1 de variação do ativo — é a \"aceleração\" do preço da opção. É mais alto em opções ATM e cresce perto do vencimento." },
  { term: "Vega", def: "Sensibilidade do prêmio a uma alta de 1 ponto percentual na volatilidade implícita. Positivo para quem compra opções, negativo para quem vende." },
  { term: "Theta", def: "Decaimento do valor tempo da opção a cada dia que passa (\"time decay\") — trabalha a favor de quem vende opções cobertas e contra quem compra." },
  { term: "Financiamento / dividendos sintéticos", def: "Apelido de mercado para o fluxo recorrente de prêmios recebidos ao repetir vendas cobertas (calls) ou vendas de put com caixa reservado mês a mês." },
  { term: "Notional (valor nocional)", def: "Strike × quantidade — é a base de cálculo da corretagem de EXERCÍCIO de uma opção na B3, que tende a ser bem mais cara que a corretagem de simples negociação. É comum preferir zerar a posição a levar ao exercício por causa desse custo." },
];

export const strategyGuides: EducationSection[] = [
  {
    id: "covered-call",
    title: "Venda Coberta de Call (Covered Call)",
    paragraphs: [
      "Você já possui (ou compra) o ativo-objeto e vende uma call contra essa posição. Recebe o prêmio na hora e se compromete a vender as ações pelo strike caso seja exercido.",
      "Objetivo: gerar renda recorrente sobre uma carteira de ações, reduzindo o preço médio efetivo mês a mês. Funciona melhor em mercado neutro a moderadamente altista, com volatilidade implícita elevada (prêmios mais gordos).",
      "Risco: perda ocorre se a ação cair — mas é a MESMA perda de quem só tem a ação, amenizada pelo prêmio recebido. O risco de 'perda infinita' não existe aqui porque você já é dono do ativo entregue.",
      "Trade-off: se a ação disparar acima do strike, o ganho fica limitado (você vende no strike, abrindo mão da alta acima dele).",
    ],
  },
  {
    id: "cash-secured-put",
    title: "Venda de Put com Caixa Reservado (Cash-Secured Put)",
    paragraphs: [
      "Você vende uma put e reserva em caixa o valor total necessário para comprar as ações pelo strike (strike × quantidade), caso seja exercido. Também chamada de \"lançamento sintético\" — sintetiza o mesmo desenho de resultado da venda coberta, mas sem precisar desembolsar para comprar a ação primeiro.",
      "Objetivo clássico: 'ser pago para esperar' — ou você embolsa o prêmio (se a ação ficar acima do strike), ou compra a ação com desconto efetivo (strike menos o prêmio recebido). Melhor momento para usar: quando a ação parece barata o suficiente para você aceitar o risco de comprá-la naquele nível.",
      "Risco definido: no pior cenário (ação a zero), a perda máxima é o caixa reservado menos o prêmio recebido — nunca mais que isso, porque o caixa já está separado e não há alavancagem.",
    ],
  },
  {
    id: "protective-put",
    title: "Put de Proteção (Protective Put)",
    paragraphs: [
      "Compra de uma put sobre um ativo que você já possui, funcionando como um seguro contra queda: define um piso de preço de venda, custando o prêmio pago.",
      "Ideal em momentos de incerteza elevada (eleições, geopolítica, resultados) quando você quer manter a ação (para dividendos, por exemplo) mas reduzir a cauda de risco.",
      "Para proteger a carteira inteira em vez de um único ativo, usam-se puts do ETF BOVA11 em vez de puts de cada ação: se sua carteira totaliza R$50 mil e o BOVA11 vale R$100, compram-se puts referentes a 500 cotas para replicar a proteção proporcionalmente.",
    ],
  },
  {
    id: "collar",
    title: "Collar (Ação + Put comprada + Call vendida)",
    paragraphs: [
      "Combina a put de proteção com a venda de uma call para financiar (parcial ou totalmente) o custo do seguro. Resultado: uma faixa de resultado bem definida — perde pouco se cair, ganha até um teto se subir.",
      "Muito usado quando o investidor quer 'travar' o resultado de uma posição relevante sem se desfazer dela (evita, por exemplo, incidência de IR sobre a venda da ação), ou em momento de receio de alguma notícia esperada que possa abalar os ganhos já obtidos com a ação.",
    ],
  },
  {
    id: "spreads",
    title: "Travas Direcionais (Bull Call / Bear Put / Bull Put / Bear Call Spread)",
    paragraphs: [
      "Travas combinam uma opção comprada e uma vendida, da mesma classe (só calls ou só puts) e vencimento, com strikes diferentes. O resultado — ganho e perda — fica sempre limitado, o que as torna a forma mais eficiente de assumir uma visão direcional (alta ou baixa) sem exposição descoberta.",
      "Trava de débito (Bull Call / Bear Put): você paga um prêmio líquido na montagem; o risco máximo é esse débito.",
      "Trava de crédito (Bull Put / Bear Call): você recebe um prêmio líquido na montagem; o risco máximo é a diferença entre os strikes menos o crédito recebido.",
      "São a estrutura preferida do RCO Dash para expressar convicção direcional com agressividade controlada, porque o pior cenário é conhecido no instante em que a operação é montada.",
    ],
  },
  {
    id: "iron-condor",
    title: "Iron Condor (venda de volatilidade, crédito)",
    paragraphs: [
      "Combina uma trava de crédito com puts (abaixo do preço atual) e uma trava de crédito com calls (acima do preço atual), montadas OTM. As quatro pernas mantêm o risco sempre definido: cada lado é, isoladamente, uma trava de crédito comum.",
      "Objetivo: lucrar com a passagem do tempo e a queda do valor extrínseco se o ativo permanecer dentro de uma faixa até o vencimento — a estratégia clássica para monetizar volatilidade implícita alta numa expectativa de lateralização.",
      "Risco: perda máxima ocorre se o preço romper um dos dois lados com força; ganho máximo é o crédito total recebido, limitado à faixa entre as pernas vendidas. Por ter 4 pontas, exige liquidez em todas as séries — via de regra, zere a posição antes do vencimento em vez de levar ao exercício.",
    ],
  },
  {
    id: "iron-butterfly",
    title: "Iron Butterfly (venda de volatilidade concentrada, crédito)",
    paragraphs: [
      "Mesma lógica do Iron Condor, mas as duas pernas vendidas (put e call) ficam no MESMO strike, geralmente ATM — por isso o prêmio recebido é maior, mas a faixa de lucro máximo é mais estreita.",
      "Indicada quando a expectativa é de que o preço fique bem próximo de onde está hoje até o vencimento — mais agressiva que o condor porque a margem de erro é menor.",
    ],
  },
  {
    id: "straddle-strangle",
    title: "Straddle e Strangle Comprados (bidirecionais)",
    paragraphs: [
      "Compra simultânea de uma call e uma put — no mesmo strike (Straddle, geralmente ATM) ou em strikes OTM diferentes (Strangle, mais barato). Lucram com movimento forte do preço, para cima OU para baixo, sem precisar acertar a direção.",
      "Fazem mais sentido quando a volatilidade implícita está baixa (opções mais baratas) e existe um catalisador concreto no horizonte (resultado trimestral, decisão relevante) que deve mexer bastante o preço.",
      "Risco definido: no pior cenário (ação parada, sem mover para nenhum lado), a perda máxima é o total pago pelas duas opções — nunca mais que isso, já que ambas as pernas são compradas.",
    ],
  },
  {
    id: "jade-lizard",
    title: "Jade Lizard (renda, sem risco de alta)",
    paragraphs: [
      "Combina uma venda de put com caixa reservado com uma trava de baixa com calls (crédito). Quando o crédito total recebido (put + trava de calls) é maior ou igual à largura da trava de calls, a estrutura fica sem nenhum risco de alta — só existe risco se o ativo cair abaixo do strike da put.",
      "É uma das estruturas mais sofisticadas entre as que o RCO Dash recomenda: uma forma eficiente de gerar renda combinando duas visões (levemente altista embaixo, neutra/baixista em cima) numa única montagem.",
    ],
  },
];

/**
 * Estratégias que aparecem na literatura de opções e que o RCO Dash
 * conhece, mas escolhe NÃO oferecer como recomendação — por envolverem
 * perna vendida sem cobertura (risco potencialmente ilimitado, contra o
 * princípio central do produto) ou por exigirem um modelo de precificação
 * (não só valor intrínseco no vencimento) que o gráfico de payoff do app
 * ainda não reproduz com fidelidade.
 */
export const excludedStrategies: { title: string; reason: string }[] = [
  {
    title: "Short Straddle / Short Strangle",
    reason: "Venda simultânea de call e put sem nenhuma perna de proteção — o lado da call vendida fica descoberto, com risco de perda teoricamente ilimitado se o ativo disparar. Contraria o princípio central do app.",
  },
  {
    title: "Call Ratio Spread (trava com razão diferente de 1:1)",
    reason: "Vender mais calls do que se compra deixa uma unidade de call descoberta acima de um certo preço — mesmo problema da venda a descoberto, com risco ilimitado na alta.",
  },
  {
    title: "Put Ratio Spread",
    reason: "Tecnicamente tem perda máxima finita (a ação não vai abaixo de zero), mas a unidade extra de put vendida sem par gera um prejuízo desproporcional em relação ao crédito recebido — fora do perfil de risco que o RCO Dash quer padronizar.",
  },
  {
    title: "Ratio Backspread",
    reason: "Tem risco definido (mais opções compradas do que vendidas) e é uma estratégia legítima, mas exige proporções de quantidade não-uniformes entre as pernas — suporte planejado para uma versão futura do app.",
  },
  {
    title: "Booster",
    reason: "Combinação de venda coberta com trava de alta que acelera o ganho num intervalo de preço; tem risco definido, mas depende de uma relação específica entre a quantidade de ações e duas pernas de opção diferentes — suporte planejado para uma versão futura.",
  },
  {
    title: "Trava Horizontal de Linha / Calendário (THL)",
    reason: "Compra e venda da mesma opção em vencimentos diferentes. O resultado no vencimento curto depende do valor que a opção do vencimento longo AINDA teria naquela data — algo que só um modelo de precificação (tipo Black-Scholes) calcula, não o valor intrínseco no vencimento que o gráfico de payoff do app usa. Sem isso, o app não conseguiria desenhar o payoff dessa estrutura com fidelidade.",
  },
  {
    title: "Inverse Line (compra/venda sintética de ação)",
    reason: "A versão 'Bear' (sintetizar a venda da ação) combina put comprada com call vendida sem cobertura — mesmo risco ilimitado da venda a descoberto da própria ação. A versão 'Bull' até teria risco definido, mas replica apenas o mesmo risco de possuir a ação sem vantagem clara sobre comprá-la direto — baixa prioridade.",
  },
];

export const riskRules: string[] = [
  "Nunca lance opções a descoberto (venda de call sem possuir o ativo, ou venda de put sem caixa reservado): é a única forma de ter prejuízo teoricamente ilimitado em opções, e o RCO Dash não recomenda esse tipo de estrutura em nenhuma hipótese.",
  "Dimensione cada operação como uma fração pequena do patrimônio total em renda variável (referência de mercado: 3% a 8% do book por estrutura, menos em teses agressivas).",
  "Prefira liquidez: opere séries com volume e presença de negociação relevantes — spreads muito largos entre compra e venda corroem o resultado. Isso vale ainda mais para estruturas de 3-4 pontas (condor, borboleta, jade lizard): monte apenas em ativos com opções líquidas, e o quanto antes zere a posição em vez de levar ao exercício.",
  "Defina antecipadamente o que fazer se a estrutura for contra você (rolar, encerrar, aceitar o exercício) — decida com a cabeça fria, antes de estar dentro da operação.",
  "Rolagem: se quiser manter a mesma estratégia para o vencimento seguinte, feche a posição atual e reabra a mesma estrutura no próximo vencimento — na prática, inverta a operação original e repita-a para a nova data. É mais comum rolar estruturas de crédito (cujo objetivo é gerar renda recorrente) do que estruturas de débito.",
  "Margem de garantia: estruturas de débito (você paga para montar) não pedem margem adicional da corretora, pois o risco já foi desembolsado. Estruturas de crédito (você recebe para montar) exigem alocação de margem — tenha saldo, ações ou outros ativos aprovados pela corretora antes de vender opções.",
  "Custo de exercício: a corretagem cobrada quando uma opção é EXERCIDA costuma ser bem mais alta que a de simples negociação (calculada sobre o valor nocional = strike × quantidade, não sobre o prêmio). Prefira zerar a posição no mercado a deixar levar ao exercício, sempre que o custo permitir.",
  "Eventos conhecidos (resultados trimestrais, decisões do Copom, decisões eleitorais) tendem a inflar a volatilidade implícita antes do evento — cuidado ao comprar opções pouco antes desses eventos (volatilidade cai bruscamente depois, o chamado 'IV crush').",
  "Acompanhe proventos: dividendos e JCP relevantes podem gerar ajuste de strike nas séries de opções da B3 — confira o edital de ajuste quando anunciados.",
];

export const taxNotes: string[] = [
  "Diferente das ações à vista, operações com OPÇÕES não têm isenção de R$20.000/mês em vendas — todo ganho líquido mensal é tributável.",
  "Alíquota de 15% em operações comuns (não day trade) e 20% em day trade, sempre sobre o ganho líquido do mês, após compensar prejuízos da mesma modalidade em meses anteriores.",
  "O DARF vence no último dia útil do mês seguinte ao da apuração. Fica dispensado o recolhimento se o imposto do mês for inferior a R$10,00.",
  "Lucro líquido = lucro bruto - corretagem - impostos. A corretagem de EXERCÍCIO de uma opção costuma ser mais cara que a de negociação normal, calculada sobre o valor nocional (strike × quantidade) — mais um motivo para preferir zerar a posição a levar ao exercício.",
  "Este módulo organiza e calcula a partir do que você registra no RCO Dash — a apuração final e a entrega da declaração anual continuam sendo responsabilidade sua (idealmente com apoio de um contador).",
];

export const references: { title: string; author: string; note: string; url?: string }[] = [
  {
    title: "Mercado de Opções — Conceitos Essenciais (Vol. 1)",
    author: "F. Maciel (MacielCaps)",
    note: "Fundamentos do contrato de opções: moneyness, valor intrínseco x extrínseco, códigos de séries, exercício americano x europeu. Base do glossário desta biblioteca.",
  },
  {
    title: "Mercado de Opções — Descobrindo Valores (Vol. 2)",
    author: "F. Maciel (MacielCaps)",
    note: "Operações a seco, travas de débito e de crédito, e as gregas (Delta, Gamma, Vega, Theta) — a mesma classificação de travas usada no motor de auditoria do RCO Dash.",
  },
  {
    title: "Mercado de Opções — Arsenal Estratégico (Vol. 3)",
    author: "F. Maciel (MacielCaps)",
    note: "Estruturas avançadas (condor, borboleta, collar, straddle/strangle, jade lizard, ratio spread, calendário) e gerenciamento (rolagem, margem, proteção de carteira, custos de transação) — base das estruturas adicionadas nesta versão e da seção acima sobre o que o app não recomenda.",
  },
  {
    title: "Mercado de Opções: Conceitos e Estratégias de Negociação",
    author: "Marcos Kutchukian e Marcelo Frazão",
    note: "Referência brasileira mais citada sobre o tema — cobre desde os fundamentos até dezenas de estruturas usadas por gestores profissionais.",
  },
  {
    title: "Options, Futures, and Other Derivatives",
    author: "John C. Hull",
    note: "O clássico internacional de derivativos, usado como base curricular em finanças no mundo todo. Mais técnico; ótimo depois dos fundamentos.",
  },
  {
    title: "Option Volatility and Pricing",
    author: "Sheldon Natenberg",
    note: "Referência para entender volatilidade implícita e como ela precifica prêmios — essencial para saber quando vender vs. comprar opções.",
  },
  {
    title: "Opções sobre Ações — Portal Oficial B3",
    author: "B3 / Bora Investir",
    note: "Material institucional gratuito, sempre atualizado com as regras vigentes de negociação, exercício e ajustes por proventos na bolsa brasileira.",
    url: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/opcoes-sobre-acoes.htm",
  },
];
