const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Hardcoded direct connection to eliminate variable misconfigurations
const URI = "mongodb+srv://admin:OlistAtlas2026@cluster0.qvrrez0.mongodb.net/olist_analytics?retryWrites=true&w=majority";

let client;
async function getDb() {
  if (!client) {
    client = new MongoClient(URI);
    await client.connect();
  }
  return client.db("olist_analytics");
}

// 1. Diagnostics endpoint
app.get('/api/metrics', async (req, res) => {
  try {
    const db = await getDb();
    
    // List all collections that actually exist in this database
    const cols = await db.listCollections().toArray();
    const colNames = cols.map(c => c.name);

    // Get count for each collection found
    const counts = {};
    for (const name of colNames) {
      counts[name] = await db.collection(name).countDocuments();
    }

    res.json({
      status: "Connected",
      databaseName: db.databaseName,
      availableCollections: colNames,
      documentCounts: counts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Data endpoint
app.get('/api/data/:collection', async (req, res) => {
  try {
    const db = await getDb();
    const col = req.params.collection;
    const data = await db.collection(col).find({}).limit(10).toArray();
    const total = await db.collection(col).countDocuments({});
    res.json({ total, page: 1, limit: 10, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;