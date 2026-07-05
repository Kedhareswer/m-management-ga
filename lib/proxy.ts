/**
 * Optional user-supplied proxy for the scraper only (separate from the
 * agent-proxy this whole session runs behind). Off by default — set
 * SCRAPER_PROXY to route extraction requests for specific sites you have
 * legitimate access to through your own proxy (residential ISP, VPN,
 * self-hosted). This is a config knob the user controls, not built-in
 * evasion: it changes which network path our polite, honestly-identified
 * requests take, nothing about how they identify themselves.
 */

const SCRAPER_PROXY = process.env.SCRAPER_PROXY?.trim() || '';

export function scraperProxyEnabled(): boolean {
  return SCRAPER_PROXY.length > 0;
}

/** Playwright's newContext({ proxy }) shape, or undefined when unset. */
export function playwrightProxy():
  | { server: string; username?: string; password?: string }
  | undefined {
  if (!SCRAPER_PROXY) return undefined;
  try {
    const u = new URL(SCRAPER_PROXY);
    const server = `${u.protocol}//${u.host}`;
    return {
      server,
      username: u.username ? decodeURIComponent(u.username) : undefined,
      password: u.password ? decodeURIComponent(u.password) : undefined,
    };
  } catch {
    console.warn(`[proxy] SCRAPER_PROXY is not a valid URL, ignoring: ${SCRAPER_PROXY}`);
    return undefined;
  }
}

/** The subset of the Response shape every caller in this app actually uses —
 * avoids fighting TS over incidental differences between the DOM lib's
 * Response type and undici's own (e.g. an iterator-protocol symbol). */
export interface MinimalResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type MinimalFetch = (url: string, init?: Record<string, unknown>) => Promise<MinimalResponse>;

/**
 * A fetch-compatible function that routes through SCRAPER_PROXY, or the
 * global fetch when unset. Node's built-in fetch rejects a dispatcher built
 * by the separately npm-installed `undici` package (internal version
 * mismatch — "invalid onRequestStart method"), so when a proxy is configured
 * we use undici's own fetch bound to its own ProxyAgent instead of passing a
 * dispatcher option to the global fetch.
 */
export async function getFetch(): Promise<MinimalFetch> {
  if (!SCRAPER_PROXY) return fetch as unknown as MinimalFetch;
  const { ProxyAgent, fetch: undiciFetch } = await import('undici');
  const dispatcher = new ProxyAgent(SCRAPER_PROXY);
  return (url, init) => undiciFetch(url, { ...init, dispatcher }) as unknown as Promise<MinimalResponse>;
}
