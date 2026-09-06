Set-Content -Path E:\Olist-project\server\syncAtlas.js -Value @'
const { MongoClient } = require('mongodb');

const LOCAL_URI = 'mongodb://127.0.0.1:27017';
const ATLAS_URI = 'mongodb+srv://admin:OlistAtlas2026@cluster0.qvrrez0.mongodb.net/olist_analytics?retryWrites=true&w=majority';

async function migrate() {
  console.log('Connecting via Hotspot...');
  const localClient = await MongoClient.connect(LOCAL_URI);
  const atlasClient = await MongoClient.connect(ATLAS_URI, {
    tls: true,
    serverSelectionTimeoutMS: 20000
  });

  const localDb = localClient.db('olist_analytics');
  const atlasDb = atlasClient.db('olist_analytics');

  for (const colName of ['customers', 'products', 'orders']) {
    console.log(`\nMigrating collection: ${colName}...`);
    const count = await localDb.collection(colName).countDocuments();
    console.log(`Found ${count} documents locally.`);

    const batchSize = 2500;
    let processed = 0;

    await atlasDb.collection(colName).deleteMany({});

    while (processed < count) {
      const docs = await localDb.collection(colName).find({}).skip(processed).limit(batchSize).toArray();
      if (docs.length === 0) break;
      await atlasDb.collection(colName).insertMany(docs);
      processed += docs.length;
      process.stdout.write(`Uploaded ${processed} / ${count} documents...\r`);
    }
    console.log(`\nFinished ${colName}.`);
  }

  console.log('\nMigration complete.');
  await localClient.close();
  await atlasClient.close();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
'@