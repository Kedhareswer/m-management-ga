/**
 * Per-host polite rate limiting. Being a "harmless bot" is about behaviour:
 * we serialise requests to the same host and space them out, so we never
 * hammer a site (which is what rate-based bot defences actually punish).
 * Different hosts run in parallel — this only paces repeat hits on one site.
 */

const MIN_INTERVAL_MS = Number(process.env.SCRAPE_MIN_INTERVAL_MS) || 1500;

const g = globalThis as typeof globalThis & {
  __mangaHostQueue?: Map<string, Promise<void>>;
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Wait for this host's turn, honouring the minimum spacing. */
export async function politeGate(url: string): Promise<void> {
  if (!g.__mangaHostQueue) g.__mangaHostQueue = new Map();
  const host = hostOf(url);
  const prev = g.__mangaHostQueue.get(host) ?? Promise.resolve();

  let release!: () => void;
  const mine = new Promise<void>((res) => (release = res));
  // Chain onto the previous request for this host so they run one at a time.
  g.__mangaHostQueue.set(
    host,
    prev.then(() => mine)
  );

  await prev;
  // Space out consecutive hits to the same host.
  await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS));
  // Release the next waiter shortly after we've started our own work.
  setTimeout(release, 50);
}
