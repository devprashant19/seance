/**
 * Where the browser should reach the relay: `VITE_RELAY_URL` when set (production), otherwise the
 * page's own origin + `/relay`, which the Vite dev server proxies to the local relay (so phones on
 * an HTTPS page can reach it as wss:// without mixed-content blocking).
 */
export function relayUrl(): string {
  const fromEnv = import.meta.env.VITE_RELAY_URL as string | undefined;
  if (fromEnv) return fromEnv;
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${location.host}/relay`;
}
