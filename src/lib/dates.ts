/** `YYYY-MM-DD` del selector de fecha → inicio del día local en ISO-8601. */
export function dayInputToRangeStartIso(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map((n) => Number.parseInt(n, 10));
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

/** Fin del día local (23:59:59.999) en ISO-8601. */
export function dayInputToRangeEndIso(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map((n) => Number.parseInt(n, 10));
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}
