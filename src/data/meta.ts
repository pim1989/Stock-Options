/**
 * Metadados da safra de recomendações. Atualize `CARTEIRA_REVISADA_EM`
 * toda vez que o conteúdo de `recommendations.ts` for revisado (mesmo que
 * apenas para confirmar que as tese ainda valem) — é o que permite ao
 * usuário saber, de relance, se está olhando para uma leitura de mercado
 * fresca ou desatualizada.
 */
export const CARTEIRA_REVISADA_EM = "2026-08-19";

/** Quantos dias após a revisão a carteira passa a ser considerada "a confirmar". */
export const DIAS_PARA_ALERTA_DE_REVISAO = 14;
