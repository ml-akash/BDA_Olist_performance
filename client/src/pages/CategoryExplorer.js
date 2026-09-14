import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function CategoryExplorer({ apiBaseUrl, theme, formatRupee }) {
  const [categoryList, setCategoryList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [catSummary, setCatSummary] = useState({ totalRevenueINR: 0, totalUnitsSold: 0, totalOrders: 0, avgBasketINR: 0 });
  const [catTrends, setCatTrends] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/analytics/categories-list`)
      .then(r => r.json())
      .then(list => {
        if (Array.isArray(list) && list.length > 0) {
          setCategoryList(list);
          setSelectedCategory(list[0]);
        }
      })
      .catch(() => {});
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!selectedCategory) return;
    setLoading(true);
    fetch(`${apiBaseUrl}/api/analytics/category-year-insights?category=${encodeURIComponent(selectedCategory)}&year=${selectedYear}`)
      .then(r => r.json())
      .then(res => {
        if (res && res.trends) {
          setCatSummary(res.summary || {});
          setCatTrends(res.trends || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiBaseUrl, selectedCategory, selectedYear]);

  return (
    <div>
      <div style={{ background: theme.cardBg, padding: '18px 24px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', border: theme.cardBorder }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: theme.accentTeal }}>Select Dimension:</span>
        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Category:
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ padding: '8px 14px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}>
            {categoryList.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
          </select>
        </label>
        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Year:
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{ padding: '8px 14px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}>
            <option value="ALL">All Recorded Years</option>
            <option value="2016">2016</option>
            <option value="2017">2017</option>
            <option value="2018">2018</option>
          </select>
        </label>
        {loading && <span style={{ color: theme.accentAmber, fontSize: '12px' }}>● Running MongoDB aggregation...</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${theme.accentTeal}`, border: theme.cardBorder }}>
          <div style={{ color: theme.textMuted, fontSize: '11px', fontWeight: 700 }}>AGGREGATED REVENUE</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px' }}>{formatRupee(catSummary.totalRevenueINR)}</div>
        </div>
        <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${theme.accentBlue}`, border: theme.cardBorder }}>
          <div style={{ color: theme.textMuted, fontSize: '11px', fontWeight: 700 }}>TOTAL UNITS SOLD</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px' }}>{(catSummary.totalUnitsSold || 0).toLocaleString('en-IN')} units</div>
        </div>
        <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${theme.accentAmber}`, border: theme.cardBorder }}>
          <div style={{ color: theme.textMuted, fontSize: '11px', fontWeight: 700 }}>TOTAL ORDERS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px' }}>{(catSummary.totalOrders || 0).toLocaleString('en-IN')} orders</div>
        </div>
        <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${theme.accentRose}`, border: theme.cardBorder }}>
          <div style={{ color: theme.textMuted, fontSize: '11px', fontWeight: 700 }}>AVERAGE BASKET</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px' }}>{formatRupee(catSummary.avgBasketINR)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
        <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', border: theme.cardBorder }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Temporal Revenue Trajectory (₹) - {selectedCategory}</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={catTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => formatRupee(v)} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="revenueINR" stroke={theme.accentTeal} fill={theme.accentTeal} fillOpacity={0.25} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', border: theme.cardBorder }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Monthly Unit Velocity - {selectedCategory}</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                <Bar dataKey="unitsSold" fill={theme.accentBlue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}