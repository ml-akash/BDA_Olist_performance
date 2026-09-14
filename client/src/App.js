import React, { useState, useEffect } from 'react';
import ProductsPage from './pages/ProductsPage';
import CustomersPage from './pages/CustomersPage';
import OrdersPage from './pages/OrdersPage';
import CategoryExplorer from './pages/CategoryExplorer';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Midnight Lumina Theme Tokens: Deep Navy Canvas with High-Contrast Vivid Accents
const THEME = {
  bg: '#070b14',
  bgGradient: 'radial-gradient(ellipse at 10% 0%, rgba(14, 165, 233, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 90% 100%, rgba(217, 70, 239, 0.15) 0%, transparent 50%)',
  cardBg: 'rgba(13, 20, 36, 0.82)',
  cardBorder: '1px solid rgba(255, 255, 255, 0.08)',
  cardGlow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
  accentCyan: '#06b6d4',      // Crisp Vivid Cyan
  accentNeon: '#10b981',      // Radiant Emerald
  accentFuchsia: '#d946ef',   // Electric Fuchsia/Purple
  accentAmber: '#f59e0b',     // Bright Amber
  accentRose: '#f43f5e',      // Vivid Coral Red
  textMain: '#f8fafc',
  textMuted: '#94a3b8'
};

const formatRupee = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '₹0';
  return '₹' + Number(num).toLocaleString('en-IN');
};

const exportToCSV = (filename, rows) => {
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
  }
  const separator = ',';
  const keys = Object.keys(rows[0]).filter(k => k !== '_id');
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let val = row[k] === null || row[k] === undefined ? '' : row[k];
        if (typeof val === 'object') val = JSON.stringify(val).replace(/"/g, '""');
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function App() {
  const [activeTab, setActiveTab] = useState('products');
  const [metrics, setMetrics] = useState({ orderCount: 0, productCount: 0, customerCount: 0 });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/metrics`)
      .then(r => r.json())
      .then(d => setMetrics(d))
      .catch(() => {});
  }, [activeTab]);

  const navItems = [
    { key: 'products', label: 'Inventory Hub', icon: '◈', color: THEME.accentCyan },
    { key: 'customers', label: 'Demographics', icon: '◉', color: THEME.accentNeon },
    { key: 'orders', label: 'Transactions', icon: '✦', color: THEME.accentFuchsia },
    { key: 'category_analysis', label: 'Category Matrix', icon: '▲', color: THEME.accentAmber },
    { key: 'visual_dashboard', label: 'Executive Insights', icon: '⚡', color: '#38bdf8' }
  ];

  return (
    <div style={{
      backgroundColor: THEME.bg,
      backgroundImage: THEME.bgGradient,
      minHeight: '100vh',
      padding: '24px 36px',
      color: THEME.textMain,
      fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
    }}>
      
      {/* Top Banner Navigation */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        padding: '16px 24px',
        background: 'rgba(13, 20, 36, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        
        {/* Brand Presentation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #d946ef 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
            fontSize: '22px'
          }}>
            ✧
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(to right, #ffffff, #cbd5e1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                OLIST <span style={{ color: THEME.accentCyan }}>ANALYTICA</span>
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: THEME.accentNeon,
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                ONLINE
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', color: THEME.textMuted, fontSize: '12px' }}>
              Cloud Ground Truth &bull; Database: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>olist_analytics</span>
            </p>
          </div>
        </div>

        {/* Dynamic Glowing Pill Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(7, 11, 20, 0.6)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {navItems.map(item => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  background: isActive ? `linear-gradient(135deg, ${item.color}22, ${item.color}11)` : 'transparent',
                  color: isActive ? '#fff' : THEME.textMuted,
                  border: isActive ? `1.5px solid ${item.color}` : '1px solid transparent',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '12.5px',
                  boxShadow: isActive ? `0 0 16px ${item.color}40` : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <span style={{ color: item.color, fontSize: '14px' }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}

          <button
            onClick={() => window.print()}
            style={{
              padding: '9px 16px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12.5px',
              marginLeft: '4px',
              boxShadow: '0 0 16px rgba(245, 158, 11, 0.35)'
            }}
          >
            ⎙ Print PDF
          </button>
        </nav>
      </header>

      {/* Modern Metric Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '26px' }}>
        
        {/* Metric 1: Products */}
        <div
          onClick={() => setActiveTab('products')}
          style={{
            background: activeTab === 'products' ? 'linear-gradient(145deg, rgba(6, 182, 212, 0.12), rgba(13, 20, 36, 0.9))' : THEME.cardBg,
            border: activeTab === 'products' ? `1.5px solid ${THEME.accentCyan}` : THEME.cardBorder,
            borderRadius: '18px',
            padding: '20px 24px',
            cursor: 'pointer',
            boxShadow: activeTab === 'products' ? `0 0 24px ${THEME.accentCyan}30` : THEME.cardGlow,
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: THEME.accentCyan, fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em' }}>SKU REGISTRY</span>
            <span style={{ fontSize: '18px', color: THEME.accentCyan }}>◈</span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '8px', color: '#fff' }}>
            {metrics.productCount.toLocaleString('en-IN')}
            <span style={{ fontSize: '13px', color: THEME.textMuted, fontWeight: 500, marginLeft: '6px' }}>Products</span>
          </div>
        </div>

        {/* Metric 2: Customers */}
        <div
          onClick={() => setActiveTab('customers')}
          style={{
            background: activeTab === 'customers' ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.12), rgba(13, 20, 36, 0.9))' : THEME.cardBg,
            border: activeTab === 'customers' ? `1.5px solid ${THEME.accentNeon}` : THEME.cardBorder,
            borderRadius: '18px',
            padding: '20px 24px',
            cursor: 'pointer',
            boxShadow: activeTab === 'customers' ? `0 0 24px ${THEME.accentNeon}30` : THEME.cardGlow,
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: THEME.accentNeon, fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em' }}>CONSUMER BASE</span>
            <span style={{ fontSize: '18px', color: THEME.accentNeon }}>◉</span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '8px', color: '#fff' }}>
            {metrics.customerCount.toLocaleString('en-IN')}
            <span style={{ fontSize: '13px', color: THEME.textMuted, fontWeight: 500, marginLeft: '6px' }}>Profiles</span>
          </div>
        </div>

        {/* Metric 3: Orders */}
        <div
          onClick={() => setActiveTab('orders')}
          style={{
            background: activeTab === 'orders' ? 'linear-gradient(145deg, rgba(217, 70, 239, 0.12), rgba(13, 20, 36, 0.9))' : THEME.cardBg,
            border: activeTab === 'orders' ? `1.5px solid ${THEME.accentFuchsia}` : THEME.cardBorder,
            borderRadius: '18px',
            padding: '20px 24px',
            cursor: 'pointer',
            boxShadow: activeTab === 'orders' ? `0 0 24px ${THEME.accentFuchsia}30` : THEME.cardGlow,
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: THEME.accentFuchsia, fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em' }}>SALES LIFECYCLE</span>
            <span style={{ fontSize: '18px', color: THEME.accentFuchsia }}>✦</span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '8px', color: '#fff' }}>
            {metrics.orderCount.toLocaleString('en-IN')}
            <span style={{ fontSize: '13px', color: THEME.textMuted, fontWeight: 500, marginLeft: '6px' }}>Orders</span>
          </div>
        </div>

      </section>

      {/* Active Page Body */}
      <main>
        {activeTab === 'products' && <ProductsPage apiBaseUrl={API_BASE_URL} theme={THEME} formatRupee={formatRupee} exportToCSV={exportToCSV} />}
        {activeTab === 'customers' && <CustomersPage apiBaseUrl={API_BASE_URL} theme={THEME} formatRupee={formatRupee} exportToCSV={exportToCSV} />}
        {activeTab === 'orders' && <OrdersPage apiBaseUrl={API_BASE_URL} theme={THEME} formatRupee={formatRupee} exportToCSV={exportToCSV} />}
        {activeTab === 'category_analysis' && <CategoryExplorer apiBaseUrl={API_BASE_URL} theme={THEME} formatRupee={formatRupee} />}
        {activeTab === 'visual_dashboard' && <AnalyticsDashboard apiBaseUrl={API_BASE_URL} theme={THEME} formatRupee={formatRupee} />}
      </main>

    </div>
  );
}