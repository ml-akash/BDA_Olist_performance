const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'olist_analytics';

async function setupIndexes() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Building compound indexes on [${DB_NAME}]...`);

    // Products Indexes
    await db.collection('products').createIndex({ product_category_name_english: 1, product_weight_g: 1 });
    await db.collection('products').createIndex({ product_id: 1 });

    // Customers Indexes
    await db.collection('customers').createIndex({ customer_state: 1, customer_city: 1 });
    await db.collection('customers').createIndex({ customer_id: 1 });

    // Orders Indexes
    await db.collection('orders').createIndex({ order_purchase_timestamp: -1, order_status: 1 });
    await db.collection('orders').createIndex({ order_id: 1, customer_id: 1 });

    console.log('Compound indexes established successfully.');
  } catch (err) {
    console.error('Error creating indexes:', err.message);
  } finally {
    await client.close();
  }
}

setupIndexes();