const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'olist_analytics';

let db;
const BRL_TO_INR = 18.0;

MongoClient.connect(MONGO_URI)
  .then(client => {
    db = client.db(DB_NAME);
    console.log(`Connected to database: ${DB_NAME}`);
    app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
  })
  .catch(err => console.error("Database connection failed:", err));

function generateHex32() {
  let res = '';
  while (res.length < 32) res += Math.random().toString(16).substring(2);
  return res.substring(0, 32);
}

function buildIdQuery(id) {
  if (!id) return { _id: null };
  const strId = String(id).trim();
  const or = [
    { customer_id: strId },
    { order_id: strId },
    { product_id: strId }
  ];
  if (ObjectId.isValid(strId) && String(new ObjectId(strId)) === strId) {
    or.unshift({ _id: new ObjectId(strId) });
  }
  return { $or: or };
}

// 1. GET: Multi-Filter Searchable & Paginated CRUD
app.get('/api/data/:collection', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Database loading' });

    const colName = req.params.collection;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const search = (req.query.search || '').trim();
    const filter1 = (req.query.filter1 || 'ALL').trim();
    const filter2 = (req.query.filter2 || 'ALL').trim();
    const filter3 = (req.query.filter3 || 'ALL').trim();

    if (!['orders', 'products', 'customers'].includes(colName)) {
      return res.status(400).json({ error: 'Invalid collection' });
    }

    let andConditions = [];

    // Search query
    if (search !== '') {
      const regex = { $regex: search, $options: 'i' };
      if (colName === 'orders') {
        andConditions.push({ $or: [{ order_id: regex }, { customer_id: regex }, { order_status: regex }] });
      } else if (colName === 'products') {
        andConditions.push({ $or: [{ product_id: regex }, { product_category_name_english: regex }, { product_category_name: regex }] });
      } else if (colName === 'customers') {
        andConditions.push({ $or: [{ customer_id: regex }, { customer_unique_id: regex }, { customer_city: regex }, { customer_state: regex }] });
      }
    }

    // Multi-Filter: Customers
    if (colName === 'customers') {
      if (filter1 !== 'ALL') andConditions.push({ customer_state: filter1 });
      if (filter2 !== 'ALL') andConditions.push({ customer_city: filter2.toLowerCase() });
      if (filter3 !== 'ALL') {
        if (filter3 === '0-20k') andConditions.push({ customer_zip_code_prefix: { $gte: 0, $lt: 20000 } });
        if (filter3 === '20k-40k') andConditions.push({ customer_zip_code_prefix: { $gte: 20000, $lt: 40000 } });
        if (filter3 === '40k-70k') andConditions.push({ customer_zip_code_prefix: { $gte: 40000, $lt: 70000 } });
        if (filter3 === '70k+') andConditions.push({ customer_zip_code_prefix: { $gte: 70000 } });
      }
    }

    // Multi-Filter: Products
    if (colName === 'products') {
      if (filter1 !== 'ALL') {
        andConditions.push({
          $or: [
            { product_category_name_english: filter1 },
            { product_category_name: filter1 }
          ]
        });
      }
      if (filter2 !== 'ALL') {
        if (filter2 === 'light') andConditions.push({ product_weight_g: { $lt: 500 } });
        if (filter2 === 'medium') andConditions.push({ product_weight_g: { $gte: 500, $lte: 2000 } });
        if (filter2 === 'heavy') andConditions.push({ product_weight_g: { $gt: 2000 } });
      }
      if (filter3 !== 'ALL') {
        if (filter3 === 'single') andConditions.push({ product_photos_qty: 1 });
        if (filter3 === 'multiple') andConditions.push({ product_photos_qty: { $gte: 2 } });
      }
    }

    // Multi-Filter: Orders
    if (colName === 'orders') {
      if (filter1 !== 'ALL') andConditions.push({ order_status: filter1 });
      if (filter2 !== 'ALL') andConditions.push({ order_purchase_timestamp: { $regex: `^${filter2}` } });
      if (filter3 !== 'ALL') {
        if (filter3 === 'budget') andConditions.push({ 'items.price': { $lt: 1000 / BRL_TO_INR } });
        if (filter3 === 'mid') andConditions.push({ 'items.price': { $gte: 1000 / BRL_TO_INR, $lte: 3000 / BRL_TO_INR } });
        if (filter3 === 'premium') andConditions.push({ 'items.price': { $gt: 3000 / BRL_TO_INR } });
      }
    }

    const finalQuery = andConditions.length > 0 ? { $and: andConditions } : {};

    const [total, data] = await Promise.all([
      db.collection(colName).countDocuments(finalQuery),
      db.collection(colName).find(finalQuery).sort({ _id: -1 }).skip(skip).limit(limit).toArray()
    ]);

    res.json({ total, page, limit, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Filter Options for Dropdowns
app.get('/api/filter-options/:collection', async (req, res) => {
  try {
    if (!db) return res.json({});
    const colName = req.params.collection;

    if (colName === 'customers') {
      const [states, cities] = await Promise.all([
        db.collection('customers').distinct('customer_state'),
        db.collection('customers').aggregate([
          { $group: { _id: '$customer_city', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 15 }
        ]).toArray()
      ]);
      return res.json({
        filter1: states.filter(Boolean).sort(),
        filter2: cities.map(c => c._id).filter(Boolean)
      });
    }

    if (colName === 'products') {
      const [engCats, rawCats] = await Promise.all([
        db.collection('products').distinct('product_category_name_english'),
        db.collection('products').distinct('product_category_name')
      ]);
      const merged = Array.from(new Set([...engCats, ...rawCats])).filter(Boolean).sort();
      return res.json({ filter1: merged });
    }

    if (colName === 'orders') {
      const statuses = await db.collection('orders').distinct('order_status');
      return res.json({
        filter1: statuses.filter(Boolean).sort(),
        filter2: ['2016', '2017', '2018']
      });
    }

    res.json({});
  } catch (err) {
    res.status(500).json({});
  }
});

// 3. Collection Counts
app.get('/api/metrics', async (req, res) => {
  try {
    if (!db) return res.json({ orderCount: 0, productCount: 0, customerCount: 0 });
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

// 4. POST: Ingest proper schema into MongoDB
app.post('/api/data/:collection', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database disconnected' });
    const colName = req.params.collection;
    const body = { ...req.body };

    if (colName === 'customers') {
      const newCust = {
        customer_id: generateHex32(),
        customer_unique_id: generateHex32(),
        customer_zip_code_prefix: parseInt(body.customer_zip_code_prefix, 10) || 1000,
        customer_city: String(body.customer_city || 'sao paulo').trim().toLowerCase(),
        customer_state: String(body.customer_state || 'SP').trim().toUpperCase()
      };
      const result = await db.collection('customers').insertOne(newCust);
      return res.status(201).json({ success: true, insertedId: result.insertedId, doc: newCust });
    }

    if (colName === 'products') {
      const cleanCat = String(body.product_category_name_english || body.product_category_name || 'general').trim().toLowerCase();
      const newProd = {
        product_id: generateHex32(),
        product_category_name: cleanCat,
        product_category_name_english: cleanCat,
        product_name_lenght: 45,
        product_description_lenght: 250,
        product_photos_qty: 2,
        product_weight_g: parseFloat(body.product_weight_g) || 500,
        product_length_cm: 20,
        product_height_cm: 15,
        product_width_cm: 15
      };
      const result = await db.collection('products').insertOne(newProd);
      return res.status(201).json({ success: true, insertedId: result.insertedId, doc: newProd });
    }

    if (colName === 'orders') {
      const priceBRL = (parseFloat(body.price_inr) || 2500) / BRL_TO_INR;
      const newOrd = {
        order_id: generateHex32(),
        customer_id: generateHex32(),
        order_status: String(body.order_status || 'delivered').trim().toLowerCase(),
        order_purchase_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        items: [
          {
            order_item_id: 1,
            product_id: body.product_id || generateHex32(),
            price: priceBRL,
            freight_value: 15.0
          }
        ]
      };
      const result = await db.collection('orders').insertOne(newOrd);
      return res.status(201).json({ success: true, insertedId: result.insertedId, doc: newOrd });
    }

    return res.status(400).json({ success: false, error: 'Unknown collection' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. PUT: Update record
app.put('/api/data/:collection/:id', async (req, res) => {
  try {
    const colName = req.params.collection;
    const id = req.params.id;
    const updates = { ...req.body };
    delete updates._id;

    if (updates.customer_zip_code_prefix !== undefined) {
      updates.customer_zip_code_prefix = parseInt(updates.customer_zip_code_prefix, 10) || 1000;
    }
    if (updates.product_weight_g !== undefined) {
      updates.product_weight_g = parseFloat(updates.product_weight_g) || 500;
    }

    const query = buildIdQuery(id);
    const result = await db.collection(colName).updateOne(query, { $set: updates });
    res.json({ success: true, matchedCount: result.matchedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. DELETE: Delete record
app.delete('/api/data/:collection/:id', async (req, res) => {
  try {
    const colName = req.params.collection;
    const id = req.params.id;
    const query = buildIdQuery(id);
    const result = await db.collection(colName).deleteOne(query);
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Distinct Categories for Analysis View
app.get('/api/analytics/categories-list', async (req, res) => {
  try {
    if (!db) return res.json([]);
    const [engCats, rawCats] = await Promise.all([
      db.collection('products').distinct('product_category_name_english'),
      db.collection('products').distinct('product_category_name')
    ]);
    const merged = Array.from(new Set([...engCats, ...rawCats])).filter(c => c && typeof c === 'string' && c.trim() !== '').sort();
    res.json(merged);
  } catch (err) {
    res.status(500).json([]);
  }
});

// 8. Strict Category Insights
app.get('/api/analytics/category-year-insights', async (req, res) => {
  try {
    if (!db) return res.json({ summary: { totalRevenueINR: 0, totalUnitsSold: 0, totalOrders: 0, avgBasketINR: 0 }, trends: [] });

    const category = req.query.category;
    const year = req.query.year || 'ALL';

    const prods = await db.collection('products')
      .find({
        $or: [
          { product_category_name_english: category },
          { product_category_name: category }
        ]
      }, { projection: { product_id: 1 } })
      .toArray();

    const productIds = prods.map(p => p.product_id).filter(Boolean);

    if (productIds.length === 0) {
      return res.json({
        summary: { totalRevenueINR: 0, totalUnitsSold: 0, totalOrders: 0, avgBasketINR: 0 },
        trends: []
      });
    }

    let matchStage = {
      order_purchase_timestamp: { $exists: true, $ne: null },
      'items.product_id': { $in: productIds }
    };
    if (year !== 'ALL') {
      matchStage.order_purchase_timestamp = { $regex: `^${year}` };
    }

    const rawTrends = await db.collection('orders').aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      { $match: { 'items.product_id': { $in: productIds } } },
      {
        $project: {
          period: { $substrCP: ['$order_purchase_timestamp', 0, 7] },
          price: '$items.price',
          order_id: 1
        }
      },
      {
        $group: {
          _id: '$period',
          unitsSold: { $sum: 1 },
          uniqueOrders: { $addToSet: '$order_id' },
          revenueBRL: { $sum: '$price' }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    const formattedTrends = rawTrends.map(t => ({
      period: t._id,
      category,
      unitsSold: t.unitsSold,
      orderCount: t.uniqueOrders.length,
      revenueINR: Math.round(t.revenueBRL * BRL_TO_INR)
    }));

    const totalRev = formattedTrends.reduce((s, x) => s + x.revenueINR, 0);
    const totalUnits = formattedTrends.reduce((s, x) => s + x.unitsSold, 0);
    const totalOrders = formattedTrends.reduce((s, x) => s + x.orderCount, 0);

    res.json({
      summary: {
        totalRevenueINR: totalRev,
        totalUnitsSold: totalUnits,
        totalOrders: totalOrders,
        avgBasketINR: totalOrders > 0 ? Math.round(totalRev / totalOrders) : 0
      },
      trends: formattedTrends
    });
  } catch (err) {
    res.status(500).json({ summary: { totalRevenueINR: 0, totalUnitsSold: 0, totalOrders: 0, avgBasketINR: 0 }, trends: [] });
  }
});

// 9. Visual Dashboard
app.get('/api/analytics/visual-dashboard', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ summary: {}, salesTrends: [] });

    const rawTrends = await db.collection('orders').aggregate([
      { $match: { order_purchase_timestamp: { $exists: true } } },
      { $project: { period: { $substrCP: ['$order_purchase_timestamp', 0, 7] }, items: 1 } },
      { $unwind: '$items' },
      { $group: { _id: '$period', revenueBRL: { $sum: '$items.price' }, units: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]).toArray();

    const salesTrends = rawTrends.map(t => ({
      period: t._id,
      revenueINR: Math.round(t.revenueBRL * BRL_TO_INR),
      units: t.units,
      orders: Math.round(t.units * 0.85)
    }));

    const totalRev = salesTrends.reduce((s, x) => s + x.revenueINR, 0);
    const totalUnits = salesTrends.reduce((s, x) => s + x.units, 0);
    const totalOrders = salesTrends.reduce((s, x) => s + x.orders, 0);

    res.json({
      summary: { totalRevenueINR: totalRev, totalUnits, totalOrders, avgBasketINR: Math.round(totalRev / (totalOrders || 1)) },
      salesTrends
    });
  } catch (err) {
    res.status(500).json({ summary: {}, salesTrends: [] });
  }
});