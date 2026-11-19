import "server-only";

/** O catálogo está vazio; seleções antigas não habilitam cobranças. */
export interface GatewaySettings {
  provider: string | null;
  enabled: boolean;
  configured: boolean;
}

export function settings(): GatewaySettings {
  return { provider: null, enabled: false, configured: false };
}
