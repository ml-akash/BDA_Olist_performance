import React, { useState, useEffect, useCallback } from 'react';

export default function CustomersPage({ apiBaseUrl, theme, exportToCSV }) {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter1, setFilter1] = useState('ALL');
  const [filter2, setFilter2] = useState('ALL');
  const [filter3, setFilter3] = useState('ALL');
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ msg: '', isError: false });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ customer_city: 'curitiba', customer_state: 'PR', customer_zip_code_prefix: '80010' });

  const loadData = useCallback(() => {
    setLoading(true);
    const query = `page=${page}&limit=${pageSize}&search=${encodeURIComponent(searchTerm)}&filter1=${encodeURIComponent(filter1)}&filter2=${encodeURIComponent(filter2)}&filter3=${encodeURIComponent(filter3)}`;
    fetch(`${apiBaseUrl}/api/data/customers?${query}`)
      .then(r => r.json())
      .then(res => {
        setItems(res.data || []);
        setTotalCount(res.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiBaseUrl, page, pageSize, searchTerm, filter1, filter2, filter3]);

  const loadFilterOptions = useCallback(() => {
    fetch(`${apiBaseUrl}/api/filter-options/customers`)
      .then(r => r.json())
      .then(opts => {
        if (opts) {
          setStateOptions(opts.filter1 || []);
          setCityOptions(opts.filter2 || []);
        }
      })
      .catch(() => {});
  }, [apiBaseUrl]);

  useEffect(() => { loadFilterOptions(); }, [loadFilterOptions]);
  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ customer_city: 'curitiba', customer_state: 'PR', customer_zip_code_prefix: '80010' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (it) => {
    setEditingItem(it);
    setFormData({
      customer_city: it.customer_city || '',
      customer_state: it.customer_state || '',
      customer_zip_code_prefix: it.customer_zip_code_prefix || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEdit = Boolean(editingItem);
    const id = editingItem ? (editingItem._id || editingItem.customer_id) : '';
    const url = isEdit ? `${apiBaseUrl}/api/data/customers/${id}` : `${apiBaseUrl}/api/data/customers`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && (data.success || data.insertedId)) {
        setFeedback({ msg: isEdit ? 'Customer updated.' : 'New customer registered in MongoDB.', isError: false });
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
    const id = it._id || it.customer_id;
    if (!window.confirm(`Delete customer ${id}?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/data/customers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ msg: 'Customer profile deleted.', isError: false });
        loadData();
      }
    } catch (err) {
      setFeedback({ msg: `Delete error: ${err.message}`, isError: true });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Customer Demographics Directory</h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: theme.textMuted }}>Federative state divisions, cities, and postal codes.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => exportToCSV('customer_profiles', items)} style={{ padding: '9px 16px', background: 'rgba(45, 212, 191, 0.12)', color: theme.accentTeal, border: `1px solid ${theme.accentTeal}`, borderRadius: '9px', fontWeight: 600, cursor: 'pointer', fontSize: '12.5px' }}>
            📥 Export CSV
          </button>
          <button onClick={handleOpenAdd} style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #2dd4bf, #0f766e)', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 700, cursor: 'pointer', fontSize: '12.5px' }}>
            + Add Customer
          </button>
        </div>
      </div>

      {feedback.msg && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', background: 'rgba(45, 212, 191, 0.2)', border: `1px solid ${theme.accentTeal}` }}>
          {feedback.msg}
        </div>
      )}

      {/* Control Box */}
      <div style={{ background: theme.cardBg, padding: '18px 22px', borderRadius: '14px', marginBottom: '18px', border: theme.cardBorder, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '280px', maxWidth: '420px' }}>
            <input
              type="text"
              placeholder="Search by Customer ID, City, or State..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 16px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(45, 212, 191, 0.25)', color: '#fff', borderRadius: '8px', outline: 'none', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12.5px', color: theme.textMuted }}>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid rgba(45, 212, 191, 0.25)', color: '#fff', borderRadius: '6px', fontSize: '12.5px', cursor: 'pointer', outline: 'none' }}
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        {/* Filter Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: theme.accentTeal }}>Filters:</span>
          <select value={filter1} onChange={e => { setFilter1(e.target.value); setPage(1); }} style={{ padding: '7px 12px', background: '#0f172a', color: '#fff', border: '1px solid rgba(45, 212, 191, 0.2)', borderRadius: '6px', fontSize: '12px' }}>
            <option value="ALL">All States</option>
            {stateOptions.map((st, i) => <option key={i} value={st}>{st}</option>)}
          </select>
          <select value={filter2} onChange={e => { setFilter2(e.target.value); setPage(1); }} style={{ padding: '7px 12px', background: '#0f172a', color: '#fff', border: '1px solid rgba(45, 212, 191, 0.2)', borderRadius: '6px', fontSize: '12px' }}>
            <option value="ALL">All Top Cities</option>
            {cityOptions.map((ct, i) => <option key={i} value={ct}>{ct}</option>)}
          </select>
          <select value={filter3} onChange={e => { setFilter3(e.target.value); setPage(1); }} style={{ padding: '7px 12px', background: '#0f172a', color: '#fff', border: '1px solid rgba(45, 212, 191, 0.2)', borderRadius: '6px', fontSize: '12px' }}>
            <option value="ALL">All Zip Ranges</option>
            <option value="0-20k">00000 - 19999 (SP Urban)</option>
            <option value="20k-40k">20000 - 39999 (RJ / MG)</option>
            <option value="40k-70k">40000 - 69999 (Central)</option>
            <option value="70k+">70000+ (North / South)</option>
          </select>
          {(filter1 !== 'ALL' || filter2 !== 'ALL' || filter3 !== 'ALL' || searchTerm !== '') && (
            <button onClick={() => { setFilter1('ALL'); setFilter2('ALL'); setFilter3('ALL'); setSearchTerm(''); setPage(1); }} style={{ background: 'rgba(251, 113, 133, 0.12)', color: theme.accentRose, border: `1px solid ${theme.accentRose}`, padding: '5px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
              Reset Filters ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div style={{ background: theme.cardBg, borderRadius: '14px', border: theme.cardBorder, overflowX: 'auto', backdropFilter: 'blur(10px)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: theme.textMuted }}>
              <th style={{ padding: '14px 18px' }}>Customer ID</th>
              <th style={{ padding: '14px 18px' }}>City</th>
              <th style={{ padding: '14px 18px' }}>State</th>
              <th style={{ padding: '14px 18px' }}>Zip Prefix</th>
              <th style={{ padding: '14px 18px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: theme.accentTeal }}>Loading database records...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: theme.textMuted }}>No customers found matching criteria.</td></tr>
            ) : (
              items.map((it, idx) => (
                <tr key={it._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: theme.accentBlue }}>{it.customer_id}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>{it.customer_city}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ padding: '3px 9px', borderRadius: '5px', background: 'rgba(45, 212, 191, 0.12)', color: theme.accentTeal, fontWeight: 700, fontSize: '11.5px' }}>
                      {it.customer_state}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: theme.textMuted }}>{it.customer_zip_code_prefix}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <button onClick={() => handleOpenEdit(it)} style={{ background: 'rgba(45, 212, 191, 0.1)', color: theme.accentTeal, border: '1px solid rgba(45, 212, 191, 0.3)', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '6px' }}>Edit</button>
                    <button onClick={() => handleDelete(it)} style={{ background: 'rgba(251, 113, 133, 0.1)', color: theme.accentRose, border: '1px solid rgba(251, 113, 133, 0.3)', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Clean Dedicated Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '14px 20px', background: theme.cardBg, borderRadius: '12px', border: theme.cardBorder, flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ fontSize: '13px', color: theme.textMuted }}>
          Showing <span style={{ color: '#fff', fontWeight: 600 }}>{items.length}</span> of <span style={{ color: '#fff', fontWeight: 600 }}>{totalCount.toLocaleString('en-IN')}</span> results &bull; Page <span style={{ color: theme.accentTeal, fontWeight: 700 }}>{page}</span> of <span style={{ color: '#fff' }}>{totalPages}</span>
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
              style={{ width: '56px', padding: '6px 8px', background: '#0f172a', border: '1px solid rgba(45, 212, 191, 0.25)', color: '#fff', borderRadius: '6px', fontSize: '12px', textAlign: 'center', outline: 'none' }}
            />
            <button type="submit" style={{ padding: '6px 12px', background: 'rgba(45, 212, 191, 0.15)', color: theme.accentTeal, border: '1px solid rgba(45, 212, 191, 0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              Go
            </button>
          </form>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{ padding: '7px 16px', background: page <= 1 ? 'rgba(30, 41, 59, 0.4)' : 'rgba(30, 41, 59, 0.9)', color: page <= 1 ? '#475569' : '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '12.5px', fontWeight: 600 }}
            >
              &larr; Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '7px 16px', background: page >= totalPages ? 'rgba(30, 41, 59, 0.4)' : 'rgba(30, 41, 59, 0.9)', color: page >= totalPages ? '#475569' : '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: '12.5px', fontWeight: 600 }}
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5, 8, 17, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 }}>
          <div style={{ background: '#0f172a', padding: '26px', borderRadius: '14px', width: '420px', border: '1px solid rgba(45, 212, 191, 0.3)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: theme.accentTeal }}>{editingItem ? 'Edit Customer' : 'Add New Customer'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: theme.textMuted }}>City:</label>
                <input type="text" value={formData.customer_city} onChange={e => setFormData({ ...formData, customer_city: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '9px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: theme.textMuted }}>State Code (e.g. SP, RJ, PR):</label>
                <input type="text" value={formData.customer_state} onChange={e => setFormData({ ...formData, customer_state: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '9px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', color: theme.textMuted }}>Zip Code Prefix:</label>
                <input type="number" value={formData.customer_zip_code_prefix} onChange={e => setFormData({ ...formData, customer_zip_code_prefix: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '9px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '4px' }} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: theme.accentTeal, color: '#09090b', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}