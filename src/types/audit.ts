/** Tipos compartilhados entre o motor de auditoria e os dados de benchmark externo
 * (ficam num arquivo à parte para evitar import circular entre os dois). */

export type AuditSeverity = "OK" | "ALERTA" | "FALHA";

export interface AuditFinding {
  code: string;
  severity: AuditSeverity;
  message: string;
}
