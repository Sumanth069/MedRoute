import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { ShieldCheck, TrendingUp, RefreshCw, Calendar, Sparkles } from 'lucide-react';

// Color palette for charts
const COLORS = ['#3b82f6', '#10b981', '#a855f7', '#fbbf24', '#f87171', '#06b6d4'];

export default function Analytics() {
  const [stats, setStats] = useState({
    total_items_saved: 0,
    total_waste_prevented_rs: 0,
    active_deliveries: 0,
    completed_deliveries: 0,
    district_stockouts: 0,
    average_safety_horizon_days: 14.5
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching analytics stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Mock historical data: showing deployment of MedRoute over 6 months
  const monthlyImpactData = [
    { month: 'Jan', waste_rs: 95000, prevented_rs: 15000 },
    { month: 'Feb', waste_rs: 78000, prevented_rs: 28000 },
    { month: 'Mar', waste_rs: 56000, prevented_rs: 42000 },
    { month: 'Apr', waste_rs: 32000, prevented_rs: 68000 },
    { month: 'May', waste_rs: 14000, prevented_rs: 89000 },
    { month: 'Jun', waste_rs: 4500, prevented_rs: stats.total_waste_prevented_rs || 105000 },
  ];

  // Distribution by drug category
  const categorySavingsData = [
    { name: 'Critical Care (Anti-Venom)', value: Math.max(15000, stats.total_waste_prevented_rs * 0.4) },
    { name: 'Emergency (Plasma)', value: Math.max(25000, stats.total_waste_prevented_rs * 0.3) },
    { name: 'Chronic Care (Insulin)', value: Math.max(18000, stats.total_waste_prevented_rs * 0.2) },
    { name: 'Primary Vaccines', value: Math.max(8000, stats.total_waste_prevented_rs * 0.1) }
  ];

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', color: 'var(--text-bright)', margin: 0, fontFamily: 'var(--font-mono)' }}>
            SUPPLY CHAIN IMPACT & WASTE METRICS
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Monitoring safety buffers and budget wastage reduction
          </span>
        </div>
        <button 
          onClick={loadStats} 
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
          Reload Analytics
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin-anim" />
          <div style={{ marginTop: '12px' }}>Computing district metrics...</div>
        </div>
      ) : (
        <>
          {/* Top row: Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="stat-card glass-panel" style={{ padding: '20px' }}>
              <div className="stat-label">Total Medicines Saved</div>
              <div className="stat-value success" style={{ fontSize: '32px' }}>
                {stats.total_items_saved} units
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                Saved from expiration waste
              </span>
            </div>

            <div className="stat-card glass-panel" style={{ padding: '20px' }}>
              <div className="stat-label">Wastage Budget Saved</div>
              <div className="stat-value success" style={{ fontSize: '32px' }}>
                Rs. {stats.total_waste_prevented_rs}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                Retained public health funds
              </span>
            </div>

            <div className="stat-card glass-panel" style={{ padding: '20px' }}>
              <div className="stat-label">Completed Deliveries</div>
              <div className="stat-value primary" style={{ fontSize: '32px' }}>
                {stats.completed_deliveries}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                Inter-clinic transfers verified
              </span>
            </div>

            <div className="stat-card glass-panel" style={{ padding: '20px' }}>
              <div className="stat-label">Average Safety Horizon</div>
              <div className="stat-value success" style={{ fontSize: '32px' }}>
                {stats.average_safety_horizon_days} Days
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                Buffer against stockouts
              </span>
            </div>
          </div>

          {/* Bottom row: Charts */}
          <div className="analytics-grid" style={{ padding: 0 }}>
            {/* Chart 1: Supply Impact Trend */}
            <div className="chart-card glass-panel">
              <h3 className="chart-title">
                <TrendingUp size={16} style={{ color: '#60a5fa', marginRight: '8px', verticalAlign: 'middle' }} />
                Wastage Reduction Trend (Pre & Post MedRoute)
              </h3>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={monthlyImpactData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0d1326', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} 
                  />
                  <Legend />
                  <Line 
                    name="Expired Medicine Cost (Rs.)" 
                    type="monotone" 
                    dataKey="waste_rs" 
                    stroke="#f87171" 
                    strokeWidth={3} 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    name="Prevented Waste Cost (Rs.)" 
                    type="monotone" 
                    dataKey="prevented_rs" 
                    stroke="#34d399" 
                    strokeWidth={3} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Category Breakdown */}
            <div className="chart-card glass-panel">
              <h3 className="chart-title">
                <Sparkles size={16} style={{ color: '#a855f7', marginRight: '8px', verticalAlign: 'middle' }} />
                Savings Distribution by Category
              </h3>
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={categorySavingsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categorySavingsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `Rs. ${Math.round(value)}`}
                    contentStyle={{ backgroundColor: '#0d1326', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} 
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', color: 'var(--text-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
