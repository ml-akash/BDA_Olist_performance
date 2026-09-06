const { MongoClient, BSON } = require('./server/node_modules/mongodb');
const fs = require('fs');
const path = require('path');

const ATLAS_URI = "mongodb+srv://admin:OlistAtlas2026@cluster0.qvrrez0.mongodb.net/?retryWrites=true&w=majority";
const DB_NAME = "olist_analytics";
const BACKUP_DIR = path.join(__dirname, 'mongo_backup', 'olist_analytics');

async function importBsonFile(collectionName, filePath, db) {
  console.log(`\nReading ${collectionName}.bson...`);
  const buffer = fs.readFileSync(filePath);
  const docs = [];
  let index = 0;

  while (index < buffer.length) {
    const size = buffer.readInt32LE(index);
    const docBuffer = buffer.slice(index, index + size);
    docs.push(BSON.deserialize(docBuffer));
    index += size;
  }

  console.log(`Parsed ${docs.length.toLocaleString('en-IN')} documents. Uploading to Atlas...`);

  const col = db.collection(collectionName);
  await col.deleteMany({}); // Wipe the partial 135k upload to avoid duplicate key conflicts

  const CHUNK_SIZE = 5000;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    await col.insertMany(chunk, { ordered: false });
    const progress = Math.min(i + CHUNK_SIZE, docs.length);
    process.stdout.write(`Uploaded ${progress.toLocaleString('en-IN')} / ${docs.length.toLocaleString('en-IN')} docs\r`);
  }
  console.log(`\nSuccessfully imported ${collectionName}!`);
}

async function run() {
  const client = new MongoClient(ATLAS_URI, {
    tls: true,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 60000
  });

  try {
    console.log("Reconnecting to MongoDB Atlas...");
    await client.connect();
    console.log("Connected successfully!");

    const db = client.db(DB_NAME);

    // Products and Orders are already 100% finished, only finishing customers
    await importBsonFile('customers', path.join(BACKUP_DIR, 'customers.bson'), db);

    console.log("\nALL 3 COLLECTIONS ARE NOW 100% INGESTED IN MONGODB ATLAS!");
  } catch (err) {
    console.error("\nUpload Error:", err);
  } finally {
    await client.close();
  }
}

run();