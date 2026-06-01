/** Peso de severidad para ordenar (mayor = más grave). */
export function severityRank(severity?: string): number {
  const u = (severity ?? "").toUpperCase();
  if (u.includes("CRITICAL") || u.includes("CRIT")) {
    return 3;
  }
  if (u.includes("WARN")) {
    return 2;
  }
  if (u.includes("INFO")) {
    return 1;
  }
  return 0;
}
