import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import DriverApp from './pages/DriverApp';
import Analytics from './pages/Analytics';
import { Compass, Truck, BarChart2, ShieldAlert } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <>
      <header>
        <div className="logo-container">
          <img src="/logo.svg" alt="MedRoute Logo" className="logo-img" />
          <span className="logo-text">MEDROUTE</span>
        </div>

        <div className="nav-links">
          <button 
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Compass size={16} />
            Command Center
          </button>
          
          <button 
            className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart2 size={16} />
            Supply Analytics
          </button>

          <button 
            className={`nav-btn ${activeTab === 'driver' ? 'active' : ''}`}
            onClick={() => setActiveTab('driver')}
          >
            <Truck size={16} />
            Driver Dispatch (PWA)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '11px',
            color: '#fbbf24',
            background: 'rgba(245, 158, 11, 0.1)',
            padding: '4px 10px',
            borderRadius: '10px',
            fontWeight: '600',
            fontFamily: 'var(--font-mono)'
          }}>
            District Hub: Ramanagara
          </span>
        </div>
      </header>

      {/* Render Main App Screen depending on active tab */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'driver' && <DriverApp />}
      </main>
    </>
  );
}
