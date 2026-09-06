const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:OlistAtlas2026@cluster0.qvrrez0.mongodb.net/olist_analytics?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "olist_analytics";
const BRL_TO_INR = 18.0;

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;

  const client = new MongoClient(MONGO_URI, {
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000
  });

  await client.connect();
  cachedClient = client;
  cachedDb = client.db(DB_NAME);
  return cachedDb;
}

// 1. Paginated CRUD endpoint
app.get('/api/data/:collection', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const colName = req.params.collection;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    if (!['orders', 'products', 'customers'].includes(colName)) {
      return res.status(400).json({ error: 'Invalid collection' });
    }

    let filter = {};
    if (search !== '') {
      const regex = { $regex: search, $options: 'i' };
      if (colName === 'orders') {
        filter = { $or: [{ order_id: regex }, { customer_id: regex }, { order_status: regex }] };
      } else if (colName === 'products') {
        filter = { $or: [{ product_id: regex }, { product_category_name: regex }, { product_category_name_english: regex }] };
      } else if (colName === 'customers') {
        filter = { $or: [{ customer_id: regex }, { customer_unique_id: regex }, { customer_city: regex }, { customer_state: regex }] };
      }
    }

    const [total, data] = await Promise.all([
      db.collection(colName).countDocuments(filter),
      db.collection(colName).find(filter).skip(skip).limit(limit).toArray()
    ]);

    res.json({ total, page, limit, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Distinct Categories List
app.get('/api/analytics/categories-list', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const categories = await db.collection('products').distinct('product_category_name_english');
    const valid = categories.filter(c => c && typeof c === 'string' && c.trim() !== '').sort();
    if (valid.length > 0) return res.json(valid);

    const fallback = await db.collection('products').distinct('product_category_name');
    res.json(fallback.filter(c => c && typeof c === 'string').sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Category & Year Insights
app.get('/api/analytics/category-year-insights', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const category = req.query.category;
    const year = req.query.year || 'ALL';

    const matchingProducts = await db.collection('products')
      .find({
        $or: [
          { product_category_name_english: category },
          { product_category_name: category }
        ]
      }, { projection: { product_id: 1 } })
      .toArray();

    const productIds = new Set(matchingProducts.map(p => p.product_id));

    let orderMatch = {};
    if (year !== 'ALL') {
      orderMatch.order_purchase_timestamp = { $regex: `^${year}` };
    }

    const rawOrders = await db.collection('orders')
      .find(orderMatch, { projection: { order_id: 1, order_purchase_timestamp: 1, items: 1 } })
      .limit(6000)
      .toArray();

    const periodMap = new Map();
    let grandRevenueINR = 0;
    let grandUnits = 0;
    let grandOrders = 0;

    for (const ord of rawOrders) {
      if (!ord.items || !Array.isArray(ord.items)) continue;
      const validItems = ord.items.filter(it => productIds.size === 0 || productIds.has(it.product_id));
      if (validItems.length === 0) continue;

      grandOrders++;
      const period = (ord.order_purchase_timestamp || '').slice(0, 7) || '2017-01';

      if (!periodMap.has(period)) {
        periodMap.set(period, { period, category: category || 'All', unitsSold: 0, orderCount: 0, revenueINR: 0 });
      }

      const pEntry = periodMap.get(period);
      pEntry.orderCount++;

      for (const it of validItems) {
        const itemPriceINR = Math.round((it.price || 0) * BRL_TO_INR);
        grandRevenueINR += itemPriceINR;
        grandUnits++;
        pEntry.unitsSold++;
        pEntry.revenueINR += itemPriceINR;
      }
    }

    const trends = Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period));
    res.json({
      summary: {
        totalRevenueINR: grandRevenueINR,
        totalUnitsSold: grandUnits,
        totalOrders: grandOrders,
        avgBasketINR: grandOrders > 0 ? Math.round(grandRevenueINR / grandOrders) : 0
      },
      trends
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Visual Dashboard Trends
app.get('/api/analytics/visual-dashboard', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const rawTrends = await db.collection('orders').aggregate([
      { $match: { order_purchase_timestamp: { $exists: true, $ne: null } } },
      { $project: { period: { $substrCP: ["$order_purchase_timestamp", 0, 7] }, items: 1 } },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
      { $group: { _id: "$period", revenueBRL: { $sum: "$items.price" }, units: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]).toArray();

    const salesTrends = rawTrends.map(t => ({
      period: t._id,
      revenueINR: Math.round(t.revenueBRL * BRL_TO_INR),
      units: t.units,
      orders: Math.round(t.units * 0.85)
    }));

    const totalRevenueINR = salesTrends.reduce((acc, t) => acc + t.revenueINR, 0);
    const totalUnits = salesTrends.reduce((acc, t) => acc + t.units, 0);
    const totalOrders = salesTrends.reduce((acc, t) => acc + t.orders, 0);

    res.json({
      summary: {
        totalRevenueINR,
        totalUnits,
        totalOrders,
        avgBasketINR: totalOrders > 0 ? Math.round(totalRevenueINR / totalOrders) : 0
      },
      salesTrends
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Collection Counts
app.get('/api/metrics', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [orderCount, productCount, customerCount] = await Promise.all([
      db.collection('orders').countDocuments(),
      db.collection('products').countDocuments(),
      db.collection('customers').countDocuments()
    ]);
    res.json({ orderCount, productCount, customerCount });
  } catch (err) {
    res.status(500).json({ orderCount: 0, productCount: 0, customerCount: 0 });
  }
});

// 6. Mutations: POST, PUT, DELETE
app.post('/api/data/:collection', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const colName = req.params.collection;
    const body = req.body;
    if (colName === 'orders') {
      body.order_id = body.order_id || 'ord_' + Date.now();
      body.order_purchase_timestamp = new Date().toISOString();
      body.items = [{ order_item_id: 1, price: (Number(body.price_inr) || 1500) / BRL_TO_INR }];
    } else if (colName === 'products') {
      body.product_id = body.product_id || 'prod_' + Date.now();
      body.product_weight_g = Number(body.product_weight_g) || 500;
    } else if (colName === 'customers') {
      body.customer_id = body.customer_id || 'cust_' + Date.now();
      body.customer_unique_id = body.customer_unique_id || 'uniq_' + Date.now();
    }
    const result = await db.collection(colName).insertOne(body);
    res.status(201).json({ success: true, insertedId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/data/:collection/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const colName = req.params.collection;
    const id = req.params.id;
    const updates = { ...req.body };
    delete updates._id;
    let query = { $or: [{ order_id: id }, { product_id: id }, { customer_id: id }] };
    if (ObjectId.isValid(id)) query.$or.push({ _id: new ObjectId(id) });
    await db.collection(colName).updateOne(query, { $set: updates });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/data/:collection/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const colName = req.params.collection;
    const id = req.params.id;
    let query = { $or: [{ order_id: id }, { product_id: id }, { customer_id: id }] };
    if (ObjectId.isValid(id)) query.$or.push({ _id: new ObjectId(id) });
    await db.collection(colName).deleteOne(query);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;