import React, { useState, useEffect, useCallback } from 'react';

export default function ProductsPage({ apiBaseUrl, theme, exportToCSV }) {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter1, setFilter1] = useState('ALL');
  const [filter2, setFilter2] = useState('ALL');
  const [filter3, setFilter3] = useState('ALL');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ msg: '', isError: false });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ product_category_name_english: '', product_weight_g: '500' });

  const loadData = useCallback(() => {
    setLoading(true);
    const query = `page=${page}&limit=${pageSize}&search=${encodeURIComponent(searchTerm)}&filter1=${encodeURIComponent(filter1)}&filter2=${encodeURIComponent(filter2)}&filter3=${encodeURIComponent(filter3)}`;
    fetch(`${apiBaseUrl}/api/data/products?${query}`)
      .then(r => r.json())
      .then(res => {
        setItems(res.data || []);
        setTotalCount(res.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiBaseUrl, page, pageSize, searchTerm, filter1, filter2, filter3]);

  const loadFilterOptions = useCallback(() => {
    fetch(`${apiBaseUrl}/api/filter-options/products`)
      .then(r => r.json())
      .then(opts => {
        if (opts && Array.isArray(opts.filter1)) setCategoryOptions(opts.filter1);
      })
      .catch(() => {});
  }, [apiBaseUrl]);

  useEffect(() => { loadFilterOptions(); }, [loadFilterOptions]);
  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ product_category_name_english: categoryOptions[0] || 'telephony', product_weight_g: '450' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (it) => {
    setEditingItem(it);
    setFormData({
      product_category_name_english: it.product_category_name_english || it.product_category_name || '',
      product_weight_g: it.product_weight_g || 500
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEdit = Boolean(editingItem);
    const id = editingItem ? (editingItem._id || editingItem.product_id) : '';
    const url = isEdit ? `${apiBaseUrl}/api/data/products/${id}` : `${apiBaseUrl}/api/data/products`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && (data.success || data.insertedId)) {
        setFeedback({ msg: isEdit ? 'Product updated.' : 'New product registered in MongoDB.', isError: false });
        setIsModalOpen(false);
        setPage(1);
        loadData();
      } else {
        setFeedback({ msg: `Failed: ${data.error || 'Check fields'}`, isError: true });
      }
    } catch (err) {
      setFeedback({ msg: `Error: ${err.message}`, isError: true });
    }
  };

  const handleDelete = async (it) => {
    const id = it._id || it.product_id;
    if (!window.confirm(`Delete product ${id}?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/data/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ msg: 'Product removed from MongoDB.', isError: false });
        loadData();
      }
    } catch (err) {
      setFeedback({ msg: `Delete failed: ${err.message}`, isError: true });
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const target = parseInt(jumpPage, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      setPage(target);
      setJumpPage('');
    }
  };

  return (
    <div>
      {/* Title Header with Glowing Neon Badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px', color: theme.accentCyan }}>◈</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Product Specifications Catalog</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: theme.textMuted }}>Direct catalog specifications, media coverage, and weights.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => exportToCSV('products_catalog', items)} style={{ padding: '9px 16px', background: 'rgba(6, 182, 212, 0.12)', color: theme.accentCyan, border: `1px solid ${theme.accentCyan}55`, borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '12.5px' }}>
            📥 Export CSV
          </button>
          <button onClick={handleOpenAdd} style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #06b6d4, #0284c7)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '12.5px', boxShadow: '0 0 16px rgba(6, 182, 212, 0.3)' }}>
            + Add Product
          </button>
        </div>
      </div>

      {feedback.msg && (
        <div style={{ padding: '10px 16px', borderRadius: '10px', marginBottom: '16px', background: feedback.isError ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)', border: `1px solid ${feedback.isError ? theme.accentRose : theme.accentNeon}` }}>
          {feedback.msg}
        </div>
      )}

      {/* Control Box: Live Search & Dropdowns */}
      <div style={{ background: theme.cardBg, padding: '18px 22px', borderRadius: '16px', marginBottom: '18px', border: theme.cardBorder, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <input
            type="text"
            placeholder="Search by Product ID or Category..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            style={{ width: '340px', padding: '10px 16px', background: 'rgba(7, 11, 20, 0.8)', border: `1px solid ${theme.accentCyan}44`, color: '#fff', borderRadius: '10px', outline: 'none', fontSize: '13px' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12.5px', color: theme.textMuted }}>Display:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{ padding: '8px 12px', background: 'rgba(7, 11, 20, 0.8)', border: `1px solid ${theme.accentCyan}44`, color: '#fff', borderRadius: '8px', fontSize: '12.5px', cursor: 'pointer', outline: 'none' }}
            >
              <option value={10}>10 records</option>
              <option value={25}>25 records</option>
              <option value={50}>50 records</option>
              <option value={100}>100 records</option>
            </select>
          </div>
        </div>

        {/* Multi Filters Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: theme.accentCyan }}>Filters:</span>
          <select value={filter1} onChange={e => { setFilter1(e.target.value); setPage(1); }} style={{ padding: '7px 12px', background: 'rgba(7, 11, 20, 0.8)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '12px' }}>
            <option value="ALL">All Categories</option>
            {categoryOptions.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>
          <select value={filter2} onChange={e => { setFilter2(e.target.value); setPage(1); }} style={{ padding: '7px 12px', background: 'rgba(7, 11, 20, 0.8)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '12px' }}>
            <option value="ALL">All Weight Classes</option>
            <option value="light">Light (&lt; 500g)</option>
            <option value="medium">Medium (500g - 2kg)</option>
            <option value="heavy">Heavy (&gt; 2kg)</option>
          </select>
          <select value={filter3} onChange={e => { setFilter3(e.target.value); setPage(1); }} style={{ padding: '7px 12px', background: 'rgba(7, 11, 20, 0.8)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '12px' }}>
            <option value="ALL">All Media</option>
            <option value="single">Single Photo (1)</option>
            <option value="multiple">Multi Photo (2+)</option>
          </select>
          {(filter1 !== 'ALL' || filter2 !== 'ALL' || filter3 !== 'ALL' || searchTerm !== '') && (
            <button onClick={() => { setFilter1('ALL'); setFilter2('ALL'); setFilter3('ALL'); setSearchTerm(''); setPage(1); }} style={{ background: 'rgba(244, 63, 94, 0.15)', color: theme.accentRose, border: `1px solid ${theme.accentRose}`, padding: '5px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
              Reset Filters ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div style={{ background: theme.cardBg, borderRadius: '16px', border: theme.cardBorder, overflowX: 'auto', backdropFilter: 'blur(12px)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgba(7, 11, 20, 0.6)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: theme.textMuted }}>
              <th style={{ padding: '14px 18px' }}>Product ID</th>
              <th style={{ padding: '14px 18px' }}>Category Name</th>
              <th style={{ padding: '14px 18px' }}>Raw Identifier</th>
              <th style={{ padding: '14px 18px' }}>Weight</th>
              <th style={{ padding: '14px 18px' }}>Media</th>
              <th style={{ padding: '14px 18px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: theme.accentCyan }}>Loading database records...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: theme.textMuted }}>No products found matching criteria.</td></tr>
            ) : (
              items.map((it, idx) => (
                <tr key={it._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: theme.accentCyan }}>{it.product_id}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 600, color: '#f8fafc' }}>{it.product_category_name_english || it.product_category_name}</td>
                  <td style={{ padding: '14px 18px', color: theme.textMuted }}>{it.product_category_name || '-'}</td>
                  <td style={{ padding: '14px 18px' }}>{it.product_weight_g || 0} g</td>
                  <td style={{ padding: '14px 18px', color: theme.accentAmber }}>{it.product_photos_qty || 1} 📷</td>
                  <td style={{ padding: '14px 18px' }}>
                    <button onClick={() => handleOpenEdit(it)} style={{ background: 'rgba(6, 182, 212, 0.12)', color: theme.accentCyan, border: `1px solid ${theme.accentCyan}55`, padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '6px' }}>Edit</button>
                    <button onClick={() => handleDelete(it)} style={{ background: 'rgba(244, 63, 94, 0.12)', color: theme.accentRose, border: `1px solid ${theme.accentRose}55`, padding: '5px 12px', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Clean Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '14px 20px', background: theme.cardBg, borderRadius: '14px', border: theme.cardBorder, flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ fontSize: '13px', color: theme.textMuted }}>
          Showing <span style={{ color: '#fff', fontWeight: 600 }}>{items.length}</span> of <span style={{ color: '#fff', fontWeight: 600 }}>{totalCount.toLocaleString('en-IN')}</span> results &bull; Page <span style={{ color: theme.accentCyan, fontWeight: 700 }}>{page}</span> of <span style={{ color: '#fff' }}>{totalPages}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <form onSubmit={handleJumpSubmit} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: theme.textMuted }}>Go to:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              placeholder="Page"
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              style={{ width: '56px', padding: '6px 8px', background: 'rgba(7, 11, 20, 0.8)', border: `1px solid ${theme.accentCyan}44`, color: '#fff', borderRadius: '6px', fontSize: '12px', textAlign: 'center', outline: 'none' }}
            />
            <button type="submit" style={{ padding: '6px 12px', background: 'rgba(6, 182, 212, 0.15)', color: theme.accentCyan, border: `1px solid ${theme.accentCyan}66`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              Go
            </button>
          </form>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{ padding: '7px 16px', background: page <= 1 ? 'rgba(255,255,255,0.02)' : 'rgba(7, 11, 20, 0.8)', color: page <= 1 ? '#475569' : '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '12.5px', fontWeight: 600 }}
            >
              &larr; Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '7px 16px', background: page >= totalPages ? 'rgba(255,255,255,0.02)' : 'rgba(7, 11, 20, 0.8)', color: page >= totalPages ? '#475569' : '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: '12.5px', fontWeight: 600 }}
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 }}>
          <div style={{ background: '#0d1424', padding: '26px', borderRadius: '16px', width: '420px', border: `1px solid ${theme.accentCyan}55`, boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: theme.accentCyan }}>{editingItem ? 'Edit Product' : 'Add New Product'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: theme.textMuted }}>Category (English):</label>
                <input type="text" value={formData.product_category_name_english} onChange={e => setFormData({ ...formData, product_category_name_english: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '9px', background: '#070b14', border: '1px solid #1e293b', color: '#fff', borderRadius: '8px', marginTop: '4px' }} required />
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', color: theme.textMuted }}>Weight (g):</label>
                <input type="number" value={formData.product_weight_g} onChange={e => setFormData({ ...formData, product_weight_g: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '9px', background: '#070b14', border: '1px solid #1e293b', color: '#fff', borderRadius: '8px', marginTop: '4px' }} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: theme.accentCyan, color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}