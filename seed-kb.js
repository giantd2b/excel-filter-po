const admin = require('firebase-admin');
const fs = require('fs');
const sa = require('./apps/api/service-account.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });

async function seed() {
  const fetch = (await import('node-fetch')).default;

  const customToken = await admin.auth().createCustomToken('6Tg47S48WlfcIucX7dS9jWmsThn2');
  const resp = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyDBe0f0rsRhNqXIvVoU6fR-yHbG4nSbZRU', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const { idToken } = await resp.json();
  const headers = { Authorization: 'Bearer ' + idToken, 'Content-Type': 'application/json' };
  const API = 'https://harmonious-presence-production.up.railway.app/api';

  async function importEntries(entries) {
    const r = await fetch(API + '/knowledge/import', { method: 'POST', headers, body: JSON.stringify(entries) });
    return r.json();
  }

  function extractText(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/`([\s\S]+)`/);
    return match ? match[1] : '';
  }

  function splitToEntries(text, service) {
    return text.split(/\n(?=###\s)/).filter(s => s.trim().length > 20).map((section, i) => {
      const lines = section.trim().split('\n');
      return {
        service,
        category: 'ข้อมูลทั่วไป',
        question: lines[0].replace(/^#+\s*/, '').trim(),
        answer: lines.slice(1).join('\n').trim(),
        sortOrder: i,
      };
    });
  }

  const files = [
    { service: 'งานบุญ/พิธีสงฆ์', file: './apps/api/src/data/kb-temboon-merit.ts' },
    { service: 'อาหารไทยบุฟเฟต์', file: './apps/api/src/data/kb-thai-buffet.ts' },
    { service: 'โต๊ะจีน', file: './apps/api/src/data/kb-chinese-table.ts' },
    { service: 'Cocktail/Canapé', file: './apps/api/src/data/kb-cocktail-canape.ts' },
    { service: 'งานแต่งงาน', file: './apps/api/src/data/kb-wedding.ts' },
  ];

  for (const { service, file } of files) {
    const text = extractText(file);
    const entries = splitToEntries(text, service);
    console.log(service + ':', entries.length, 'entries');
    const result = await importEntries(entries);
    console.log('  Result:', JSON.stringify(result));
  }

  console.log('\nDone!');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
