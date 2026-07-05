/**
 * Standalone TinyFish connectivity check — run on a machine that can reach
 * agent.tinyfish.ai (i.e. NOT this sandbox).
 *
 *   node --env-file=.env.local scripts/test-tinyfish.mjs
 *
 * It exercises both APIs the app uses (search + fetch) and prints a clear
 * PASS/FAIL for each, so you know TinyFish works before relying on it in
 * the app.
 */
import { TinyFish, FetchFormat } from '@tiny-fish/sdk';

const key = process.env.TINYFISH_API_KEY?.trim();
if (!key) {
  console.error('❌ TINYFISH_API_KEY is not set. Run with: node --env-file=.env.local scripts/test-tinyfish.mjs');
  process.exit(1);
}

// baseURL override only matters for local mocks; leave unset for the real API.
const client = new TinyFish({ apiKey: key, baseURL: process.env.TINYFISH_BASE_URL, timeout: 30_000 });

let ok = true;

console.log('→ Testing search.query …');
try {
  const res = await client.search.query({ query: 'best isekai manga to read', location: 'US', language: 'en' });
  console.log(`✅ search OK — ${res.results.length} results`);
  res.results.slice(0, 3).forEach((r) => console.log(`   • ${r.title}\n     ${r.url}`));
} catch (err) {
  ok = false;
  console.error(`❌ search FAILED: ${err?.message || err}`);
}

console.log('\n→ Testing fetch.getContents …');
try {
  const res = await client.fetch.getContents({ urls: ['https://example.com'], format: FetchFormat.Markdown });
  const page = res.results[0];
  const preview = (page?.text || '').slice(0, 80).replace(/\n/g, ' ');
  console.log(`✅ fetch OK — got "${page?.title ?? '(no title)'}"`);
  console.log(`   preview: ${preview}…`);
} catch (err) {
  ok = false;
  console.error(`❌ fetch FAILED: ${err?.message || err}`);
}

console.log(ok ? '\n🎉 TinyFish is working.' : '\n⚠️  One or more calls failed — see errors above.');
process.exit(ok ? 0 : 1);
