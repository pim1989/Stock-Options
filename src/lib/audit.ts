import type { Recommendation, StrategyType } from "../types/domain";
import type { AuditFinding, AuditSeverity } from "../types/audit";
import { capitalAlocado, optionsNetCredit } from "./calculations";
import { computePayoffExtremes } from "./payoff";
import { todayISO } from "./format";
import { externalBenchmark } from "../data/auditBenchmark";

export type { AuditFinding, AuditSeverity } from "../types/audit";

export interface AuditReport {
  recommendationId: string;
  findings: AuditFinding[];
  severity: AuditSeverity;
  /** false = tem pelo menos uma FALHA — não pode ser oferecida para aceite. */
  passed: boolean;
}

const TOLERANCIA_RS = 5; // tolerância absoluta para arredondamentos, em R$
const TOLERANCIA_PCT = 0.01; // 1%

function closeEnough(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(TOLERANCIA_RS, Math.abs(b) * TOLERANCIA_PCT);
}

function severityRank(s: AuditSeverity): number {
  return s === "FALHA" ? 2 : s === "ALERTA" ? 1 : 0;
}

/**
 * Valida se a FORMA da estrutura (quais pernas, compra/venda, ordenação de
 * strikes) realmente corresponde ao tipo declarado e continua com risco
 * definido. É a barreira principal contra publicar, por engano, algo com
 * exposição descoberta ou com pernas trocadas.
 */
function checkStructure(rec: Recommendation): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const { strategyType, legs, requiresUnderlying, underlyingQtySuggested } = rec;
  const push = (severity: AuditSeverity, code: string, message: string) =>
    findings.push({ code, severity, message });

  const sameQty = legs.every((l) => l.quantity === legs[0]?.quantity);
  const sameExpiry = legs.every((l) => l.expiry === legs[0]?.expiry);

  switch (strategyType as StrategyType) {
    case "COVERED_CALL": {
      const [leg] = legs;
      if (legs.length !== 1 || !leg || leg.action !== "VENDA" || leg.type !== "CALL") {
        push("FALHA", "estrutura", "Covered call deveria ter exatamente 1 perna: venda de call.");
      } else if (!requiresUnderlying || !underlyingQtySuggested || underlyingQtySuggested < leg.quantity) {
        push(
          "FALHA",
          "cobertura",
          "Quantidade de ações sugerida é insuficiente para cobrir a call vendida — isso configura venda descoberta."
        );
      }
      break;
    }
    case "CASH_SECURED_PUT": {
      const [leg] = legs;
      if (legs.length !== 1 || !leg || leg.action !== "VENDA" || leg.type !== "PUT") {
        push("FALHA", "estrutura", "Cash-secured put deveria ter exatamente 1 perna: venda de put.");
      }
      if (requiresUnderlying) {
        push("ALERTA", "estrutura", "Cash-secured put não deveria depender de ativo-objeto em carteira.");
      }
      break;
    }
    case "PROTECTIVE_PUT": {
      const [leg] = legs;
      if (legs.length !== 1 || !leg || leg.action !== "COMPRA" || leg.type !== "PUT") {
        push("FALHA", "estrutura", "Protective put deveria ter exatamente 1 perna: compra de put.");
      } else if (!requiresUnderlying) {
        push("FALHA", "cobertura", "Protective put sem posse do ativo-objeto não faz sentido como proteção.");
      }
      break;
    }
    case "COLLAR": {
      const put = legs.find((l) => l.type === "PUT" && l.action === "COMPRA");
      const call = legs.find((l) => l.type === "CALL" && l.action === "VENDA");
      if (legs.length !== 2 || !put || !call) {
        push("FALHA", "estrutura", "Collar deveria ter exatamente 2 pernas: put comprada + call vendida.");
      } else if (!requiresUnderlying || !underlyingQtySuggested || underlyingQtySuggested < call.quantity) {
        push("FALHA", "cobertura", "Collar exige ativo-objeto suficiente para cobrir a call vendida.");
      } else if (put.strike >= call.strike) {
        push("ALERTA", "strikes", "Strike da put de proteção é maior ou igual ao da call vendida — faixa de resultado incomum, confirme se é intencional.");
      }
      break;
    }
    case "BULL_CALL_SPREAD": {
      const long = legs.find((l) => l.action === "COMPRA" && l.type === "CALL");
      const short = legs.find((l) => l.action === "VENDA" && l.type === "CALL");
      if (legs.length !== 2 || !long || !short) {
        push("FALHA", "estrutura", "Trava de alta com calls deveria ter 1 call comprada + 1 call vendida.");
      } else if (long.strike >= short.strike) {
        push("FALHA", "strikes", "Na trava de alta com calls, o strike comprado deve ser menor que o vendido.");
      }
      break;
    }
    case "BEAR_PUT_SPREAD": {
      const long = legs.find((l) => l.action === "COMPRA" && l.type === "PUT");
      const short = legs.find((l) => l.action === "VENDA" && l.type === "PUT");
      if (legs.length !== 2 || !long || !short) {
        push("FALHA", "estrutura", "Trava de baixa com puts deveria ter 1 put comprada + 1 put vendida.");
      } else if (long.strike <= short.strike) {
        push("FALHA", "strikes", "Na trava de baixa com puts, o strike comprado deve ser maior que o vendido.");
      }
      break;
    }
    case "BULL_PUT_SPREAD": {
      const long = legs.find((l) => l.action === "COMPRA" && l.type === "PUT");
      const short = legs.find((l) => l.action === "VENDA" && l.type === "PUT");
      if (legs.length !== 2 || !long || !short) {
        push("FALHA", "estrutura", "Trava de alta com puts (crédito) deveria ter 1 put comprada + 1 put vendida.");
      } else if (short.strike <= long.strike) {
        push("FALHA", "strikes", "Na trava de crédito com puts, o strike vendido deve ser maior que o comprado.");
      } else if (short.premium <= long.premium) {
        push("FALHA", "credito", "Trava de crédito com puts deveria gerar crédito líquido positivo na montagem.");
      }
      break;
    }
    case "BEAR_CALL_SPREAD": {
      const long = legs.find((l) => l.action === "COMPRA" && l.type === "CALL");
      const short = legs.find((l) => l.action === "VENDA" && l.type === "CALL");
      if (legs.length !== 2 || !long || !short) {
        push("FALHA", "estrutura", "Trava de baixa com calls (crédito) deveria ter 1 call comprada + 1 call vendida.");
      } else if (short.strike >= long.strike) {
        push("FALHA", "strikes", "Na trava de crédito com calls, o strike vendido deve ser menor que o comprado.");
      } else if (short.premium <= long.premium) {
        push("FALHA", "credito", "Trava de crédito com calls deveria gerar crédito líquido positivo na montagem.");
      }
      break;
    }
    case "IRON_CONDOR": {
      const putBuy = legs.find((l) => l.type === "PUT" && l.action === "COMPRA");
      const putSell = legs.find((l) => l.type === "PUT" && l.action === "VENDA");
      const callSell = legs.find((l) => l.type === "CALL" && l.action === "VENDA");
      const callBuy = legs.find((l) => l.type === "CALL" && l.action === "COMPRA");
      if (legs.length !== 4 || !putBuy || !putSell || !callSell || !callBuy) {
        push("FALHA", "estrutura", "Iron condor deveria ter 4 pernas: put comprada, put vendida, call vendida e call comprada.");
      } else if (!(putBuy.strike < putSell.strike && putSell.strike < callSell.strike && callSell.strike < callBuy.strike)) {
        push("FALHA", "strikes", "Strikes do iron condor fora de ordem — esperado: put comprada < put vendida < call vendida < call comprada.");
      } else if (optionsNetCredit(legs) <= 0) {
        push("FALHA", "credito", "Iron condor deveria gerar crédito líquido positivo na montagem.");
      }
      break;
    }
    case "IRON_BUTTERFLY": {
      const putBuy = legs.find((l) => l.type === "PUT" && l.action === "COMPRA");
      const putSell = legs.find((l) => l.type === "PUT" && l.action === "VENDA");
      const callSell = legs.find((l) => l.type === "CALL" && l.action === "VENDA");
      const callBuy = legs.find((l) => l.type === "CALL" && l.action === "COMPRA");
      if (legs.length !== 4 || !putBuy || !putSell || !callSell || !callBuy) {
        push("FALHA", "estrutura", "Iron butterfly deveria ter 4 pernas: put comprada, put vendida, call vendida e call comprada.");
      } else if (putSell.strike !== callSell.strike) {
        push("FALHA", "strikes", "Iron butterfly exige que a put vendida e a call vendida estejam no mesmo strike (o centro da borboleta).");
      } else if (!(putBuy.strike < putSell.strike && callSell.strike < callBuy.strike)) {
        push("FALHA", "strikes", "Strikes do iron butterfly fora de ordem — as pontas compradas devem ficar fora do strike central.");
      } else if (optionsNetCredit(legs) <= 0) {
        push("FALHA", "credito", "Iron butterfly deveria gerar crédito líquido positivo na montagem.");
      }
      break;
    }
    case "LONG_STRADDLE": {
      const call = legs.find((l) => l.type === "CALL" && l.action === "COMPRA");
      const put = legs.find((l) => l.type === "PUT" && l.action === "COMPRA");
      if (legs.length !== 2 || !call || !put) {
        push("FALHA", "estrutura", "Straddle comprado deveria ter 2 pernas: 1 call comprada + 1 put comprada.");
      } else if (call.strike !== put.strike) {
        push("FALHA", "strikes", "Straddle exige call e put no mesmo strike (normalmente ATM) — strikes diferentes configuram um strangle.");
      }
      break;
    }
    case "LONG_STRANGLE": {
      const call = legs.find((l) => l.type === "CALL" && l.action === "COMPRA");
      const put = legs.find((l) => l.type === "PUT" && l.action === "COMPRA");
      if (legs.length !== 2 || !call || !put) {
        push("FALHA", "estrutura", "Strangle comprado deveria ter 2 pernas: 1 call comprada + 1 put comprada.");
      } else if (call.strike <= put.strike) {
        push("FALHA", "strikes", "No strangle, o strike da call comprada deve ser maior que o da put comprada (ambas OTM).");
      }
      break;
    }
    case "JADE_LIZARD": {
      const put = legs.find((l) => l.type === "PUT" && l.action === "VENDA");
      const callSell = legs.find((l) => l.type === "CALL" && l.action === "VENDA");
      const callBuy = legs.find((l) => l.type === "CALL" && l.action === "COMPRA");
      if (legs.length !== 3 || !put || !callSell || !callBuy) {
        push("FALHA", "estrutura", "Jade lizard deveria ter 3 pernas: put vendida (caixa reservado), call vendida e call comprada.");
      } else if (requiresUnderlying) {
        push("ALERTA", "estrutura", "Jade lizard não deveria depender de ativo-objeto em carteira — a proteção vem do caixa reservado da put e da trava de calls.");
      } else if (!(put.strike < callSell.strike && callSell.strike < callBuy.strike)) {
        push("FALHA", "strikes", "Strikes do jade lizard fora de ordem — esperado: put vendida < call vendida < call comprada.");
      } else if (callSell.premium <= callBuy.premium) {
        push("FALHA", "credito", "A trava de calls do jade lizard deveria gerar crédito líquido positivo.");
      }
      break;
    }
  }

  if (legs.length === 2 && !sameQty) {
    push("ALERTA", "quantidades", "As duas pernas da trava têm quantidades diferentes — confira se é proposital (trava assimétrica).");
  }
  if (legs.length === 2 && !sameExpiry) {
    push("ALERTA", "vencimento", "As duas pernas da trava têm vencimentos diferentes.");
  }

  // Barreira geral: qualquer perna vendida sem cobertura por ativo ou por outra perna comprada.
  for (const leg of legs) {
    if (leg.action !== "VENDA") continue;
    const coberta =
      (leg.type === "CALL" && requiresUnderlying && (underlyingQtySuggested ?? 0) >= leg.quantity) ||
      legs.some((other) => other.action === "COMPRA" && other.type === leg.type) ||
      strategyType === "CASH_SECURED_PUT" ||
      // Jade lizard: a put vendida é coberta pelo caixa reservado (mesma lógica da
      // cash-secured put), não por uma perna comprada do mesmo tipo.
      (strategyType === "JADE_LIZARD" && leg.type === "PUT");
    if (!coberta) {
      push("FALHA", "descoberto", `Perna de venda (${leg.type} strike ${leg.strike}) sem cobertura identificada — possível exposição descoberta.`);
    }
  }

  return findings;
}

/** Recalcula ganho/perda máxima e breakeven a partir das próprias pernas e compara com o divulgado. */
function checkMath(rec: Recommendation): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const underlying =
    rec.requiresUnderlying && rec.underlyingQtySuggested
      ? { qty: rec.underlyingQtySuggested, entryPrice: rec.underlyingRefPrice }
      : undefined;

  const computed = computePayoffExtremes(rec.legs, underlying);

  if (!closeEnough(computed.maxGain, rec.maxGain)) {
    findings.push({
      code: "math-maxgain",
      severity: "FALHA",
      message: `Ganho máximo divulgado (R$ ${rec.maxGain.toFixed(2)}) não confere com o recalculado a partir das pernas (R$ ${computed.maxGain.toFixed(2)}).`,
    });
  }
  if (!closeEnough(computed.maxLoss, rec.maxLoss)) {
    findings.push({
      code: "math-maxloss",
      severity: "FALHA",
      message: `Perda máxima divulgada (R$ ${rec.maxLoss.toFixed(2)}) não confere com a recalculada a partir das pernas (R$ ${computed.maxLoss.toFixed(2)}).`,
    });
  }

  const declaredBreakevens = [...rec.breakeven].sort((a, b) => a - b);
  const computedBreakevens = [...computed.breakevens].sort((a, b) => a - b);
  const breakevensMatch =
    declaredBreakevens.length === computedBreakevens.length &&
    declaredBreakevens.every((v, i) => closeEnough(v, computedBreakevens[i]));
  if (!breakevensMatch) {
    findings.push({
      code: "math-breakeven",
      severity: "FALHA",
      message: `Breakeven divulgado (${declaredBreakevens.map((v) => v.toFixed(2)).join(", ")}) não confere com o recalculado (${computedBreakevens.map((v) => v.toFixed(2)).join(", ") || "nenhum"}).`,
    });
  }

  const computedCapital = capitalAlocado({
    strategyType: rec.strategyType,
    legs: rec.legs,
    underlyingQty: rec.underlyingQtySuggested,
    underlyingEntryPrice: rec.underlyingRefPrice,
  });
  if (!closeEnough(computedCapital, rec.capitalAlocado)) {
    findings.push({
      code: "math-capital",
      severity: "FALHA",
      message: `Capital alocado divulgado (R$ ${rec.capitalAlocado.toFixed(2)}) não confere com o recalculado (R$ ${computedCapital.toFixed(2)}).`,
    });
  }

  if (rec.maxLoss < 0 || !Number.isFinite(rec.maxLoss)) {
    findings.push({ code: "math-finito", severity: "FALHA", message: "Perda máxima não é um número finito e não-negativo." });
  }

  return findings;
}

function checkDatesAndContent(rec: Recommendation): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const today = todayISO();

  if (rec.dateIssued > today) {
    findings.push({ code: "data-futura", severity: "FALHA", message: "Data de emissão está no futuro." });
  }
  if (rec.validUntil <= rec.dateIssued) {
    findings.push({ code: "data-validade", severity: "FALHA", message: "Validade não é posterior à data de emissão." });
  }
  for (const leg of rec.legs) {
    if (leg.expiry < rec.validUntil) {
      findings.push({
        code: "data-vencimento-perna",
        severity: "FALHA",
        message: `Perna com vencimento (${leg.expiry}) anterior à validade divulgada da recomendação (${rec.validUntil}).`,
      });
    }
  }
  if (rec.validUntil < today) {
    findings.push({ code: "expirada", severity: "ALERTA", message: `Validade expirou em ${rec.validUntil} — reavaliar cenário antes de montar.` });
  }

  if (!rec.thesis.macro || rec.thesis.macro.length < 40) {
    findings.push({ code: "tese-macro", severity: "FALHA", message: "Justificativa macro ausente ou insuficiente." });
  }
  if (!rec.thesis.micro || rec.thesis.micro.length < 40) {
    findings.push({ code: "tese-micro", severity: "FALHA", message: "Justificativa sobre o ativo ausente ou insuficiente." });
  }
  if (!rec.thesis.riscos || rec.thesis.riscos.length < 20) {
    findings.push({ code: "tese-riscos", severity: "FALHA", message: "Seção de riscos ausente ou insuficiente." });
  }
  if (!rec.underlyingRefPrice || rec.underlyingRefPrice <= 0) {
    findings.push({ code: "preco-ref", severity: "FALHA", message: "Preço de referência do ativo ausente ou inválido." });
  }

  return findings;
}

export function auditRecommendation(rec: Recommendation): AuditReport {
  const findings = [
    ...checkStructure(rec),
    ...checkMath(rec),
    ...checkDatesAndContent(rec),
    ...(externalBenchmark[rec.id]?.findings ?? []),
  ];

  const severity = findings.reduce<AuditSeverity>(
    (worst, f) => (severityRank(f.severity) > severityRank(worst) ? f.severity : worst),
    "OK"
  );

  return {
    recommendationId: rec.id,
    findings,
    severity,
    passed: !findings.some((f) => f.severity === "FALHA"),
  };
}

export function auditPortfolio(recs: Recommendation[]): AuditReport[] {
  return recs.map(auditRecommendation);
}
