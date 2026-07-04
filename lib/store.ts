import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Series } from './types';
import { withTimeout } from './timeout';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'library.json');

/**
 * Disk-first storage with an in-memory fallback. If the data dir isn't
 * writable (read-only container, serverless filesystem, permission issue)
 * the app KEEPS WORKING against process memory instead of 500-ing every
 * request — it just isn't persistent, and storageMode() reports that so
 * the UI can warn the user.
 */
const g = globalThis as typeof globalThis & {
  __mangaMemDb?: Series[];
  __mangaStorageWarned?: boolean;
};

export function storageMode(): 'disk' | 'memory' {
  return g.__mangaMemDb ? 'memory' : 'disk';
}

function enterMemoryMode(list: Series[], cause: unknown): void {
  g.__mangaMemDb = list;
  if (!g.__mangaStorageWarned) {
    g.__mangaStorageWarned = true;
    console.warn(
      `[store] Cannot write ${DB_FILE} (${cause instanceof Error ? cause.message : cause}). ` +
        'Falling back to in-memory storage — data will NOT survive a restart. ' +
        'Point DATA_DIR at a writable folder to persist your library.'
    );
  }
}

// Serialize writes so concurrent API calls can't interleave file writes.
let writeChain: Promise<unknown> = Promise.resolve();

async function readAll(): Promise<Series[]> {
  if (g.__mangaMemDb) return g.__mangaMemDb;
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(raw) as Series[];
  } catch {
    // First run: an empty shelf — the user adds their own series.
    // Persisting it is best-effort (also probes storage writability early);
    // reading your shelf must never require a disk write.
    const empty: Series[] = [];
    await persist(empty);
    return empty;
  }
}

async function persist(list: Series[]): Promise<void> {
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

export async function listSeries(): Promise<Series[]> {
  const all = await readAll();
  return all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getSeries(id: string): Promise<Series | undefined> {
  const all = await readAll();
  return all.find((s) => s.id === id);
}

export async function addSeries(
  input: Omit<Series, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Series> {
  const all = await readAll();
  const now = new Date().toISOString();
  const series: Series = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
  all.push(series);
  await persist(all);
  return series;
}

export async function updateSeries(
  id: string,
  patch: Partial<Omit<Series, 'id' | 'createdAt'>>
): Promise<Series | undefined> {
  const all = await readAll();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  all[idx] = { ...all[idx], ...patch, id, updatedAt: new Date().toISOString() };
  await persist(all);
  return all[idx];
}

export async function deleteSeries(id: string): Promise<boolean> {
  const all = await readAll();
  const next = all.filter((s) => s.id !== id);
  if (next.length === all.length) return false;
  await persist(next);
  return true;
}
