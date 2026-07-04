import { neon, neonConfig } from '@neondatabase/serverless';

/**
 * Neon Postgres connection (HTTP driver — works everywhere fetch does,
 * including serverless). Enabled by setting DATABASE_URL; without it the
 * app falls back to the JSON-file store, so local dev needs no database.
 */

const DATABASE_URL = process.env.DATABASE_URL || '';

export function dbEnabled(): boolean {
  return DATABASE_URL.length > 0;
}

// Behind a corporate/egress proxy Node's fetch ignores HTTPS_PROXY, so the
// driver would try (and fail) to reach Neon directly. Route it through the
// proxy when one is configured; no proxy env → default fetch, zero overhead.
// Point the driver at a local Neon HTTP proxy (e.g. `neon_local`) for
// development/testing against a non-Neon endpoint.
if (process.env.NEON_FETCH_ENDPOINT) {
  neonConfig.fetchEndpoint = () => process.env.NEON_FETCH_ENDPOINT as string;
}

const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxyUrl) {
  // EnvHttpProxyAgent honors HTTPS_PROXY *and* NO_PROXY, so local endpoints
  // still go direct while external ones tunnel through the proxy.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EnvHttpProxyAgent, fetch: proxiedFetch } = require('undici');
  const dispatcher = new EnvHttpProxyAgent();
  neonConfig.fetchFunction = (url: string, init: Record<string, unknown> = {}) =>
    proxiedFetch(url, { ...init, dispatcher });
}

type Sql = ReturnType<typeof neon>;

const g = globalThis as typeof globalThis & {
  __mangaSql?: Sql;
  __mangaSchemaReady?: Promise<void>;
};

export function getSql(): Sql {
  if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
  if (!g.__mangaSql) g.__mangaSql = neon(DATABASE_URL);
  return g.__mangaSql;
}

/** Create tables on first use (cached per process). */
export function ensureSchema(): Promise<void> {
  if (!g.__mangaSchemaReady) {
    const sql = getSql();
    g.__mangaSchemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS series (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      )`;
      await sql`CREATE TABLE IF NOT EXISTS chat_memory (
        id INT PRIMARY KEY,
        summary TEXT NOT NULL DEFAULT '',
        messages JSONB NOT NULL DEFAULT '[]'::jsonb
      )`;
    })().catch((err) => {
      // Don't cache a failed init — allow retry on the next request.
      g.__mangaSchemaReady = undefined;
      throw err;
    });
  }
  return g.__mangaSchemaReady;
}
