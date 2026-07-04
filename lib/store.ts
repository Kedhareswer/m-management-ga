import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Series } from './types';
import { withTimeout } from './timeout';
import { dbEnabled, getSql, ensureSchema } from './db';

/**
 * Series storage, in order of preference:
 *
 * 1. Neon Postgres — when DATABASE_URL is set. Each series is one JSONB row,
 *    so the schema never fights the app.
 * 2. JSON file on disk — zero-setup local mode.
 * 3. In-memory — automatic fallback when the disk isn't writable, so the app
 *    keeps working (non-persistently) instead of failing every request.
 */

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'library.json');

const g = globalThis as typeof globalThis & {
  __mangaMemDb?: Series[];
  __mangaStorageWarned?: boolean;
};

export function storageMode(): 'postgres' | 'disk' | 'memory' {
  if (dbEnabled()) return 'postgres';
  return g.__mangaMemDb ? 'memory' : 'disk';
}

/* ------------------------------ Postgres ------------------------------ */

async function pgList(): Promise<Series[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`SELECT data FROM series`) as { data: Series }[];
  return rows.map((r) => r.data);
}

async function pgGet(id: string): Promise<Series | undefined> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`SELECT data FROM series WHERE id = ${id}`) as { data: Series }[];
  return rows[0]?.data;
}

async function pgPut(series: Series): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`INSERT INTO series (id, data) VALUES (${series.id}, ${JSON.stringify(series)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
}

async function pgDelete(id: string): Promise<boolean> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`DELETE FROM series WHERE id = ${id} RETURNING id`) as { id: string }[];
  return rows.length > 0;
}

/* ---------------------------- File / memory ---------------------------- */

function enterMemoryMode(list: Series[], cause: unknown): void {
  g.__mangaMemDb = list;
  if (!g.__mangaStorageWarned) {
    g.__mangaStorageWarned = true;
    console.warn(
      `[store] Cannot write ${DB_FILE} (${cause instanceof Error ? cause.message : cause}). ` +
        'Falling back to in-memory storage — data will NOT survive a restart. ' +
        'Point DATA_DIR at a writable folder (or set DATABASE_URL) to persist your library.'
    );
  }
}

// Serialize writes so concurrent API calls can't interleave file writes.
let writeChain: Promise<unknown> = Promise.resolve();

async function fileReadAll(): Promise<Series[]> {
  if (g.__mangaMemDb) return g.__mangaMemDb;
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(raw) as Series[];
  } catch {
    // First run: an empty shelf — the user adds their own series.
    // Persisting it is best-effort (also probes storage writability early);
    // reading your shelf must never require a disk write.
    const empty: Series[] = [];
    await filePersist(empty);
    return empty;
  }
}

async function filePersist(list: Series[]): Promise<void> {
  if (g.__mangaMemDb) {
    g.__mangaMemDb = list;
    return;
  }
  writeChain = writeChain.then(async () => {
    try {
      await withTimeout(
        (async () => {
          await fs.mkdir(DATA_DIR, { recursive: true });
          const tmp = DB_FILE + '.tmp';
          await fs.writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
          await fs.rename(tmp, DB_FILE);
        })(),
        4000,
        'library write'
      );
    } catch (err) {
      enterMemoryMode(list, err);
    }
  });
  await writeChain;
}

/* ------------------------------ Public API ----------------------------- */

export async function listSeries(): Promise<Series[]> {
  const all = dbEnabled() ? await pgList() : await fileReadAll();
  return all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getSeries(id: string): Promise<Series | undefined> {
  if (dbEnabled()) return pgGet(id);
  const all = await fileReadAll();
  return all.find((s) => s.id === id);
}

export async function addSeries(
  input: Omit<Series, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Series> {
  const now = new Date().toISOString();
  const series: Series = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
  if (dbEnabled()) {
    await pgPut(series);
  } else {
    const all = await fileReadAll();
    all.push(series);
    await filePersist(all);
  }
  return series;
}

export async function updateSeries(
  id: string,
  patch: Partial<Omit<Series, 'id' | 'createdAt'>>
): Promise<Series | undefined> {
  if (dbEnabled()) {
    const current = await pgGet(id);
    if (!current) return undefined;
    const updated: Series = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
    await pgPut(updated);
    return updated;
  }
  const all = await fileReadAll();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  all[idx] = { ...all[idx], ...patch, id, updatedAt: new Date().toISOString() };
  await filePersist(all);
  return all[idx];
}

export async function deleteSeries(id: string): Promise<boolean> {
  if (dbEnabled()) return pgDelete(id);
  const all = await fileReadAll();
  const next = all.filter((s) => s.id !== id);
  if (next.length === all.length) return false;
  await filePersist(next);
  return true;
}
