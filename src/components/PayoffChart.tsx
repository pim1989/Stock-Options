import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OptionLeg } from "../types/domain";
import { buildPriceRange, computePayoffAtExpiry } from "../lib/payoff";
import { formatBRL } from "../lib/format";

const GAIN = "#0f7a4a";
const LOSS = "#b3261e";

/**
 * Gráfico de payoff no vencimento: eixo X é o preço do ativo-objeto,
 * eixo Y é o resultado financeiro da estrutura completa naquele preço.
 * Serve para visualizar de forma imediata onde fica o breakeven e os
 * tetos de ganho/perda de qualquer estrutura coberta.
 */
export function PayoffChart({
  legs,
  refPrice,
  requiresUnderlying,
  underlyingQty,
  underlyingEntryPrice,
  height = 180,
}: {
  legs: OptionLeg[];
  refPrice: number;
  requiresUnderlying?: boolean;
  underlyingQty?: number;
  underlyingEntryPrice?: number;
  height?: number;
}) {
  const gainGradId = `payoffGain-${useId()}`;
  const lossGradId = `payoffLoss-${useId()}`;

  if (!refPrice || legs.length === 0) return null;

  const range = buildPriceRange(refPrice);
  const underlying =
    requiresUnderlying && underlyingQty && underlyingEntryPrice
      ? { qty: underlyingQty, entryPrice: underlyingEntryPrice }
      : undefined;
  const data = computePayoffAtExpiry(legs, range, underlying);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gainGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GAIN} stopOpacity={0.4} />
            <stop offset="100%" stopColor={GAIN} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id={lossGradId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={LOSS} stopOpacity={0.4} />
            <stop offset="100%" stopColor={LOSS} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5eb" vertical={false} />
        <XAxis
          dataKey="price"
          tickFormatter={(v) => Number(v).toFixed(0)}
          tick={{ fontSize: 10 }}
          type="number"
          domain={["dataMin", "dataMax"]}
        />
        <YAxis
          tickFormatter={(v) => `${(Number(v) / 1000).toFixed(1)}k`}
          tick={{ fontSize: 10 }}
          width={40}
        />
        <Tooltip
          formatter={(v, name) => (name === "price" ? undefined : [formatBRL(Number(v)), "Resultado"])}
          labelFormatter={(v) => `Preço do ativo: ${formatBRL(Number(v))}`}
        />
        <ReferenceLine y={0} stroke="#9aa1af" strokeWidth={1} />
        <ReferenceLine
          x={refPrice}
          stroke="#0f5f4c"
          strokeDasharray="4 3"
          label={{ value: "ref.", position: "insideTopRight", fontSize: 10, fill: "#0f5f4c" }}
        />
        <Area
          type="monotone"
          dataKey="positive"
          stroke={GAIN}
          strokeWidth={1.5}
          fill={`url(#${gainGradId})`}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="negative"
          stroke={LOSS}
          strokeWidth={1.5}
          fill={`url(#${lossGradId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
