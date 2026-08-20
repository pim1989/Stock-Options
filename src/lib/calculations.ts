import type { MarkUpdate, OptionLeg, Position, StrategyType } from "../types/domain";
import { computePayoffExtremes } from "./payoff";

/** Forma mínima necessária para calcular capital alocado — Position e Recommendation
 * satisfazem essa forma estruturalmente, o que permite reaproveitar a mesma lógica
 * no motor de auditoria (que audita Recommendation antes dela virar Position). */
export interface CapitalInputs {
  strategyType: StrategyType;
  legs: OptionLeg[];
  underlyingQty?: number;
  underlyingEntryPrice?: number;
}

/** Prêmio atual de uma perna: última marcação informada, senão prêmio de entrada. */
export function currentLegPremium(leg: OptionLeg, marks: MarkUpdate[]): number {
  for (let i = marks.length - 1; i >= 0; i--) {
    const p = marks[i].legPremiums[leg.id];
    if (p !== undefined) return p;
  }
  return leg.premium;
}

export function currentUnderlyingPrice(position: Position): number | undefined {
  for (let i = position.marks.length - 1; i >= 0; i--) {
    if (position.marks[i].underlyingPrice !== undefined) {
      return position.marks[i].underlyingPrice;
    }
  }
  return position.underlyingEntryPrice;
}

export function lastMarkDate(position: Position): string | undefined {
  if (position.marks.length === 0) return undefined;
  return position.marks[position.marks.length - 1].date;
}

/** Fluxo de caixa de abertura de uma perna: venda = crédito (+), compra = débito (-). */
export function legEntryCashFlow(leg: OptionLeg): number {
  const sign = leg.action === "VENDA" ? 1 : -1;
  return sign * leg.premium * leg.quantity;
}

/**
 * P&L de uma perna a mercado:
 * VENDA: PL = (prêmio recebido na entrada - prêmio atual para recomprar) * qty
 * COMPRA: PL = (prêmio atual para vender - prêmio pago na entrada) * qty
 */
export function legPL(leg: OptionLeg, currentPremium: number): number {
  if (leg.action === "VENDA") {
    return (leg.premium - currentPremium) * leg.quantity;
  }
  return (currentPremium - leg.premium) * leg.quantity;
}

export function optionsNetCredit(legs: OptionLeg[]): number {
  return legs.reduce((acc, l) => acc + legEntryCashFlow(l), 0);
}

/** Capital alocado/em risco estimado para a estrutura (sempre finito). */
export function capitalAlocado(input: CapitalInputs): number {
  const { strategyType, legs, underlyingQty, underlyingEntryPrice } = input;

  switch (strategyType) {
    case "COVERED_CALL":
    case "COLLAR":
    case "PROTECTIVE_PUT": {
      const stockCost = (underlyingQty ?? 0) * (underlyingEntryPrice ?? 0);
      // custo do ativo é reduzido pelo crédito líquido de prêmios recebidos
      const netCredit = optionsNetCredit(legs);
      return Math.max(stockCost - netCredit, stockCost * 0.01);
    }
    case "CASH_SECURED_PUT": {
      const sold = legs.find((l) => l.action === "VENDA" && l.type === "PUT");
      const reserved = sold ? sold.strike * sold.quantity : 0;
      const netCredit = optionsNetCredit(legs);
      return Math.max(reserved - netCredit, 0);
    }
    case "BULL_CALL_SPREAD":
    case "BEAR_PUT_SPREAD": {
      // trava de débito: capital em risco = débito líquido pago
      const debit = -optionsNetCredit(legs);
      return Math.max(debit, 0);
    }
    case "BULL_PUT_SPREAD":
    case "BEAR_CALL_SPREAD": {
      // trava de crédito: capital em risco = largura entre strikes - crédito recebido
      if (legs.length >= 2) {
        const width = Math.abs(legs[0].strike - legs[1].strike);
        const qty = Math.min(...legs.map((l) => l.quantity));
        const credit = optionsNetCredit(legs);
        return Math.max(width * qty - credit, 0);
      }
      return 0;
    }
    case "IRON_CONDOR":
    case "IRON_BUTTERFLY":
    case "JADE_LIZARD":
    case "LONG_STRADDLE":
    case "LONG_STRANGLE":
    case "PUT_RATIO_SPREAD":
    case "CALL_RATIO_BACKSPREAD":
    case "PUT_RATIO_BACKSPREAD":
    case "INVERSE_LINE_BULL":
      // Estruturas de 2-4 pernas com quantidades possivelmente desiguais entre
      // elas: o capital em risco é, por construção, a própria perda máxima da
      // estrutura (sempre finita — a prova é o check de inclinação em
      // lib/payoff.ts, não uma fórmula ad-hoc por estratégia). Ganho pode não
      // ter teto (ratio backspread) — isso não afeta o capital em risco.
      return computePayoffExtremes(legs).maxLoss;
    case "BOOSTER": {
      // Ação + call comprada + calls vendidas em dobro no mesmo strike: mesma
      // lógica acima, mas precisa do preço/quantidade do ativo na conta.
      const underlying =
        underlyingQty && underlyingEntryPrice ? { qty: underlyingQty, entryPrice: underlyingEntryPrice } : undefined;
      return computePayoffExtremes(legs, underlying).maxLoss;
    }
    case "CALENDAR_SPREAD": {
      // Pernas com vencimentos diferentes: o modelo de payoff no vencimento não
      // é confiável aqui (ver hasMixedExpiries em lib/payoff.ts). Convenção
      // conservadora padrão da literatura: capital em risco = débito líquido
      // pago para montar (o pior caso realista se ambas as pernas perderem
      // todo o valor antes de se aproveitar do efeito calendário).
      return Math.max(-optionsNetCredit(legs), 0);
    }
    default:
      return 0;
  }
}

export interface PositionPL {
  optionsOpenPL: number;
  underlyingOpenPL: number;
  totalOpenPL: number;
  capital: number;
  returnPct: number;
}

export function computeOpenPL(position: Position): PositionPL {
  const optionsOpenPL = position.legs.reduce(
    (acc, leg) => acc + legPL(leg, currentLegPremium(leg, position.marks)),
    0
  );

  let underlyingOpenPL = 0;
  if (position.requiresUnderlying && position.underlyingQty && position.underlyingEntryPrice) {
    const curPrice = currentUnderlyingPrice(position) ?? position.underlyingEntryPrice;
    underlyingOpenPL = (curPrice - position.underlyingEntryPrice) * position.underlyingQty;
  }

  const capital = capitalAlocado(position);
  const totalOpenPL = optionsOpenPL + underlyingOpenPL;
  const returnPct = capital > 0 ? (totalOpenPL / capital) * 100 : 0;

  return { optionsOpenPL, underlyingOpenPL, totalOpenPL, capital, returnPct };
}

export interface PositionRealized {
  optionsRealized: number;
  underlyingRealized: number;
  totalRealized: number;
}

export function computeRealizedPL(position: Position): PositionRealized {
  if (position.status !== "ENCERRADA") {
    return { optionsRealized: 0, underlyingRealized: 0, totalRealized: 0 };
  }
  const exitPremiums = position.legExitPremiums ?? {};
  const optionsRealized = position.legs.reduce((acc, leg) => {
    const exit = exitPremiums[leg.id] ?? 0;
    return acc + legPL(leg, exit);
  }, 0);

  let underlyingRealized = 0;
  if (
    position.requiresUnderlying &&
    position.underlyingQty &&
    position.underlyingEntryPrice &&
    position.underlyingExitPrice !== undefined
  ) {
    underlyingRealized =
      (position.underlyingExitPrice - position.underlyingEntryPrice) * position.underlyingQty;
  }

  return {
    optionsRealized,
    underlyingRealized,
    totalRealized: optionsRealized + underlyingRealized,
  };
}

export interface PortfolioSummary {
  capitalAlocadoAberto: number;
  plAbertoTotal: number;
  plRealizadoTotal: number;
  numOperacoesAbertas: number;
  numOperacoesEncerradas: number;
  totalInvestidoHistorico: number;
}

export function computePortfolioSummary(positions: Position[]): PortfolioSummary {
  let capitalAlocadoAberto = 0;
  let plAbertoTotal = 0;
  let plRealizadoTotal = 0;
  let numOperacoesAbertas = 0;
  let numOperacoesEncerradas = 0;
  let totalInvestidoHistorico = 0;

  for (const p of positions) {
    if (p.status === "ABERTA") {
      const pl = computeOpenPL(p);
      capitalAlocadoAberto += pl.capital;
      plAbertoTotal += pl.totalOpenPL;
      numOperacoesAbertas += 1;
      totalInvestidoHistorico += pl.capital;
    } else {
      const r = computeRealizedPL(p);
      plRealizadoTotal += r.totalRealized;
      numOperacoesEncerradas += 1;
      totalInvestidoHistorico += capitalAlocado(p);
    }
  }

  return {
    capitalAlocadoAberto,
    plAbertoTotal,
    plRealizadoTotal,
    numOperacoesAbertas,
    numOperacoesEncerradas,
    totalInvestidoHistorico,
  };
}
