import type { MarkUpdate, OptionLeg, Position } from "../types/domain";

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

/** Capital alocado/em risco estimado para a posição (sempre finito). */
export function capitalAlocado(position: Position): number {
  const { strategyType, legs, underlyingQty, underlyingEntryPrice } = position;

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
