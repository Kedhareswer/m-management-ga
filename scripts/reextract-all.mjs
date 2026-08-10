import axios from 'axios';

async function main() {
  console.log('🔍 Fetching series from local server http://localhost:3000/api/manga ...');
  try {
    const listRes = await axios.get('http://localhost:3000/api/manga');
    const seriesList = listRes.data || [];
    console.log(`📚 Found ${seriesList.length} series in library.`);

    const targets = seriesList.filter((s) => s.metaStatus !== 'ok' || s.status === 'partial' || !s.author || s.genres.length === 0);
    console.log(`🎯 Re-extracting details for ${targets.length} series needing details...\n`);

    for (let i = 0; i < targets.length; i++) {
      const s = targets[i];
      console.log(`[${i + 1}/${targets.length}] Re-extracting: "${s.title}" (${s.sourceUrl})...`);
      try {
        const refreshRes = await axios.post(`http://localhost:3000/api/manga/${s.id}/refresh`, {}, { timeout: 60000 });
        const updated = refreshRes.data?.series;
        console.log(`   ✅ Status: ${updated?.metaStatus || 'ok'} | Title: "${updated?.title}" | Author: "${updated?.author || 'N/A'}" | Genres: [${(updated?.genres || []).join(', ')}]`);
      } catch (err) {
        console.error(`   ❌ Failed: ${err.message}`);
      }
    }

    console.log('\n🎉 Re-extraction cycle complete!');
  } catch (err) {
    console.error('Fatal error connecting to dev server:', err.message);
  }
}

main();
