/** URL base del API Gateway (solo servidor Next: Route Handlers / BFF). */
export function getSentinellaApiOrigin(): string {
  const url = process.env.SENTINELLA_API_URL?.trim();
  if (!url) {
    /** Por defecto 127.0.0.1: en Windows `localhost` a veces resuelve a IPv6 y el gateway solo escucha en IPv4. */
    return "http://127.0.0.1:8080";
  }
  return url.replace(/\/$/, "");
}

/**
 * Prefijo REST hacia Sentinella:
 * - Gateway (p. ej. `:8080`): `{origin}/api/v1` → el gateway reenvía a `/v1/...` en cada microservicio.
 * - IAM solo (p. ej. `:8081`): los controladores están en `/v1/...` sin `/api`; usar `{origin}/v1`.
 * Si `SENTINELLA_API_URL` apunta al IAM pero se usa `/api/v1`, el IAM devuelve 404 HTML → el BFF falla al parsear JSON.
 */
export function getSentinellaGatewayRestPrefix(): string {
  const origin = getSentinellaApiOrigin();
  const manualPrefix = process.env.SENTINELLA_API_PATH_PREFIX?.trim();
  if (manualPrefix) {
    if (manualPrefix.startsWith("http://") || manualPrefix.startsWith("https://")) {
      return manualPrefix.replace(/\/$/, "");
    }
    return `${origin}${manualPrefix.startsWith("/") ? "" : "/"}${manualPrefix}`.replace(/\/$/, "");
  }

  const flag = process.env.SENTINELLA_USE_IAM_DIRECT?.trim();
  let useIamV1Path = false;
  if (flag === "true") {
    useIamV1Path = true;
  } else if (flag === "false") {
    useIamV1Path = false;
  } else {
    try {
      const base = origin.includes("://") ? origin : `http://${origin}`;
      useIamV1Path = new URL(base).port === "8081";
    } catch {
      useIamV1Path = false;
    }
  }

  const suffix = useIamV1Path ? "/v1" : "/api/v1";
  return `${origin}${suffix}`;
}
