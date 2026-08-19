import type { Position } from "../types/domain";
import { computeRealizedPL } from "./calculations";

/**
 * Motor de apuração de IR sobre operações com opções na B3.
 *
 * Regras aplicadas (Instrução Normativa RFB 1.585, arts. 55-58, e
 * Lei 11.033/2004 art. 3º combinado com Lei 8.981/1995 art. 76):
 *
 *  - Operações com OPÇÕES são SEMPRE tributadas, tanto em ganho quanto em
 *    prejuízo apurado — NÃO existe a isenção de R$ 20.000/mês em vendas
 *    que vale apenas para ações à vista fora do day trade.
 *  - Alíquota de 15% sobre o ganho líquido mensal em operações comuns
 *    (código de receita DARF 6015).
 *  - Alíquota de 20% sobre o ganho líquido mensal em operações day trade
 *    (código de receita DARF 5273).
 *  - Prejuízos apurados em um mês podem ser compensados com ganhos de
 *    meses seguintes, DENTRO DA MESMA MODALIDADE (comum compensa comum,
 *    day trade compensa day trade), sem prazo de prescrição.
 *  - Fica dispensado o recolhimento quando o imposto apurado no mês,
 *    após compensações, for inferior a R$ 10,00 (art. 78 da IN 1.585).
 *  - O DARF vence no último dia útil do mês subsequente ao da apuração.
 *
 * IMPORTANTE: este módulo é uma ferramenta de apoio e organização.
 * Ele NÃO substitui orientação de um contador — regras de IRPF podem
 * mudar e há particularidades (ex.: exercício de opções, dividendos,
 * JCP, outras classes de ativos) que exigem análise integrada com o
 * restante da carteira do investidor.
 */

export type Modalidade = "COMUM" | "DAY_TRADE";

export const ALIQUOTA: Record<Modalidade, number> = {
  COMUM: 0.15,
  DAY_TRADE: 0.2,
};

export const CODIGO_DARF: Record<Modalidade, string> = {
  COMUM: "6015",
  DAY_TRADE: "5273",
};

export interface MonthlyTaxResult {
  competencia: string; // "YYYY-MM"
  modalidade: Modalidade;
  resultadoMes: number;
  prejuizoCompensado: number;
  baseCalculo: number;
  irDevido: number;
  prejuizoAcumuladoRestante: number;
  vencimento: string; // ISO
  abaixoDoMinimo: boolean;
  positions: { id: string; ticker: string; resultado: number }[];
}

function competenciaOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

function addMonths(competencia: string, n: number): string {
  const [y, m] = competencia.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function lastBusinessDayOfMonth(competencia: string): Date {
  const [y, m] = competencia.split("-").map(Number);
  const d = new Date(y, m, 0); // último dia do mês
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export function darfVencimento(competenciaApuracao: string): string {
  const mesSeguinte = addMonths(competenciaApuracao, 1);
  return lastBusinessDayOfMonth(mesSeguinte).toISOString().slice(0, 10);
}

/** Apura o IR mês a mês, por modalidade, com compensação de prejuízos em cascata. */
export function computeMonthlyTax(positions: Position[]): MonthlyTaxResult[] {
  const closed = positions.filter((p) => p.status === "ENCERRADA" && p.closedDate);

  const byKey = new Map<
    string,
    { competencia: string; modalidade: Modalidade; items: { id: string; ticker: string; resultado: number }[] }
  >();

  for (const p of closed) {
    const modalidade: Modalidade = p.dayTrade ? "DAY_TRADE" : "COMUM";
    const competencia = competenciaOf(p.closedDate!);
    const key = `${competencia}|${modalidade}`;
    const { optionsRealized } = computeRealizedPL(p);
    if (!byKey.has(key)) byKey.set(key, { competencia, modalidade, items: [] });
    byKey.get(key)!.items.push({ id: p.id, ticker: p.ticker, resultado: optionsRealized });
  }

  const results: MonthlyTaxResult[] = [];

  for (const modalidade of ["COMUM", "DAY_TRADE"] as Modalidade[]) {
    const keys = [...byKey.values()]
      .filter((g) => g.modalidade === modalidade)
      .sort((a, b) => a.competencia.localeCompare(b.competencia));

    let prejuizoAcumulado = 0;

    for (const g of keys) {
      const resultadoMes = g.items.reduce((acc, i) => acc + i.resultado, 0);
      let prejuizoCompensado = 0;
      let baseCalculo = 0;

      if (resultadoMes > 0) {
        prejuizoCompensado = Math.min(prejuizoAcumulado, resultadoMes);
        baseCalculo = resultadoMes - prejuizoCompensado;
        prejuizoAcumulado -= prejuizoCompensado;
      } else {
        prejuizoAcumulado += -resultadoMes;
      }

      const irDevido = baseCalculo * ALIQUOTA[modalidade];

      results.push({
        competencia: g.competencia,
        modalidade,
        resultadoMes,
        prejuizoCompensado,
        baseCalculo,
        irDevido,
        prejuizoAcumuladoRestante: prejuizoAcumulado,
        vencimento: darfVencimento(g.competencia),
        abaixoDoMinimo: irDevido > 0 && irDevido < 10,
        positions: g.items,
      });
    }
  }

  return results.sort((a, b) => a.competencia.localeCompare(b.competencia));
}

export type AlertLevel = "ATRASADO" | "PROXIMO" | "FUTURO" | "DISPENSADO";

export interface DarfAlert {
  result: MonthlyTaxResult;
  level: AlertLevel;
  diasParaVencimento: number;
  valorDevido: number;
}

/** Gera alertas de DARF a pagar, cruzando com os pagamentos já confirmados pelo usuário. */
export function buildDarfAlerts(
  results: MonthlyTaxResult[],
  paidKeys: Set<string>
): DarfAlert[] {
  const now = new Date();
  const alerts: DarfAlert[] = [];

  for (const r of results) {
    const key = `${r.competencia}|${r.modalidade}`;
    if (paidKeys.has(key)) continue;
    if (r.irDevido <= 0) continue;

    const venc = new Date(r.vencimento + "T23:59:59");
    const diasParaVencimento = Math.ceil((venc.getTime() - now.getTime()) / 86400000);

    let level: AlertLevel;
    if (r.abaixoDoMinimo) level = "DISPENSADO";
    else if (diasParaVencimento < 0) level = "ATRASADO";
    else if (diasParaVencimento <= 10) level = "PROXIMO";
    else level = "FUTURO";

    alerts.push({ result: r, level, diasParaVencimento, valorDevido: r.irDevido });
  }

  return alerts.sort((a, b) => a.diasParaVencimento - b.diasParaVencimento);
}
