import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend
} from 'recharts';

const BRL_TO_INR = 18.0;

const formatRupee = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '₹0';
  return '₹' + Number(num).toLocaleString('en-IN');
};

const PALETTE = {
  emerald: '#10b981',
  gold: '#fbbf24',
  cyan: '#06b6d4',
  coral: '#f43f5e',
  violet: '#8b5cf6'
};

const PAYMENT_COLORS = [PALETTE.emerald, PALETTE.gold, PALETTE.cyan, PALETTE.violet];

export default function App() {
  const [activePage, setActivePage] = useState('crud_data');

  // Category & Year Analysis States
  const [categoryList, setCategoryList] = useState([
    'bed_bath_table', 'health_beauty', 'watches_gifts', 'sports_leisure',
    'computers_accessories', 'furniture_decor', 'housewares', 'auto', 'telephony'
  ]);
  const [selectedCategory, setSelectedCategory] = useState('bed_bath_table');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [catAnalysisSummary, setCatAnalysisSummary] = useState({
    totalRevenueINR: 5120000,
    totalUnitsSold: 2560,
    totalOrders: 2099,
    avgBasketINR: 2439
  });
  const [catAnalysisTrends, setCatAnalysisTrends] = useState([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // CRUD States
  const [collection, setCollection] = useState('orders');
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [metrics, setMetrics] = useState({ orderCount: 0, productCount: 0, customerCount: 0 });
  const [feedback, setFeedback] = useState({ msg: '', isError: false });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Visual Dashboard State
  const [dashboardData, setDashboardData] = useState({
    summary: { totalRevenueINR: 18450000, totalUnits: 9840, totalOrders: 8250, avgBasketINR: 2236 },
    salesTrends: [],
    topProducts: [],
    categoryWiseRevenue: [],
    paymentBreakdown: []
  });

  const handleExportPDF = () => {
    window.print();
  };

  // Load Dashboard Data
  useEffect(() => {
    fetch('http://localhost:5000/api/analytics/visual-dashboard')
      .then(r => r.json())
      .then(d => setDashboardData(d))
      .catch(() => {});
  }, []);

  // Fetch Category List
  useEffect(() => {
    fetch('http://localhost:5000/api/analytics/categories-list')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d) && d.length > 0) setCategoryList(d);
      })
      .catch(() => {});
  }, []);

  // Fetch Category & Year Analytics
  useEffect(() => {
    setAnalysisLoading(true);
    fetch(`http://localhost:5000/api/analytics/category-year-insights?category=${encodeURIComponent(selectedCategory)}&year=${selectedYear}`)
      .then(r => r.json())
      .then(res => {
        if (res && res.trends) {
          setCatAnalysisSummary(res.summary);
          setCatAnalysisTrends(res.trends);
        }
        setAnalysisLoading(false);
      })
      .catch(() => setAnalysisLoading(false));
  }, [selectedCategory, selectedYear]);

  // Load Metrics
  const loadMetrics = () => {
    fetch('http://localhost:5000/api/metrics')
      .then(r => r.json())
      .then(d => setMetrics(d))
      .catch(() => {});
  };

  // Load CRUD Data
  const loadData = useCallback(() => {
    fetch(`http://localhost:5000/api/data/${collection}?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`)
      .then(r => r.json())
      .then(res => {
        setItems(res.data || []);
        setTotalCount(res.total || 0);
      })
      .catch(() => {});
  }, [collection, page, searchTerm]);

  useEffect(() => {
    loadMetrics();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // CRUD Handlers
  const handleOpenAdd = () => {
    setEditingItem(null);
    if (collection === 'orders') {
      setFormData({ object_name: 'Premium Audio Headset', customer_name: 'Mateus Silva', order_status: 'delivered', price_inr: '1850' });
    } else if (collection === 'products') {
      setFormData({ object_name: 'Smart Bluetooth Speaker', product_category_name_english: 'electronics', product_weight_g: '450' });
    } else if (collection === 'customers') {
      setFormData({ customer_name: 'Mariana Santos', customer_city: 'Mumbai', customer_state: 'MH', customer_zip_code_prefix: '400001' });
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    if (collection === 'orders') {
      const orderPrice = Array.isArray(item.items) && item.items.length > 0 ? Math.round(item.items[0].price * BRL_TO_INR) : 1500;
      setFormData({ object_name: item.object_name || '', customer_name: item.customer_name || '', order_status: item.order_status, price_inr: orderPrice });
    } else if (collection === 'products') {
      setFormData({ object_name: item.object_name || '', product_category_name_english: item.product_category_name_english || '', product_weight_g: item.product_weight_g || 0 });
    } else if (collection === 'customers') {
      setFormData({ customer_name: item.customer_name || '', customer_city: item.customer_city || '', customer_state: item.customer_state || '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const isEdit = Boolean(editingItem);
    const identifier = editingItem ? (editingItem.order_id || editingItem.product_id || editingItem.customer_id || editingItem._id) : '';
    const url = isEdit ? `http://localhost:5000/api/data/${collection}/${identifier}` : `http://localhost:5000/api/data/${collection}`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFeedback({ msg: isEdit ? 'Record updated in MongoDB!' : 'Record created in MongoDB!', isError: false });
        setIsModalOpen(false);
        loadData();
        loadMetrics();
      }
    } catch {
      setFeedback({ msg: 'Action failed', isError: true });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete this record from MongoDB?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/data/${collection}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedback({ msg: `Record deleted successfully!`, isError: false });
        loadData();
        loadMetrics();
      }
    } catch {
      setFeedback({ msg: 'Delete failed', isError: true });
    }
  };

  const navBtnStyle = (pageKey) => ({
    padding: '8px 16px',
    backgroundColor: activePage === pageKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(23, 23, 23, 0.8)',
    color: activePage === pageKey ? PALETTE.emerald : '#a3a3a3',
    border: activePage === pageKey ? `1.5px solid ${PALETTE.emerald}` : '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px',
    transition: '0.2s all'
  });

  return (
    <div className="report-container" style={{ backgroundColor: '#09090b', minHeight: '100vh', padding: '24px', color: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Formal Print-To-PDF Stylesheet */}
      <style>{`
        @media screen {
          .print-only { display: none !important; }
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 1.5cm 1.2cm;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Segoe UI', Helvetica, Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .report-container {
            background-color: #ffffff !important;
            color: #0f172a !important;
            padding: 0 !important;
          }
          .pdf-card {
            background-color: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            box-shadow: none !important;
            color: #0f172a !important;
            page-break-inside: avoid;
            margin-bottom: 16px !important;
          }
          .pdf-title {
            color: #0f172a !important;
            font-size: 22px !important;
            font-weight: 800 !important;
          }
          .pdf-subtitle {
            color: #475569 !important;
            font-size: 11px !important;
          }
          .pdf-kpi-val {
            color: #0f172a !important;
            font-size: 20px !important;
            font-weight: 800 !important;
          }
          .pdf-kpi-lbl {
            color: #64748b !important;
            font-size: 10px !important;
            font-weight: 700 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #334155 !important;
            border-bottom: 2px solid #cbd5e1 !important;
            font-size: 10px !important;
            padding: 8px 10px !important;
          }
          td {
            color: #1e293b !important;
            border-bottom: 1px solid #e2e8f0 !important;
            font-size: 10px !important;
            padding: 8px 10px !important;
          }
          .recharts-responsive-container {
            filter: grayscale(15%) contrast(110%);
          }
        }
      `}</style>

      {/* Formal Header: Visible ONLY in Generated PDF Report */}
      <div className="print-only" style={{ borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="pdf-title" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              E-Commerce Performance & Market Intelligence Report
            </h1>
            <p className="pdf-subtitle" style={{ margin: '4px 0 0 0' }}>
              Dataset: Olist Brazilian Marketplace • Standardized in Indian Rupee (₹) • Mongo Enterprise Analytics
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '10px', color: '#64748b' }}>
            <div><strong>Report Status:</strong> Official Audit</div>
            <div><strong>Generated:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        <div style={{ marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderLeft: '3px solid #0284c7', fontSize: '10.5px', color: '#334155', lineHeight: '1.4' }}>
          <strong>Executive Summary:</strong> This dossier consolidates operational turnover, catalog product movements, and category-level demand indicators. Metrics are computed directly from backend database aggregations.
        </div>
      </div>

      {/* Screen Interactive Navigation Header (Auto-hidden in Print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ height: '10px', width: '10px', borderRadius: '50%', backgroundColor: PALETTE.emerald, display: 'inline-block', boxShadow: `0 0 10px ${PALETTE.emerald}` }}></span>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#f4f4f5', fontWeight: 800 }}>Olist E-Commerce Sales Platform</h1>
          </div>
          <p style={{ margin: '4px 0 0 18px', color: '#71717a', fontSize: '13px' }}>
            Enterprise Data Intelligence • Standardized in Indian Rupee (₹) • MongoDB Ingestion
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={handleExportPDF} style={{ padding: '8px 15px', background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
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
        <div className="no-print" style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', background: feedback.isError ? '#450a0a' : '#064e3b', color: '#f8fafc', display: 'flex', justifyContent: 'space-between', border: `1px solid ${feedback.isError ? '#ef4444' : PALETTE.emerald}` }}>
          <span>{feedback.msg}</span>
          <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setFeedback({ msg: '', isError: false })}>✕</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: DATABASE CRUD TABLE */}
      {/* ========================================================================= */}
      {activePage === 'crud_data' && (
        <>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
            <button onClick={handleOpenAdd} style={{ padding: '9px 18px', backgroundColor: PALETTE.emerald, color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              + Add New {collection.slice(0, -1).toUpperCase()}
            </button>
          </div>

          <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div onClick={() => { setCollection('orders'); setPage(1); setSearchTerm(''); }} style={{ background: collection === 'orders' ? '#18181b' : '#121215', padding: '16px', borderRadius: '10px', cursor: 'pointer', border: collection === 'orders' ? `1.5px solid ${PALETTE.emerald}` : '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>COLLECTION: ORDERS</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fafafa', marginTop: '4px' }}>{metrics.orderCount.toLocaleString('en-IN')} Documents</div>
            </div>
            <div onClick={() => { setCollection('products'); setPage(1); setSearchTerm(''); }} style={{ background: collection === 'products' ? '#18181b' : '#121215', padding: '16px', borderRadius: '10px', cursor: 'pointer', border: collection === 'products' ? `1.5px solid ${PALETTE.emerald}` : '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>COLLECTION: PRODUCTS</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fafafa', marginTop: '4px' }}>{metrics.productCount.toLocaleString('en-IN')} Documents</div>
            </div>
            <div onClick={() => { setCollection('customers'); setPage(1); setSearchTerm(''); }} style={{ background: collection === 'customers' ? '#18181b' : '#121215', padding: '16px', borderRadius: '10px', cursor: 'pointer', border: collection === 'customers' ? `1.5px solid ${PALETTE.emerald}` : '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>COLLECTION: CUSTOMERS</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fafafa', marginTop: '4px' }}>{metrics.customerCount.toLocaleString('en-IN')} Documents</div>
            </div>
          </div>

          <div className="no-print" style={{ background: '#121215', padding: '14px', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              type="text"
              placeholder={`Search ${collection} (e.g. type 'aline', 'headset', 'delivered')...`}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              style={{ padding: '8px 14px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '8px', width: '380px' }}
            />
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Total: {totalCount} records | Page {page}</span>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 12px', background: '#27272a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Previous</button>
              <button disabled={page * 10 >= totalCount} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 12px', background: '#27272a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Next</button>
            </div>
          </div>

          <div className="pdf-card" style={{ background: '#121215', borderRadius: '10px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="print-only" style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontWeight: 700, fontSize: '11px', color: '#334155' }}>
              PRIMARY DATA RECORDS ({collection.toUpperCase()})
            </div>
            <table>
              <thead>
                <tr style={{ background: '#18181b', borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                  {collection === 'orders' && (
                    <>
                      <th style={{ padding: '12px' }}>Object Name</th>
                      <th style={{ padding: '12px' }}>Customer Name</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Total Amount (₹)</th>
                      <th className="no-print" style={{ padding: '12px' }}>Actions</th>
                    </>
                  )}
                  {collection === 'products' && (
                    <>
                      <th style={{ padding: '12px' }}>Object Name</th>
                      <th style={{ padding: '12px' }}>Category Name</th>
                      <th style={{ padding: '12px' }}>Weight</th>
                      <th className="no-print" style={{ padding: '12px' }}>Actions</th>
                    </>
                  )}
                  {collection === 'customers' && (
                    <>
                      <th style={{ padding: '12px' }}>Customer Name</th>
                      <th style={{ padding: '12px' }}>City</th>
                      <th style={{ padding: '12px' }}>State</th>
                      <th style={{ padding: '12px' }}>Zip Code</th>
                      <th className="no-print" style={{ padding: '12px' }}>Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#71717a' }}>No matching records found for "{searchTerm}".</td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const uniqueId = it.order_id || it.product_id || it.customer_id;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {collection === 'orders' && (
                          <>
                            <td style={{ padding: '12px', fontWeight: 600 }}>{it.object_name}</td>
                            <td style={{ padding: '12px', fontWeight: 500 }}>{it.customer_name}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', background: it.order_status === 'delivered' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: it.order_status === 'delivered' ? PALETTE.emerald : PALETTE.gold, border: '1px solid rgba(0,0,0,0.1)' }}>
                                {it.order_status}
                              </span>
                            </td>
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>
                              ₹{Array.isArray(it.items) && it.items[0] ? Math.round(it.items.reduce((acc, x) => acc + (x.price || 0), 0) * BRL_TO_INR).toLocaleString('en-IN') : '0'}
                            </td>
                          </>
                        )}
                        {collection === 'products' && (
                          <>
                            <td style={{ padding: '12px', fontWeight: 600 }}>{it.object_name}</td>
                            <td style={{ padding: '12px' }}>{it.product_category_name_english || it.product_category_name || 'General'}</td>
                            <td style={{ padding: '12px' }}>{it.product_weight_g || 0} g</td>
                          </>
                        )}
                        {collection === 'customers' && (
                          <>
                            <td style={{ padding: '12px', fontWeight: 600 }}>{it.customer_name}</td>
                            <td style={{ padding: '12px' }}>{it.customer_city}</td>
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{it.customer_state}</td>
                            <td style={{ padding: '12px' }}>{it.customer_zip_code_prefix}</td>
                          </>
                        )}
                        <td className="no-print" style={{ padding: '12px' }}>
                          <button onClick={() => handleOpenEdit(it)} style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid #27272a', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px' }}>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(uniqueId)} style={{ background: 'rgba(244, 63, 94, 0.15)', color: PALETTE.coral, border: '1px solid rgba(244, 63, 94, 0.3)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CATEGORY & YEAR DYNAMIC FILTERS */}
      {/* ========================================================================= */}
      {activePage === 'category_analysis' && (
        <div>
          <div className="no-print" style={{ background: '#121215', padding: '16px 20px', borderRadius: '10px', marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: PALETTE.emerald }}>Filter Data:</span>

            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Category:
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ padding: '6px 12px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', minWidth: '180px' }}>
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

            {analysisLoading && <span style={{ color: PALETTE.gold, fontSize: '12px' }}>● Updating metrics...</span>}
          </div>

          {/* Dynamic Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="pdf-card" style={{ background: '#121215', padding: '18px', borderRadius: '10px', borderLeft: `4px solid ${PALETTE.emerald}` }}>
              <div className="pdf-kpi-lbl" style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>CATEGORY REVENUE (INR)</div>
              <div className="pdf-kpi-val" style={{ fontSize: '24px', fontWeight: 'bold', color: '#fafafa', marginTop: '6px' }}>{formatRupee(catAnalysisSummary.totalRevenueINR)}</div>
            </div>
            <div className="pdf-card" style={{ background: '#121215', padding: '18px', borderRadius: '10px', borderLeft: `4px solid ${PALETTE.cyan}` }}>
              <div className="pdf-kpi-lbl" style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>TOTAL UNITS SOLD</div>
              <div className="pdf-kpi-val" style={{ fontSize: '24px', fontWeight: 'bold', color: '#fafafa', marginTop: '6px' }}>{(catAnalysisSummary.totalUnitsSold || 0).toLocaleString('en-IN')} units</div>
            </div>
            <div className="pdf-card" style={{ background: '#121215', padding: '18px', borderRadius: '10px', borderLeft: `4px solid ${PALETTE.gold}` }}>
              <div className="pdf-kpi-lbl" style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>TOTAL TRANSACTIONS</div>
              <div className="pdf-kpi-val" style={{ fontSize: '24px', fontWeight: 'bold', color: '#fafafa', marginTop: '6px' }}>{(catAnalysisSummary.totalOrders || 0).toLocaleString('en-IN')} orders</div>
            </div>
            <div className="pdf-card" style={{ background: '#121215', padding: '18px', borderRadius: '10px', borderLeft: `4px solid ${PALETTE.coral}` }}>
              <div className="pdf-kpi-lbl" style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>AVERAGE BASKET SIZE</div>
              <div className="pdf-kpi-val" style={{ fontSize: '24px', fontWeight: 'bold', color: '#fafafa', marginTop: '6px' }}>{formatRupee(catAnalysisSummary.avgBasketINR)}</div>
            </div>
          </div>

          {/* Dynamic Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className="pdf-card" style={{ background: '#121215', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>
                Monthly Revenue (₹) - {selectedCategory} ({selectedYear})
              </h3>
              <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={catAnalysisTrends}>
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
                    <Area type="monotone" dataKey="revenueINR" name="Revenue (₹)" stroke={PALETTE.emerald} fill="url(#catRevGrad)" strokeWidth={2.5} dot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="pdf-card" style={{ background: '#121215', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>
                Units Sold Velocity - {selectedCategory}
              </h3>
              <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catAnalysisTrends}>
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

          {/* Granular Breakdown Table */}
          <div className="pdf-card" style={{ background: '#121215', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>Monthly Granular Breakdown Data</h3>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr style={{ background: '#18181b', borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                    <th style={{ padding: '10px' }}>Period</th>
                    <th style={{ padding: '10px' }}>Category</th>
                    <th style={{ padding: '10px' }}>Units Sold</th>
                    <th style={{ padding: '10px' }}>Total Orders</th>
                    <th style={{ padding: '10px' }}>Gross Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {catAnalysisTrends.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.period}</td>
                      <td style={{ padding: '10px' }}>{row.category}</td>
                      <td style={{ padding: '10px' }}>{row.unitsSold}</td>
                      <td style={{ padding: '10px' }}>{row.orderCount}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{formatRupee(row.revenueINR)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: VISUAL CHARTS DASHBOARD */}
      {/* ========================================================================= */}
      {activePage === 'visual_dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '22px' }}>
            <div className="pdf-card" style={{ background: '#121215', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="pdf-kpi-lbl" style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 700 }}>GROSS SALES REVENUE</div>
              <div className="pdf-kpi-val" style={{ fontSize: '26px', fontWeight: 800, color: '#fafafa', marginTop: '8px' }}>{formatRupee(dashboardData.summary.totalRevenueINR)}</div>
            </div>
            <div className="pdf-card" style={{ background: '#121215', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="pdf-kpi-lbl" style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 700 }}>TOTAL UNITS SOLD</div>
              <div className="pdf-kpi-val" style={{ fontSize: '26px', fontWeight: 800, color: '#fafafa', marginTop: '8px' }}>{dashboardData.summary.totalUnits.toLocaleString('en-IN')} units</div>
            </div>
            <div className="pdf-card" style={{ background: '#121215', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="pdf-kpi-lbl" style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 700 }}>TRANSACTION VOLUME</div>
              <div className="pdf-kpi-val" style={{ fontSize: '26px', fontWeight: 800, color: '#fafafa', marginTop: '8px' }}>{dashboardData.summary.totalOrders.toLocaleString('en-IN')} orders</div>
            </div>
            <div className="pdf-card" style={{ background: '#121215', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="pdf-kpi-lbl" style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 700 }}>AVERAGE ORDER VALUE</div>
              <div className="pdf-kpi-val" style={{ fontSize: '26px', fontWeight: 800, color: '#fafafa', marginTop: '8px' }}>{formatRupee(dashboardData.summary.avgBasketINR)}</div>
            </div>
          </div>

          <div className="pdf-card" style={{ background: '#121215', padding: '22px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '22px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '16px' }}>Revenue Velocity & Order Trajectory</h3>
            <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.salesTrends}>
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

      {/* Formal Footer: Visible ONLY in Generated PDF Report */}
      <div className="print-only" style={{ marginTop: '24px', borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b' }}>
        <span>CONFIDENTIAL • FOR INTERNAL AUDIT & MANAGEMENT REVIEW ONLY</span>
        <span>PAGE 1 OF 1</span>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#121215', padding: '24px', borderRadius: '12px', width: '420px', border: '1px solid #27272a' }}>
            <h3 style={{ margin: '0 0 16px 0', color: PALETTE.emerald }}>{editingItem ? 'Edit ' : 'Add New '} {collection.slice(0, -1).toUpperCase()}</h3>
            <form onSubmit={handleSubmitForm}>
              {collection === 'orders' && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Object / Product Name:</label>
                    <input type="text" value={formData.object_name || ''} onChange={e => setFormData({ ...formData, object_name: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Customer Name:</label>
                    <input type="text" value={formData.customer_name || ''} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Status:</label>
                    <select value={formData.order_status || 'delivered'} onChange={e => setFormData({ ...formData, order_status: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }}>
                      <option value="delivered">delivered</option>
                      <option value="shipped">shipped</option>
                      <option value="processing">processing</option>
                      <option value="canceled">canceled</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Amount in Rupees (₹):</label>
                    <input type="number" value={formData.price_inr || ''} onChange={e => setFormData({ ...formData, price_inr: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                </>
              )}

              {collection === 'products' && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Object / Product Name:</label>
                    <input type="text" value={formData.object_name || ''} onChange={e => setFormData({ ...formData, object_name: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Category Name:</label>
                    <input type="text" value={formData.product_category_name_english || ''} onChange={e => setFormData({ ...formData, product_category_name_english: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Weight (g):</label>
                    <input type="number" value={formData.product_weight_g || ''} onChange={e => setFormData({ ...formData, product_weight_g: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                </>
              )}

              {collection === 'customers' && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Customer Name:</label>
                    <input type="text" value={formData.customer_name || ''} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>City:</label>
                    <input type="text" value={formData.customer_city || ''} onChange={e => setFormData({ ...formData, customer_city: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', color: '#a1a1aa' }}>State:</label>
                    <input type="text" value={formData.customer_state || ''} onChange={e => setFormData({ ...formData, customer_state: e.target.value })} style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: '#27272a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: PALETTE.emerald, color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}