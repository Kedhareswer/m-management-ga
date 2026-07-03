import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Series } from './types';
import { seedLibrary } from './seed';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'library.json');

// Serialize writes so concurrent API calls can't interleave file writes.
let writeChain: Promise<unknown> = Promise.resolve();

async function readAll(): Promise<Series[]> {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(raw) as Series[];
  } catch {
    // First run: seed with a few series so the shelf isn't empty.
    const seeded = seedLibrary();
    await persist(seeded);
    return seeded;
  }
}

async function persist(list: Series[]): Promise<void> {
  writeChain = writeChain.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = DB_FILE + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
    await fs.rename(tmp, DB_FILE);
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
