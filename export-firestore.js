const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('./apps/api/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const outputDir = path.join(__dirname, 'data', 'firestore-export');

async function exportCollection(collectionName, parentPath = '') {
  const fullPath = parentPath ? `${parentPath}/${collectionName}` : collectionName;
  console.log(`Exporting: ${fullPath}...`);

  const snapshot = await db.collection(fullPath).get();
  const data = [];

  for (const doc of snapshot.docs) {
    const docData = { id: doc.id, ...doc.data() };

    // Check for subcollections
    const subcollections = await doc.ref.listCollections();
    if (subcollections.length > 0) {
      docData._subcollections = {};
      for (const subcol of subcollections) {
        const subData = await exportCollection(subcol.id, `${fullPath}/${doc.id}`);
        docData._subcollections[subcol.id] = subData;
      }
    }

    data.push(docData);
  }

  if (!parentPath) {
    const filePath = path.join(outputDir, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`  -> ${data.length} documents saved to ${collectionName}.json`);
  }

  return data;
}

async function main() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Fetching all collections...\n');
  const collections = await db.listCollections();
  const names = collections.map(c => c.id);
  console.log(`Found ${names.length} collections: ${names.join(', ')}\n`);

  for (const name of names) {
    await exportCollection(name);
  }

  console.log('\nDone! Exported to data/firestore-export/');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
