/**
 * Modelo de domínio do RCO Dash — plataforma de gestão de operações
 * estruturadas com opções na B3.
 *
 * Princípio inegociável do produto: toda estrutura recomendada ou
 * registrada precisa ter risco DEFINIDO (perda máxima conhecida no
 * momento da montagem). Nunca modelamos venda descoberta (naked) de
 * calls ou puts.
 */

export type OptionType = "CALL" | "PUT";
export type LegAction = "COMPRA" | "VENDA";

/** Perna de uma estrutura de opções. */
export interface OptionLeg {
  id: string;
  type: OptionType;
  action: LegAction;
  /** Código do ativo-objeto, ex: PETR4 */
  underlying: string;
  /** Código da série de opção, ex: PETRJ320 (opcional, pode ser estimado) */
  series?: string;
  strike: number;
  /** Prêmio por opção (1 opção = 1 ação-objeto; lote padrão B3 = 100) */
  premium: number;
  /** Quantidade de opções (múltiplo de 100 normalmente) */
  quantity: number;
  expiry: string; // ISO date (vencimento)
}

export type StrategyType =
  | "COVERED_CALL" // Venda coberta de call (titular do ativo)
  | "CASH_SECURED_PUT" // Venda de put com caixa reservado
  | "PROTECTIVE_PUT" // Compra de put trava para proteger posição
  | "COLLAR" // Ação + put comprada (proteção) + call vendida (financia)
  | "BULL_CALL_SPREAD" // Trava de alta com calls (débito)
  | "BEAR_PUT_SPREAD" // Trava de baixa com puts (débito)
  | "BULL_PUT_SPREAD" // Trava de alta com puts (crédito, risco limitado)
  | "BEAR_CALL_SPREAD" // Trava de baixa com calls (crédito, risco limitado)
  | "IRON_CONDOR" // 4 pernas: trava de crédito com puts + trava de crédito com calls — aposta em lateralização
  | "IRON_BUTTERFLY" // 4 pernas: iguais ao condor, com as vendas no mesmo strike (ATM) — prêmio maior, faixa de lucro mais estreita
  | "LONG_STRADDLE" // Compra de call + put no mesmo strike (ATM) — aposta bidirecional em movimento forte
  | "LONG_STRANGLE" // Compra de call + put em strikes OTM diferentes — versão mais barata do straddle
  | "JADE_LIZARD" // Venda de put (caixa reservado) + trava de baixa com calls (crédito) — sem risco de alta se o crédito total cobrir a largura da trava
  | "PUT_RATIO_SPREAD" // Compra 1x put (strike alto) + vende 2x put (strike baixo) — perda finita (ação não vai a negativo), mas desproporcional ao crédito
  | "CALL_RATIO_BACKSPREAD" // Vende 1x call (strike baixo) + compra 2x call (strike alto) — perda finita, ganho sem teto na alta forte
  | "PUT_RATIO_BACKSPREAD" // Vende 1x put (strike alto) + compra 2x put (strike baixo) — perda finita, ganho grande na queda forte
  | "BOOSTER" // Venda coberta + 1 call comprada ATM, financiada por vender o dobro de calls OTM — acelera o ganho até o strike vendido
  | "INVERSE_LINE_BULL" // Compra sintética da ação: call comprada + put vendida (caixa reservado), mesmo strike — mesmo risco de possuir a ação
  | "CALENDAR_SPREAD"; // Venda de opção de vencimento curto + compra da mesma opção em vencimento mais longo (mesmo strike) — THL

export const STRATEGY_LABELS: Record<StrategyType, string> = {
  COVERED_CALL: "Venda Coberta de Call",
  CASH_SECURED_PUT: "Venda de Put com Caixa Reservado",
  PROTECTIVE_PUT: "Put de Proteção (Trava)",
  COLLAR: "Collar (Ação + Put + Call)",
  BULL_CALL_SPREAD: "Trava de Alta com Calls",
  BEAR_PUT_SPREAD: "Trava de Baixa com Puts",
  BULL_PUT_SPREAD: "Trava de Alta com Puts (crédito)",
  BEAR_CALL_SPREAD: "Trava de Baixa com Calls (crédito)",
  IRON_CONDOR: "Iron Condor (crédito, lateralização)",
  IRON_BUTTERFLY: "Iron Butterfly (crédito, estabilidade)",
  LONG_STRADDLE: "Straddle Comprado (bidirecional)",
  LONG_STRANGLE: "Strangle Comprado (bidirecional)",
  JADE_LIZARD: "Jade Lizard (renda, sem risco de alta)",
  PUT_RATIO_SPREAD: "Put Ratio Spread (2:1, crédito)",
  CALL_RATIO_BACKSPREAD: "Call Ratio Backspread (1:2, convexo)",
  PUT_RATIO_BACKSPREAD: "Put Ratio Backspread (1:2, convexo)",
  BOOSTER: "Booster (venda coberta acelerada)",
  INVERSE_LINE_BULL: "Inverse Line — Compra Sintética",
  CALENDAR_SPREAD: "Trava Horizontal de Linha (Calendário)",
};

export type RiskProfile = "CONSERVADOR" | "MODERADO" | "AGRESSIVO";

export type MarketDirection = "ALTA" | "BAIXA" | "NEUTRO" | "LATERAL";

/** Fundamentação (tese) de uma recomendação. */
export interface Thesis {
  macro: string;
  micro: string;
  tecnico?: string;
  riscos: string;
}

/** Item da carteira recomendada, publicado pelo "gestor" (RCO Dash). */
export interface Recommendation {
  id: string;
  ticker: string;
  companyName: string;
  strategyType: StrategyType;
  direction: MarketDirection;
  riskProfile: RiskProfile;
  dateIssued: string; // ISO
  validUntil: string; // ISO — validade da recomendação
  /** Preço de referência do ativo-objeto no momento da recomendação */
  underlyingRefPrice: number;
  /** Se a estrutura exige possuir o ativo-objeto (covered call, collar) */
  requiresUnderlying: boolean;
  underlyingQtySuggested?: number;
  legs: OptionLeg[];
  thesis: Thesis;
  maxGain: number; // por lote sugerido, em R$ (valor de referência quando maxGainUnlimited=true — ver nota abaixo)
  /** Estruturas convexas (ex.: ratio backspread) têm ganho sem teto na direção favorável —
   * risco continua sempre finito (maxLoss), só o ganho não tem limite superior. */
  maxGainUnlimited?: boolean;
  maxLoss: number; // por lote sugerido, em R$ (sempre finito — essa garantia não muda)
  breakeven: number[];
  capitalAlocado: number; // capital necessário estimado (R$)
  status: "ATIVA" | "EXPIRADA" | "ENCERRADA_PELO_GESTOR";
}

export type PositionStatus = "ABERTA" | "ENCERRADA";
export type CloseReason =
  | "VENCIMENTO_OTM"
  | "EXERCICIO"
  | "RECOMPRA_ANTECIPADA"
  | "VIRADA_POSICAO"
  | "STOP_GESTAO";

/** Atualização de marcação a mercado, feita manualmente pelo usuário. */
export interface MarkUpdate {
  id: string;
  date: string; // ISO
  /** Preço do ativo-objeto informado pelo usuário nesta data */
  underlyingPrice?: number;
  /** Prêmio atual por perna, na mesma ordem de position.legs */
  legPremiums: Record<string, number>; // legId -> prêmio atual
  note?: string;
}

/**
 * Operação efetivamente montada pelo usuário na corretora (originada de
 * uma recomendação aceita, ou lançada manualmente).
 */
export interface Position {
  id: string;
  recommendationId?: string;
  ticker: string;
  companyName: string;
  strategyType: StrategyType;
  riskProfile: RiskProfile;
  brokerName?: string;

  acceptedDate: string; // ISO — data em que a operação foi montada
  legs: OptionLeg[]; // prêmios aqui = prêmios de ENTRADA efetivamente obtidos/pagos
  requiresUnderlying: boolean;
  underlyingQty?: number;
  underlyingEntryPrice?: number;

  marks: MarkUpdate[]; // histórico de marcações a mercado

  status: PositionStatus;
  closedDate?: string;
  closeReason?: CloseReason;
  underlyingExitPrice?: number;
  legExitPremiums?: Record<string, number>; // legId -> prêmio de saída (0 se virou pó)
  realizedResult?: number; // R$, calculado no encerramento

  /** Marca se essa operação deve ser tratada como day trade para fins de IR */
  dayTrade?: boolean;

  notes?: string;
}

export interface DarfPayment {
  id: string;
  competencia: string; // "YYYY-MM"
  paid: boolean;
  paidDate?: string;
}
