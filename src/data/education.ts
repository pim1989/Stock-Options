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
  { term: "Prêmio", def: "Preço pago/recebido pela opção, cotado por ação (o valor total é o prêmio multiplicado pela quantidade negociada)." },
  { term: "Strike", def: "Preço de exercício: valor pelo qual o ativo-objeto será comprado (call) ou vendido (put) se a opção for exercida." },
  { term: "ITM / ATM / OTM", def: "In-the-money (com valor intrínseco), at-the-money (strike ≈ preço do ativo) e out-of-the-money (sem valor intrínseco, só valor tempo)." },
  { term: "Exercício americano", def: "Modelo usado nas opções de ações da B3: pode ser exercida a qualquer momento até o vencimento (não apenas na data final)." },
  { term: "Virar pó", def: "Expressão do mercado para uma opção expirar sem valor (OTM no vencimento) — o lançador fica com 100% do prêmio recebido." },
  { term: "Trava (spread)", def: "Combinação de duas ou mais opções da mesma classe para limitar tanto o ganho quanto a perda máxima da estrutura." },
  { term: "Volatilidade implícita (IV)", def: "Expectativa de oscilação futura do ativo embutida no preço da opção. IV alta = prêmios mais caros — bom momento para vender opções cobertas." },
  { term: "Delta", def: "Sensibilidade do prêmio da opção a uma variação de R$1 no ativo-objeto. Serve como proxy da probabilidade de a opção terminar ITM." },
  { term: "Theta", def: "Decaimento do valor tempo da opção a cada dia que passa — trabalha a favor de quem vende opções cobertas." },
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
      "Você vende uma put e reserva em caixa o valor total necessário para comprar as ações pelo strike (strike × quantidade), caso seja exercido.",
      "Objetivo clássico: 'ser pago para esperar' — ou você embolsa o prêmio (se a ação ficar acima do strike), ou compra a ação com desconto efetivo (strike menos o prêmio recebido).",
      "Risco definido: no pior cenário (ação a zero), a perda máxima é o caixa reservado menos o prêmio recebido — nunca mais que isso, porque o caixa já está separado e não há alavancagem.",
    ],
  },
  {
    id: "protective-put",
    title: "Put de Proteção (Protective Put)",
    paragraphs: [
      "Compra de uma put sobre um ativo que você já possui, funcionando como um seguro contra queda: define um piso de preço de venda, custando o prêmio pago.",
      "Ideal em momentos de incerteza elevada (eleições, geopolítica, resultados) quando você quer manter a ação (para dividendos, por exemplo) mas reduzir a cauda de risco.",
    ],
  },
  {
    id: "collar",
    title: "Collar (Ação + Put comprada + Call vendida)",
    paragraphs: [
      "Combina a put de proteção com a venda de uma call para financiar (parcial ou totalmente) o custo do seguro. Resultado: uma faixa de resultado bem definida — perde pouco se cair, ganha até um teto se subir.",
      "Muito usado quando o investidor quer 'travar' o resultado de uma posição relevante sem se desfazer dela (evita, por exemplo, incidência de IR sobre a venda da ação).",
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
];

export const riskRules: string[] = [
  "Nunca lance opções a descoberto (venda de call sem possuir o ativo, ou venda de put sem caixa reservado): é a única forma de ter prejuízo teoricamente ilimitado em opções, e o RCO Dash não recomenda esse tipo de estrutura em nenhuma hipótese.",
  "Dimensione cada operação como uma fração pequena do patrimônio total em renda variável (referência de mercado: 3% a 8% do book por estrutura, menos em teses agressivas).",
  "Prefira liquidez: opere séries com volume e presença de negociação relevantes — spreads muito largos entre compra e venda corroem o resultado.",
  "Defina antecipadamente o que fazer se a estrutura for contra você (rolar, encerrar, aceitar o exercício) — decida com a cabeça fria, antes de estar dentro da operação.",
  "Eventos conhecidos (resultados trimestrais, decisões do Copom, decisões eleitorais) tendem a inflar a volatilidade implícita antes do evento — cuidado ao comprar opções pouco antes desses eventos (voláltilidade cai bruscamente depois, o chamado 'IV crush').",
  "Acompanhe proventos: dividendos e JCP relevantes podem gerar ajuste de strike nas séries de opções da B3 — confira o edital de ajuste quando anunciados.",
];

export const taxNotes: string[] = [
  "Diferente das ações à vista, operações com OPÇÕES não têm isenção de R$20.000/mês em vendas — todo ganho líquido mensal é tributável.",
  "Alíquota de 15% em operações comuns (não day trade) e 20% em day trade, sempre sobre o ganho líquido do mês, após compensar prejuízos da mesma modalidade em meses anteriores.",
  "O DARF vence no último dia útil do mês seguinte ao da apuração. Fica dispensado o recolhimento se o imposto do mês for inferior a R$10,00.",
  "Este módulo organiza e calcula a partir do que você registra no RCO Dash — a apuração final e a entrega da declaração anual continuam sendo responsabilidade sua (idealmente com apoio de um contador).",
];

export const references: { title: string; author: string; note: string; url?: string }[] = [
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
