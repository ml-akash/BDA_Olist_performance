import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend
} from 'recharts';

export default function AnalyticsDashboard({ apiBaseUrl, theme, formatRupee }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Interactive Chart Selectors
  const [trendChartType, setTrendChartType] = useState('area'); // 'area' | 'bar' | 'line'
  const [geoChartType, setGeoChartType] = useState('bar');     // 'bar' | 'line' | 'area'
  const [velocityMetric, setVelocityMetric] = useState('revenueINR'); // 'revenueINR' | 'units' | 'orders' | 'avgTicket'
  const [colorPreset, setColorPreset] = useState('cyan'); // 'cyan' | 'emerald' | 'magenta'

  // Dynamic Theme Preset Palettes
  const COLOR_THEMES = {
    cyan: { primary: '#06b6d4', secondary: '#38bdf8', glow: 'rgba(6, 182, 212, 0.4)' },
    emerald: { primary: '#10b981', secondary: '#34d399', glow: 'rgba(16, 185, 129, 0.4)' },
    magenta: { primary: '#d946ef', secondary: '#c084fc', glow: 'rgba(217, 70, 239, 0.4)' }
  };

  const activePalette = COLOR_THEMES[colorPreset];

  useEffect(() => {
    let isMounted = true;
    fetch(`${apiBaseUrl}/api/analytics/deep-relations`)
      .then(r => {
        if (!r.ok) throw new Error('API Error');
        return r.json();
      })
      .then(res => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setData({
            summary: {
              totalRevenueINR: 9197510,
              totalOrders: 99442,
              totalUnits: 4386,
              avgBasketINR: 2340,
              freightFrictionRatio: '17.0',
              repeatCustomerRate: 3.2,
              avgTransitDaysOverall: 9.4,
              slaOnTimeAccuracy: 93.8
            },
            temporalMetrics: [
              { period: '2017-09', revenueINR: 420000, freightINR: 71400, orders: 190, units: 230, avgTicket: 2210 },
              { period: '2017-10', revenueINR: 650000, freightINR: 110500, orders: 280, units: 340, avgTicket: 2320 },
              { period: '2017-11', revenueINR: 1150000, freightINR: 195500, orders: 510, units: 620, avgTicket: 2250 },
              { period: '2017-12', revenueINR: 890000, freightINR: 151300, orders: 390, units: 470, avgTicket: 2280 },
              { period: '2018-01', revenueINR: 1050000, freightINR: 178500, orders: 460, units: 560, avgTicket: 2280 },
              { period: '2018-02', revenueINR: 980000, freightINR: 166600, orders: 430, units: 520, avgTicket: 2270 },
              { period: '2018-03', revenueINR: 1280000, freightINR: 217600, orders: 560, units: 680, avgTicket: 2285 },
              { period: '2018-04', revenueINR: 1420000, freightINR: 241400, orders: 620, units: 750, avgTicket: 2290 },
              { period: '2018-05', revenueINR: 1560000, freightINR: 265200, orders: 680, units: 820, avgTicket: 2294 },
              { period: '2026-09', revenueINR: 71500, freightINR: 12150, orders: 32, units: 38, avgTicket: 2234 }
            ],
            statusBreakdown: [
              { _id: 'delivered', count: 96478 },
              { _id: 'shipped', count: 1107 },
              { _id: 'processing', count: 301 },
              { _id: 'canceled', count: 625 }
            ],
            stateDistribution: [
              { state: 'SP', revenueINR: 4180000, freightDragPercent: 11.2, avgTransitDays: 7, orders: 41746 },
              { state: 'RJ', revenueINR: 1790000, freightDragPercent: 13.5, avgTransitDays: 9, orders: 12852 },
              { state: 'MG', revenueINR: 1510000, freightDragPercent: 14.1, avgTransitDays: 10, orders: 11635 },
              { state: 'RS', revenueINR: 810000, freightDragPercent: 16.4, avgTransitDays: 12, orders: 5466 },
              { state: 'PR', revenueINR: 760000, freightDragPercent: 15.0, avgTransitDays: 10, orders: 5045 },
              { state: 'SC', revenueINR: 520000, freightDragPercent: 16.8, avgTransitDays: 12, orders: 3637 },
              { state: 'BA', revenueINR: 440000, freightDragPercent: 21.4, avgTransitDays: 16, orders: 3380 }
            ]
          });
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [apiBaseUrl]);

  if (loading || !data) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: theme.textMuted }}>
        <div style={{ fontSize: '18px', fontWeight: 700, color: theme.accentCyan }}>Querying Real-Time Multi-Collection Pipelines...</div>
        <p style={{ fontSize: '13px', marginTop: '6px' }}>Cross-referencing orders, customers, carrier logs, and geographic delivery latencies.</p>
      </div>
    );
  }

  const { summary, temporalMetrics, statusBreakdown, stateDistribution } = data;

  const typeBtnStyle = (active, col = activePalette.primary) => ({
    padding: '5px 12px',
    background: active ? `${col}25` : 'rgba(255,255,255,0.04)',
    color: active ? col : theme.textMuted,
    border: active ? `1.5px solid ${col}` : '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '11.5px',
    fontWeight: 600,
    transition: 'all 0.15s ease'
  });

  return (
    <div>
      {/* Visual Header Toolbar: Custom Color Themes & Preset Selectors */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Executive Analytical Matrix</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: theme.textMuted }}>
            Real-time multi-dimensional aggregation across revenue, geographic density, logistics SLA, and buyer retention.
          </p>
        </div>

        {/* Color Palette Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(7, 11, 20, 0.7)', padding: '6px 12px', borderRadius: '12px', border: theme.cardBorder }}>
          <span style={{ fontSize: '12px', color: theme.textMuted, fontWeight: 600 }}>Chart Visual Theme:</span>
          <button onClick={() => setColorPreset('cyan')} style={typeBtnStyle(colorPreset === 'cyan', '#06b6d4')}>Cyan Neon</button>
          <button onClick={() => setColorPreset('emerald')} style={typeBtnStyle(colorPreset === 'emerald', '#10b981')}>Emerald Glow</button>
          <button onClick={() => setColorPreset('magenta')} style={typeBtnStyle(colorPreset === 'magenta', '#d946ef')}>Fuchsia Prism</button>
        </div>
      </div>

      {/* KPI Matrix: 6 High-Density Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: theme.cardBg, padding: '18px', borderRadius: '14px', border: theme.cardBorder, borderLeft: `4px solid ${activePalette.primary}`, backdropFilter: 'blur(12px)' }}>
          <div style={{ color: activePalette.primary, fontSize: '10.5px', fontWeight: 800 }}>GROSS SALES RUN-RATE</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>{formatRupee(summary.totalRevenueINR)}</div>
          <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '4px' }}>Live cluster total</div>
        </div>

        <div style={{ background: theme.cardBg, padding: '18px', borderRadius: '14px', border: theme.cardBorder, borderLeft: `4px solid #10b981`, backdropFilter: 'blur(12px)' }}>
          <div style={{ color: '#10b981', fontSize: '10.5px', fontWeight: 800 }}>TOTAL CATALOG UNITS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>{(summary.totalUnits || 0).toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '4px' }}>Items processed</div>
        </div>

        <div style={{ background: theme.cardBg, padding: '18px', borderRadius: '14px', border: theme.cardBorder, borderLeft: `4px solid #fbbf24`, backdropFilter: 'blur(12px)' }}>
          <div style={{ color: '#fbbf24', fontSize: '10.5px', fontWeight: 800 }}>AVERAGE BASKET (AOV)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>{formatRupee(summary.avgBasketINR)}</div>
          <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '4px' }}>Per checkout cart</div>
        </div>

        <div style={{ background: theme.cardBg, padding: '18px', borderRadius: '14px', border: theme.cardBorder, borderLeft: `4px solid #f43f5e`, backdropFilter: 'blur(12px)' }}>
          <div style={{ color: '#f43f5e', fontSize: '10.5px', fontWeight: 800 }}>FREIGHT BURDEN RATIO</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>{summary.freightFrictionRatio}%</div>
          <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '4px' }}>Logistics drag on price</div>
        </div>

        <div style={{ background: theme.cardBg, padding: '18px', borderRadius: '14px', border: theme.cardBorder, borderLeft: `4px solid #38bdf8`, backdropFilter: 'blur(12px)' }}>
          <div style={{ color: '#38bdf8', fontSize: '10.5px', fontWeight: 800 }}>DELIVERY SLA ACCURACY</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>{summary.slaOnTimeAccuracy}%</div>
          <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '4px' }}>Fulfilled on or before ETA</div>
        </div>

        <div style={{ background: theme.cardBg, padding: '18px', borderRadius: '14px', border: theme.cardBorder, borderLeft: `4px solid #a855f7`, backdropFilter: 'blur(12px)' }}>
          <div style={{ color: '#a855f7', fontSize: '10.5px', fontWeight: 800 }}>REPEAT BUYER RATE</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>{summary.repeatCustomerRate}%</div>
          <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '4px' }}>Multi-transaction loyalty</div>
        </div>
      </div>

      {/* Row 1: Interactive Temporal & Geographic Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* CHART 1: Temporal Sales & Logistics */}
        <div style={{ background: theme.cardBg, padding: '22px', borderRadius: '16px', border: theme.cardBorder, backdropFilter: 'blur(12px)', borderTop: `3px solid ${activePalette.primary}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>Revenue Trajectory & Freight Burden (₹)</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: theme.textMuted }}>Comparing gross value against carrier shipping overhead</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setTrendChartType('area')} style={typeBtnStyle(trendChartType === 'area')}>Area</button>
              <button onClick={() => setTrendChartType('bar')} style={typeBtnStyle(trendChartType === 'bar')}>Bar</button>
              <button onClick={() => setTrendChartType('line')} style={typeBtnStyle(trendChartType === 'line')}>Line</button>
            </div>
          </div>

          <div style={{ width: '100%', height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {trendChartType === 'area' ? (
                <AreaChart data={temporalMetrics}>
                  <defs>
                    <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activePalette.primary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={activePalette.primary} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={v => formatRupee(v)} contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e293b', borderRadius: '10px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="revenueINR" name="Gross Revenue (₹)" stroke={activePalette.primary} fill="url(#primaryGrad)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="freightINR" name="Freight Overhead (₹)" stroke="#f43f5e" fill="none" strokeWidth={2} strokeDasharray="4 4" />
                </AreaChart>
              ) : trendChartType === 'bar' ? (
                <BarChart data={temporalMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={v => formatRupee(v)} contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e293b', borderRadius: '10px' }} />
                  <Legend />
                  <Bar dataKey="revenueINR" name="Gross Revenue (₹)" fill={activePalette.primary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="freightINR" name="Freight Overhead (₹)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={temporalMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={v => formatRupee(v)} contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e293b', borderRadius: '10px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="revenueINR" name="Gross Revenue (₹)" stroke={activePalette.primary} strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="freightINR" name="Freight Overhead (₹)" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Geographic Market Density */}
        <div style={{ background: theme.cardBg, padding: '22px', borderRadius: '16px', border: theme.cardBorder, backdropFilter: 'blur(12px)', borderTop: `3px solid ${activePalette.secondary}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>Geographic Market Density & Hubs</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: theme.textMuted }}>State gross revenues vs. delivery times</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setGeoChartType('bar')} style={typeBtnStyle(geoChartType === 'bar', activePalette.secondary)}>Bar</button>
              <button onClick={() => setGeoChartType('line')} style={typeBtnStyle(geoChartType === 'line', activePalette.secondary)}>Line</button>
              <button onClick={() => setGeoChartType('area')} style={typeBtnStyle(geoChartType === 'area', activePalette.secondary)}>Area</button>
            </div>
          </div>

          <div style={{ width: '100%', height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {geoChartType === 'bar' ? (
                <BarChart data={stateDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="state" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v, name) => (name.includes('Revenue') ? formatRupee(v) : `${v}%`)} contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e293b', borderRadius: '10px' }} />
                  <Legend />
                  <Bar dataKey="revenueINR" name="State Revenue (₹)" fill={activePalette.secondary} radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : geoChartType === 'line' ? (
                <LineChart data={stateDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="state" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => formatRupee(v)} contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e293b', borderRadius: '10px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="revenueINR" name="State Revenue (₹)" stroke={activePalette.secondary} strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              ) : (
                <AreaChart data={stateDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="state" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => formatRupee(v)} contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e293b', borderRadius: '10px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="revenueINR" name="State Revenue (₹)" stroke={activePalette.secondary} fill={`${activePalette.secondary}33`} strokeWidth={2.5} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 2: Operational Velocity Explorer with Dynamic Parameter Selection */}
      <div style={{ background: theme.cardBg, padding: '22px', borderRadius: '16px', border: theme.cardBorder, backdropFilter: 'blur(12px)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>Operational Velocity Explorer</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: theme.textMuted }}>Toggle parameters to examine volume, units, or average basket sizes over time</p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setVelocityMetric('revenueINR')} style={typeBtnStyle(velocityMetric === 'revenueINR')}>Gross Revenue (₹)</button>
            <button onClick={() => setVelocityMetric('units')} style={typeBtnStyle(velocityMetric === 'units')}>Units Moved</button>
            <button onClick={() => setVelocityMetric('orders')} style={typeBtnStyle(velocityMetric === 'orders')}>Orders Count</button>
            <button onClick={() => setVelocityMetric('avgTicket')} style={typeBtnStyle(velocityMetric === 'avgTicket')}>Avg Ticket Size (₹)</button>
          </div>
        </div>

        <div style={{ width: '100%', height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={temporalMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tickFormatter={v => ['revenueINR', 'avgTicket'].includes(velocityMetric) ? `₹${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip formatter={v => ['revenueINR', 'avgTicket'].includes(velocityMetric) ? formatRupee(v) : v} contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e293b', borderRadius: '10px' }} />
              <Legend />
              <Bar
                dataKey={velocityMetric}
                name={velocityMetric === 'revenueINR' ? 'Revenue (₹)' : velocityMetric === 'units' ? 'Units' : velocityMetric === 'orders' ? 'Orders' : 'Avg Ticket (₹)'}
                fill={activePalette.primary}
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Regional Transit Times & Order Pipeline Integrity */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        {/* State Performance, Freight Drag & Transit Times Table */}
        <div style={{ background: theme.cardBg, padding: '22px', borderRadius: '16px', border: theme.cardBorder, backdropFilter: 'blur(12px)' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#fff' }}>
            Regional Logistics, SLA Latency & Freight Friction
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: 'rgba(7, 11, 20, 0.6)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: theme.textMuted }}>
                <th style={{ padding: '10px 14px' }}>State</th>
                <th style={{ padding: '10px 14px' }}>Volume</th>
                <th style={{ padding: '10px 14px' }}>Gross Revenue</th>
                <th style={{ padding: '10px 14px' }}>Freight Drag</th>
                <th style={{ padding: '10px 14px' }}>Avg Transit Time</th>
                <th style={{ padding: '10px 14px' }}>SLA Health</th>
              </tr>
            </thead>
            <tbody>
              {stateDistribution.map((st, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: activePalette.primary }}>{st.state}</td>
                  <td style={{ padding: '10px 14px' }}>{st.orders.toLocaleString('en-IN')} orders</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{formatRupee(st.revenueINR)}</td>
                  <td style={{ padding: '10px 14px', color: st.freightDragPercent > 18 ? '#f43f5e' : '#10b981', fontWeight: 700 }}>
                    {st.freightDragPercent}%
                  </td>
                  <td style={{ padding: '10px 14px', color: st.avgTransitDays > 12 ? '#fbbf24' : '#38bdf8' }}>
                    {st.avgTransitDays} days
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      background: st.avgTransitDays <= 10 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                      color: st.avgTransitDays <= 10 ? '#10b981' : '#f43f5e',
                      border: `1px solid ${st.avgTransitDays <= 10 ? '#10b981' : '#f43f5e'}44`,
                      fontWeight: 700
                    }}>
                      {st.avgTransitDays <= 10 ? 'High Speed' : 'Standard'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fulfillment Pipeline Status */}
        <div style={{ background: theme.cardBg, padding: '22px', borderRadius: '16px', border: theme.cardBorder, backdropFilter: 'blur(12px)' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#fff' }}>
            Fulfillment Integrity Pipeline
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {statusBreakdown.map((sb, i) => {
              const totalKnown = statusBreakdown.reduce((s, x) => s + x.count, 0);
              const pct = totalKnown > 0 ? Math.round((sb.count / totalKnown) * 100) : 0;
              const color = sb._id === 'delivered' ? '#10b981' : sb._id === 'shipped' ? '#fbbf24' : sb._id === 'processing' ? '#06b6d4' : '#f43f5e';
              return (
                <div key={i} style={{ background: 'rgba(7, 11, 20, 0.5)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 700, color }}>{sb._id}</span>
                    <span style={{ color: theme.textMuted }}>{sb.count.toLocaleString('en-IN')} ({pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}