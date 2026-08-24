import type { MarketDirection, Recommendation, StrategyType } from "../types/domain";
import type { AuditFinding, AuditSeverity } from "../types/audit";
import { capitalAlocado, optionsNetCredit } from "./calculations";
import { computePayoffExtremes, hasMixedExpiries, netSlopeAboveHighestStrike } from "./payoff";
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
    case "PUT_RATIO_SPREAD": {
      const long = legs.find((l) => l.type === "PUT" && l.action === "COMPRA");
      const short = legs.find((l) => l.type === "PUT" && l.action === "VENDA");
      if (legs.length !== 2 || !long || !short) {
        push("FALHA", "estrutura", "Put ratio spread deveria ter 2 pernas: 1 put comprada (strike mais alto) + 1 put vendida (strike mais baixo, quantidade maior).");
      } else if (long.strike <= short.strike) {
        push("FALHA", "strikes", "No put ratio spread, o strike da put comprada deve ser maior que o da put vendida.");
      } else if (short.quantity <= long.quantity) {
        push("FALHA", "quantidades", "Put ratio spread exige quantidade vendida maior que a comprada (é a razão diferente de 1:1 que define a estrutura).");
      }
      break;
    }
    case "CALL_RATIO_BACKSPREAD": {
      const long = legs.find((l) => l.type === "CALL" && l.action === "COMPRA");
      const short = legs.find((l) => l.type === "CALL" && l.action === "VENDA");
      if (legs.length !== 2 || !long || !short) {
        push("FALHA", "estrutura", "Call ratio backspread deveria ter 2 pernas: 1 call vendida (strike mais baixo) + 1 call comprada (strike mais alto, quantidade maior).");
      } else if (short.strike >= long.strike) {
        push("FALHA", "strikes", "No call ratio backspread, o strike da call vendida deve ser menor que o da call comprada.");
      } else if (long.quantity <= short.quantity) {
        push("FALHA", "quantidades", "Call ratio backspread exige quantidade comprada maior que a vendida — é o que garante ganho sem teto na alta e mantém o risco finito.");
      }
      break;
    }
    case "PUT_RATIO_BACKSPREAD": {
      const long = legs.find((l) => l.type === "PUT" && l.action === "COMPRA");
      const short = legs.find((l) => l.type === "PUT" && l.action === "VENDA");
      if (legs.length !== 2 || !long || !short) {
        push("FALHA", "estrutura", "Put ratio backspread deveria ter 2 pernas: 1 put vendida (strike mais alto) + 1 put comprada (strike mais baixo, quantidade maior).");
      } else if (short.strike <= long.strike) {
        push("FALHA", "strikes", "No put ratio backspread, o strike da put vendida deve ser maior que o da put comprada.");
      } else if (long.quantity <= short.quantity) {
        push("FALHA", "quantidades", "Put ratio backspread exige quantidade comprada maior que a vendida.");
      }
      break;
    }
    case "BOOSTER": {
      const long = legs.find((l) => l.type === "CALL" && l.action === "COMPRA");
      const short = legs.find((l) => l.type === "CALL" && l.action === "VENDA");
      if (legs.length !== 2 || !long || !short) {
        push("FALHA", "estrutura", "Booster deveria ter 2 pernas: 1 call comprada (ATM) + 1 call vendida (OTM, quantidade maior).");
      } else if (long.strike >= short.strike) {
        push("FALHA", "strikes", "No booster, o strike da call comprada deve ser menor que o da call vendida.");
      } else if (!requiresUnderlying || !underlyingQtySuggested || underlyingQtySuggested < long.quantity) {
        push("FALHA", "cobertura", "Booster exige ação em carteira suficiente para cobrir, junto com a call comprada, a call vendida em dobro.");
      }
      break;
    }
    case "INVERSE_LINE_BULL": {
      const call = legs.find((l) => l.type === "CALL" && l.action === "COMPRA");
      const put = legs.find((l) => l.type === "PUT" && l.action === "VENDA");
      if (legs.length !== 2 || !call || !put) {
        push("FALHA", "estrutura", "Inverse line (compra sintética) deveria ter 2 pernas: 1 call comprada + 1 put vendida.");
      } else if (call.strike !== put.strike) {
        push("FALHA", "strikes", "Inverse line exige call e put no mesmo strike — é isso que replica o payoff de possuir a ação.");
      } else if (requiresUnderlying) {
        push("ALERTA", "estrutura", "Inverse line não deveria depender de ativo-objeto em carteira — é uma alternativa a possuí-lo, não um complemento.");
      }
      break;
    }
    case "CALENDAR_SPREAD": {
      const short = legs.find((l) => l.action === "VENDA");
      const long = legs.find((l) => l.action === "COMPRA");
      if (legs.length !== 2 || !short || !long) {
        push("FALHA", "estrutura", "Calendário (THL) deveria ter 2 pernas: 1 opção vendida (vencimento curto) + 1 comprada (vencimento longo).");
      } else if (short.strike !== long.strike || short.type !== long.type) {
        push("FALHA", "strikes", "Calendário exige as duas pernas no mesmo strike e mesmo tipo (só o vencimento muda).");
      } else if (short.expiry >= long.expiry) {
        push("FALHA", "vencimento", "Na trava de calendário, a perna vendida precisa ter vencimento mais curto que a comprada.");
      }
      break;
    }
  }

  const asymmetricByDesign: StrategyType[] = ["PUT_RATIO_SPREAD", "CALL_RATIO_BACKSPREAD", "PUT_RATIO_BACKSPREAD", "BOOSTER"];
  if (legs.length === 2 && !sameQty && !asymmetricByDesign.includes(strategyType)) {
    push("ALERTA", "quantidades", "As duas pernas da trava têm quantidades diferentes — confira se é proposital (trava assimétrica).");
  }
  if (legs.length === 2 && !sameExpiry && strategyType !== "CALENDAR_SPREAD") {
    push("ALERTA", "vencimento", "As duas pernas da trava têm vencimentos diferentes.");
  }

  // Única barreira de risco realmente rígida do app: prova analítica (não uma opinião
  // por tipo de estrutura) de que não existe exposição vendida em calls sem limite
  // acima do maior strike. É a ÚNICA forma de perda genuinamente ilimitada em opções
  // (puts nunca geram isso — o ativo não vai abaixo de zero, então toda put vendida já
  // tem perda máxima finita por natureza, sem precisar de nenhuma perna de cobertura).
  const underlyingForSlope =
    requiresUnderlying && underlyingQtySuggested
      ? { qty: underlyingQtySuggested, entryPrice: rec.underlyingRefPrice }
      : undefined;
  const slope = netSlopeAboveHighestStrike(legs, underlyingForSlope);
  if (slope < 0) {
    push(
      "FALHA",
      "descoberto",
      `Exposição vendida em calls não coberta acima do maior strike (excedente de ${Math.abs(slope)} opção(ões)) — a única forma de risco genuinamente ilimitado em opções.`
    );
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

  // Estruturas de calendário (vencimentos diferentes) não têm um payoff-no-vencimento
  // confiável no modelo deste app (ver hasMixedExpiries) — pula a comparação de
  // ganho/perda/breakeven calculados a partir das pernas, mas mantém as outras checagens.
  const mixedExpiries = hasMixedExpiries(rec.legs);
  const computed = mixedExpiries ? null : computePayoffExtremes(rec.legs, underlying);

  if (computed) {
    if (computed.maxGainUnlimited !== !!rec.maxGainUnlimited) {
      findings.push({
        code: "math-maxgain-teto",
        severity: "FALHA",
        message: computed.maxGainUnlimited
          ? "A estrutura tem ganho sem teto na alta (mais opções compradas que vendidas em calls), mas a recomendação não está marcada com maxGainUnlimited."
          : "A recomendação está marcada como ganho sem teto (maxGainUnlimited), mas a estrutura na verdade tem um ganho máximo finito.",
      });
    } else if (!computed.maxGainUnlimited && !closeEnough(computed.maxGain, rec.maxGain)) {
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

  if (!rec.thesis.headline || rec.thesis.headline.length < 30) {
    findings.push({ code: "tese-headline", severity: "FALHA", message: "Frase-chamada (headline) da tese ausente ou insuficiente — toda recomendação precisa de um 'call' específico e testável, não só parágrafos soltos." });
  }
  if (!rec.thesis.expectedMove || rec.thesis.expectedMove.length < 20) {
    findings.push({ code: "tese-expected-move", severity: "FALHA", message: "Visão explícita de comportamento de preço até o vencimento ausente ou insuficiente." });
  }
  if (!rec.thesis.catalysts || rec.thesis.catalysts.length === 0) {
    findings.push({ code: "tese-catalysts", severity: "FALHA", message: "Nenhum catalisador/evento concreto listado — sem isso a tese não é verificável." });
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
  if (!rec.thesis.invalidacao || rec.thesis.invalidacao.length < 20) {
    findings.push({ code: "tese-invalidacao", severity: "FALHA", message: "Condição de invalidação da tese ausente ou insuficiente — precisa ficar explícito o que provaria a tese errada, separado dos riscos gerais." });
  }
  if (!rec.thesis.conviction) {
    findings.push({ code: "tese-conviction", severity: "FALHA", message: "Nível de convicção da tese ausente." });
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

const DIRECTION_BUCKET: Record<MarketDirection, "BULLISH" | "BEARISH" | "NEUTRAL"> = {
  ALTA: "BULLISH",
  BAIXA: "BEARISH",
  NEUTRO: "NEUTRAL",
  LATERAL: "NEUTRAL",
};

/**
 * Checagem entre recomendações (não dá pra fazer olhando uma de cada vez):
 * duas recomendações ATIVAS sobre o MESMO ticker com direções de mercado
 * incompatíveis (ex.: uma aposta em queda e outra em lateralização/alta)
 * reprovam AMBAS. Existe porque uma carteira recomendada só pode sustentar
 * uma tese de direção por ativo de cada vez — publicar duas teses opostas
 * lado a lado e pedir para o usuário "escolher uma" não é uma recomendação,
 * é empurrar a decisão. NEUTRO e LATERAL contam como a mesma leitura
 * (nenhuma delas é uma aposta direcional), então podem conviver.
 */
function checkPortfolioCoherence(recs: Recommendation[]): Map<string, AuditFinding[]> {
  const byTicker = new Map<string, Recommendation[]>();
  for (const r of recs) {
    if (r.status !== "ATIVA") continue;
    if (!byTicker.has(r.ticker)) byTicker.set(r.ticker, []);
    byTicker.get(r.ticker)!.push(r);
  }

  const extra = new Map<string, AuditFinding[]>();
  for (const [ticker, group] of byTicker) {
    if (group.length < 2) continue;
    const buckets = new Set(group.map((r) => DIRECTION_BUCKET[r.direction]));
    if (buckets.size <= 1) continue;

    for (const r of group) {
      const others = group
        .filter((o) => o.id !== r.id)
        .map((o) => `${o.strategyType} (${o.direction})`)
        .join(", ");
      const list = extra.get(r.id) ?? [];
      list.push({
        code: "coerencia-direcao",
        severity: "FALHA",
        message: `Direção (${r.direction}) conflita com outra recomendação ativa sobre ${ticker}: ${others}. Uma carteira recomendada não pode publicar duas teses de direção incompatíveis sobre o mesmo ativo ao mesmo tempo.`,
      });
      extra.set(r.id, list);
    }
  }
  return extra;
}

export function auditPortfolio(recs: Recommendation[]): AuditReport[] {
  const coherence = checkPortfolioCoherence(recs);
  return recs.map((r) => {
    const base = auditRecommendation(r);
    const extra = coherence.get(r.id);
    if (!extra || extra.length === 0) return base;

    const findings = [...base.findings, ...extra];
    const severity = findings.reduce<AuditSeverity>(
      (worst, f) => (severityRank(f.severity) > severityRank(worst) ? f.severity : worst),
      "OK"
    );
    return {
      recommendationId: r.id,
      findings,
      severity,
      passed: !findings.some((f) => f.severity === "FALHA"),
    };
  });
}
