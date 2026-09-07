import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend
} from 'recharts';

const BRL_TO_INR = 18.0;
const API_BASE_URL = 'http://localhost:5000';

const formatRupee = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '₹0';
  return '₹' + Number(num).toLocaleString('en-IN');
};

const PALETTE = {
  emerald: '#10b981',
  gold: '#fbbf24',
  cyan: '#06b6d4',
  coral: '#f43f5e'
};

export default function App() {
  const [activePage, setActivePage] = useState('crud_data');

  // Exact Collection Counts
  const [metrics, setMetrics] = useState({ orderCount: 0, productCount: 0, customerCount: 0 });

  // CRUD Table States
  const [collection, setCollection] = useState('products');
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ msg: '', isError: false });

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Category Explorer States
  const [categoryList, setCategoryList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [catSummary, setCatSummary] = useState({ totalRevenueINR: 0, totalUnitsSold: 0, totalOrders: 0, avgBasketINR: 0 });
  const [catTrends, setCatTrends] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  // Visual Dashboard States
  const [dashboardSummary, setDashboardSummary] = useState({ totalRevenueINR: 0, totalUnits: 0, totalOrders: 0, avgBasketINR: 0 });
  const [salesTrends, setSalesTrends] = useState([]);

  const loadMetrics = () => {
    fetch(`${API_BASE_URL}/api/metrics`)
      .then(r => r.json())
      .then(d => setMetrics(d))
      .catch(() => {});
  };

  const loadCategories = () => {
    fetch(`${API_BASE_URL}/api/analytics/categories-list`)
      .then(r => r.json())
      .then(list => {
        if (Array.isArray(list) && list.length > 0) {
          setCategoryList(list);
          setSelectedCategory(prev => (prev && list.includes(prev) ? prev : list[0]));
        }
      })
      .catch(() => {});
  };

  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/data/${collection}?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`)
      .then(r => r.json())
      .then(res => {
        setItems(res.data || []);
        setTotalCount(res.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [collection, page, searchTerm]);

  useEffect(() => {
    loadCategories();
    loadMetrics();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    setCatLoading(true);
    fetch(`${API_BASE_URL}/api/analytics/category-year-insights?category=${encodeURIComponent(selectedCategory)}&year=${selectedYear}`)
      .then(r => r.json())
      .then(res => {
        if (res && res.trends) {
          setCatSummary(res.summary || {});
          setCatTrends(res.trends || []);
        }
        setCatLoading(false);
      })
      .catch(() => setCatLoading(false));
  }, [selectedCategory, selectedYear]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/analytics/visual-dashboard`)
      .then(r => r.json())
      .then(res => {
        if (res && res.salesTrends) {
          setDashboardSummary(res.summary);
          setSalesTrends(res.salesTrends);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    if (collection === 'customers') {
      setFormData({ customer_city: 'curitiba', customer_state: 'PR', customer_zip_code_prefix: '80010' });
    } else if (collection === 'products') {
      setFormData({ product_category_name_english: '', product_weight_g: '450' });
    } else if (collection === 'orders') {
      setFormData({ order_status: 'delivered', price_inr: '2800' });
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    if (collection === 'customers') {
      setFormData({
        customer_city: item.customer_city || '',
        customer_state: item.customer_state || '',
        customer_zip_code_prefix: item.customer_zip_code_prefix || ''
      });
    } else if (collection === 'products') {
      setFormData({
        product_category_name_english: item.product_category_name_english || item.product_category_name || '',
        product_weight_g: item.product_weight_g || 0
      });
    } else if (collection === 'orders') {
      const price = item.items && item.items[0] ? Math.round(item.items[0].price * BRL_TO_INR) : 2500;
      setFormData({
        order_status: item.order_status || 'delivered',
        price_inr: price
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const isEdit = Boolean(editingItem);
    const identifier = editingItem ? (editingItem._id || editingItem.customer_id || editingItem.product_id || editingItem.order_id) : '';
    const url = isEdit ? `${API_BASE_URL}/api/data/${collection}/${identifier}` : `${API_BASE_URL}/api/data/${collection}`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && (data.success || data.insertedId)) {
        setFeedback({ msg: isEdit ? 'Record updated in MongoDB!' : 'New document added! (Shown at top of Page 1)', isError: false });
        setIsModalOpen(false);
        setPage(1);

        // Refresh CRUD table, Metrics, and Category dropdown list
        loadData();
        loadMetrics();
        loadCategories();

        // If a new product category was added, switch Category Explorer directly to it
        if (collection === 'products' && formData.product_category_name_english) {
          const newCat = formData.product_category_name_english.trim().toLowerCase();
          setSelectedCategory(newCat);
        }
      } else {
        setFeedback({ msg: `Failed: ${data.error || 'Check fields'}`, isError: true });
      }
    } catch (err) {
      setFeedback({ msg: `Connection error: ${err.message}`, isError: true });
    }
  };

  const handleDelete = async (item) => {
    const identifier = item._id || item.customer_id || item.product_id || item.order_id;
    if (!window.confirm(`Delete record (${identifier}) from MongoDB?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/data/${collection}/${identifier}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ msg: 'Record removed from MongoDB!', isError: false });
        loadData();
        loadMetrics();
        loadCategories();
      } else {
        setFeedback({ msg: 'Delete failed', isError: true });
      }
    } catch (err) {
      setFeedback({ msg: `Delete error: ${err.message}`, isError: true });
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / 10));

  const navBtnStyle = (pageKey) => ({
    padding: '8px 16px',
    backgroundColor: activePage === pageKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(23, 23, 23, 0.8)',
    color: activePage === pageKey ? PALETTE.emerald : '#a3a3a3',
    border: activePage === pageKey ? `1.5px solid ${PALETTE.emerald}` : '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px'
  });

  return (
    <div style={{ backgroundColor: '#09090b', minHeight: '100vh', padding: '24px', color: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ height: '10px', width: '10px', borderRadius: '50%', backgroundColor: PALETTE.emerald, display: 'inline-block', boxShadow: `0 0 10px ${PALETTE.emerald}` }}></span>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#f4f4f5', fontWeight: 800 }}>Olist E-Commerce Sales Platform</h1>
          </div>
          <p style={{ margin: '4px 0 0 18px', color: '#71717a', fontSize: '13px' }}>
            Local MongoDB Instance: <code style={{ color: PALETTE.emerald }}>olist_analytics</code>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => window.print()} style={{ padding: '8px 15px', background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
            📄 Export PDF Report
          </button>
          <button onClick={() => setActivePage('crud_data')} style={navBtnStyle('crud_data')}>
            🗄️ Database CRUD
          </button>
          <button onClick={() => setActivePage('category_analysis')} style={navBtnStyle('category_analysis')}>
            📊 Category Explorer
          </button>
          <button onClick={() => setActivePage('visual_dashboard')} style={navBtnStyle('visual_dashboard')}>
            📈 Analytics Dashboard
          </button>
        </div>
      </div>

      {feedback.msg && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', background: feedback.isError ? '#450a0a' : '#064e3b', color: '#f8fafc', display: 'flex', justifyContent: 'space-between', border: `1px solid ${feedback.isError ? '#ef4444' : PALETTE.emerald}` }}>
          <span>{feedback.msg}</span>
          <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setFeedback({ msg: '', isError: false })}>✕</span>
        </div>
      )}

      {/* 1. DATABASE CRUD TAB */}
      {activePage === 'crud_data' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
            <button onClick={handleOpenAdd} style={{ padding: '9px 18px', backgroundColor: PALETTE.emerald, color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              + Add New {collection.slice(0, -1).toUpperCase()}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div onClick={() => { setCollection('products'); setPage(1); setSearchTerm(''); }} style={{ background: collection === 'products' ? '#18181b' : '#121215', padding: '16px', borderRadius: '10px', cursor: 'pointer', border: collection === 'products' ? `1.5px solid ${PALETTE.emerald}` : '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>COLLECTION: PRODUCTS</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fafafa', marginTop: '4px' }}>{metrics.productCount.toLocaleString('en-IN')} Documents</div>
            </div>
            <div onClick={() => { setCollection('customers'); setPage(1); setSearchTerm(''); }} style={{ background: collection === 'customers' ? '#18181b' : '#121215', padding: '16px', borderRadius: '10px', cursor: 'pointer', border: collection === 'customers' ? `1.5px solid ${PALETTE.emerald}` : '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>COLLECTION: CUSTOMERS</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fafafa', marginTop: '4px' }}>{metrics.customerCount.toLocaleString('en-IN')} Documents</div>
            </div>
            <div onClick={() => { setCollection('orders'); setPage(1); setSearchTerm(''); }} style={{ background: collection === 'orders' ? '#18181b' : '#121215', padding: '16px', borderRadius: '10px', cursor: 'pointer', border: collection === 'orders' ? `1.5px solid ${PALETTE.emerald}` : '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>COLLECTION: ORDERS</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fafafa', marginTop: '4px' }}>{metrics.orderCount.toLocaleString('en-IN')} Documents</div>
            </div>
          </div>

          <div style={{ background: '#121215', padding: '14px', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              type="text"
              placeholder={`Search ${collection} by ID, City, State, or Category...`}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              style={{ padding: '8px 14px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '8px', width: '380px' }}
            />
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>
                {loading ? 'Querying local MongoDB...' : `Total: ${totalCount.toLocaleString('en-IN')} documents | Page ${page} of ${totalPages}`}
              </span>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 12px', background: '#27272a', color: '#fff', border: 'none', borderRadius: '6px', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 12px', background: '#27272a', color: '#fff', border: 'none', borderRadius: '6px', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
            </div>
          </div>

          <div style={{ background: '#121215', borderRadius: '10px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#18181b', borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                  {collection === 'products' && (
                    <>
                      <th style={{ padding: '12px' }}>Product ID</th>
                      <th style={{ padding: '12px' }}>Category (English / Filter Key)</th>
                      <th style={{ padding: '12px' }}>Raw Category</th>
                      <th style={{ padding: '12px' }}>Weight (g)</th>
                      <th style={{ padding: '12px' }}>Actions</th>
                    </>
                  )}
                  {collection === 'customers' && (
                    <>
                      <th style={{ padding: '12px' }}>Customer ID</th>
                      <th style={{ padding: '12px' }}>City</th>
                      <th style={{ padding: '12px' }}>State</th>
                      <th style={{ padding: '12px' }}>Zip Prefix</th>
                      <th style={{ padding: '12px' }}>Actions</th>
                    </>
                  )}
                  {collection === 'orders' && (
                    <>
                      <th style={{ padding: '12px' }}>Order ID</th>
                      <th style={{ padding: '12px' }}>Customer ID</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Timestamp</th>
                      <th style={{ padding: '12px' }}>Price (₹)</th>
                      <th style={{ padding: '12px' }}>Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#71717a' }}>No records found matching query.</td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {collection === 'products' && (
                        <>
                          <td style={{ padding: '12px', fontFamily: 'monospace', color: '#38bdf8' }}>{it.product_id}</td>
                          <td style={{ padding: '12px', fontWeight: 600, color: '#fafafa' }}>{it.product_category_name_english || it.product_category_name}</td>
                          <td style={{ padding: '12px', color: '#a1a1aa' }}>{it.product_category_name || '-'}</td>
                          <td style={{ padding: '12px' }}>{it.product_weight_g || 0} g</td>
                        </>
                      )}
                      {collection === 'customers' && (
                        <>
                          <td style={{ padding: '12px', fontFamily: 'monospace', color: '#38bdf8' }}>{it.customer_id}</td>
                          <td style={{ padding: '12px', fontWeight: 600, color: '#fafafa' }}>{it.customer_city}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold', color: PALETTE.gold }}>{it.customer_state}</td>
                          <td style={{ padding: '12px' }}>{it.customer_zip_code_prefix}</td>
                        </>
                      )}
                      {collection === 'orders' && (
                        <>
                          <td style={{ padding: '12px', fontFamily: 'monospace', color: '#38bdf8' }}>{it.order_id}</td>
                          <td style={{ padding: '12px', fontFamily: 'monospace', color: '#a1a1aa' }}>{it.customer_id}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', background: it.order_status === 'delivered' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: it.order_status === 'delivered' ? PALETTE.emerald : PALETTE.gold }}>
                              {it.order_status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#a1a1aa' }}>{it.order_purchase_timestamp}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold', color: '#fafafa' }}>
                            {it.items && it.items[0] ? formatRupee(Math.round(it.items[0].price * BRL_TO_INR)) : '₹2,500'}
                          </td>
                        </>
                      )}
                      <td style={{ padding: '12px' }}>
                        <button onClick={() => handleOpenEdit(it)} style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid #27272a', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(it)} style={{ background: 'rgba(244, 63, 94, 0.15)', color: PALETTE.coral, border: '1px solid rgba(244, 63, 94, 0.3)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 2. CATEGORY EXPLORER TAB */}
      {activePage === 'category_analysis' && (
        <div>
          <div style={{ background: '#121215', padding: '16px 20px', borderRadius: '10px', marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: PALETTE.emerald }}>Filter Data:</span>

            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Category:
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ padding: '6px 12px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', minWidth: '220px' }}>
                {categoryList.map((cat, i) => (
                  <option key={i} value={cat}>{cat}</option>
                ))}
              </select>
            </label>

            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Year:
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ padding: '6px 12px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px' }}>
                <option value="ALL">All Years</option>
                <option value="2016">2016</option>
                <option value="2017">2017</option>
                <option value="2018">2018</option>
              </select>
            </label>

            {catLoading && <span style={{ color: PALETTE.gold, fontSize: '12px' }}>● Querying MongoDB aggregations...</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#121215', padding: '18px', borderRadius: '10px', borderLeft: `4px solid ${PALETTE.emerald}` }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>CATEGORY REVENUE (INR)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fafafa', marginTop: '6px' }}>{formatRupee(catSummary.totalRevenueINR)}</div>
            </div>
            <div style={{ background: '#121215', padding: '18px', borderRadius: '10px', borderLeft: `4px solid ${PALETTE.cyan}` }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>TOTAL UNITS SOLD</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fafafa', marginTop: '6px' }}>{(catSummary.totalUnitsSold || 0).toLocaleString('en-IN')} units</div>
            </div>
            <div style={{ background: '#121215', padding: '18px', borderRadius: '10px', borderLeft: `4px solid ${PALETTE.gold}` }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>TOTAL TRANSACTIONS</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fafafa', marginTop: '6px' }}>{(catSummary.totalOrders || 0).toLocaleString('en-IN')} orders</div>
            </div>
            <div style={{ background: '#121215', padding: '18px', borderRadius: '10px', borderLeft: `4px solid ${PALETTE.coral}` }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>AVERAGE BASKET SIZE</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fafafa', marginTop: '6px' }}>{formatRupee(catSummary.avgBasketINR)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: '#121215', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>Monthly Revenue (₹) - {selectedCategory} ({selectedYear})</h3>
              <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={catTrends}>
                    <defs>
                      <linearGradient id="catRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PALETTE.emerald} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={PALETTE.emerald} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="period" stroke="#71717a" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#71717a" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatRupee(v)} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="revenueINR" name="Revenue (₹)" stroke={PALETTE.emerald} fill={PALETTE.emerald} fillOpacity={0.3} strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: '#121215', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>Units Sold Velocity - {selectedCategory}</h3>
              <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="period" stroke="#71717a" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#71717a" />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="unitsSold" name="Units Sold" fill={PALETTE.cyan} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. VISUAL ANALYTICS DASHBOARD */}
      {activePage === 'visual_dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '22px' }}>
            <div style={{ background: '#121215', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 700 }}>GROSS SALES REVENUE</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#fafafa', marginTop: '8px' }}>{formatRupee(dashboardSummary.totalRevenueINR)}</div>
            </div>
            <div style={{ background: '#121215', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 700 }}>TOTAL UNITS SOLD</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#fafafa', marginTop: '8px' }}>{dashboardSummary.totalUnits.toLocaleString('en-IN')} units</div>
            </div>
            <div style={{ background: '#121215', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 700 }}>TRANSACTION VOLUME</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#fafafa', marginTop: '8px' }}>{dashboardSummary.totalOrders.toLocaleString('en-IN')} orders</div>
            </div>
            <div style={{ background: '#121215', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 700 }}>AVERAGE ORDER VALUE</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#fafafa', marginTop: '8px' }}>{formatRupee(dashboardSummary.avgBasketINR)}</div>
            </div>
          </div>

          <div style={{ background: '#121215', padding: '22px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', color: '#f4f4f5' }}>Revenue Velocity & Order Trajectory</h3>
            <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="period" stroke="#71717a" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke={PALETTE.emerald} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                  <YAxis yAxisId="right" orientation="right" stroke={PALETTE.gold} />
                  <Tooltip formatter={(v, name) => (name.includes('Revenue') ? formatRupee(v) : v)} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="revenueINR" name="Revenue (₹)" stroke={PALETTE.emerald} fill={PALETTE.emerald} fillOpacity={0.2} strokeWidth={2.5} />
                  <Area yAxisId="right" type="monotone" dataKey="orders" name="Order Volume" stroke={PALETTE.gold} fill={PALETTE.gold} fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog with Exact Schema Inputs */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#121215', padding: '24px', borderRadius: '12px', width: '420px', border: '1px solid #27272a' }}>
            <h3 style={{ margin: '0 0 16px 0', color: PALETTE.emerald }}>{editingItem ? 'Edit ' : 'Insert New '} {collection.slice(0, -1).toUpperCase()}</h3>
            <form onSubmit={handleSubmitForm}>
              {collection === 'customers' && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>City (e.g. curitiba, sao paulo):</label>
                    <input type="text" value={formData.customer_city || ''} onChange={e => setFormData({ ...formData, customer_city: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>State Code (e.g. PR, SP, RJ):</label>
                    <input type="text" value={formData.customer_state || ''} onChange={e => setFormData({ ...formData, customer_state: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Zip Code Prefix (Numeric):</label>
                    <input type="number" value={formData.customer_zip_code_prefix || ''} onChange={e => setFormData({ ...formData, customer_zip_code_prefix: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                </>
              )}

              {collection === 'products' && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Product Category (English / Key):</label>
                    <input type="text" placeholder="e.g. gaming_consoles, drones, smart_home" value={formData.product_category_name_english || ''} onChange={e => setFormData({ ...formData, product_category_name_english: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Weight in Grams (g):</label>
                    <input type="number" value={formData.product_weight_g || ''} onChange={e => setFormData({ ...formData, product_weight_g: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                </>
              )}

              {collection === 'orders' && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Order Status:</label>
                    <select value={formData.order_status || 'delivered'} onChange={e => setFormData({ ...formData, order_status: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }}>
                      <option value="delivered">delivered</option>
                      <option value="shipped">shipped</option>
                      <option value="processing">processing</option>
                      <option value="canceled">canceled</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Amount in INR (₹):</label>
                    <input type="number" value={formData.price_inr || ''} onChange={e => setFormData({ ...formData, price_inr: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: '#27272a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: PALETTE.emerald, color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Save Document</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}