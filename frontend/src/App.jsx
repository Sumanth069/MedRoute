import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import DriverApp from './pages/DriverApp';
import Analytics from './pages/Analytics';
import ClinicDetail from './pages/ClinicDetail';
import Login from './pages/Login';
import { Compass, Truck, BarChart2, LogOut, ShieldCheck, User } from 'lucide-react';

export default function App() {
  // Session-based user profile state
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('medroute_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    sessionStorage.setItem('medroute_user', JSON.stringify(loggedInUser));
    
    // Default tabs based on role
    if (loggedInUser.role === 'driver') {
      setActiveTab('driver');
    } else if (loggedInUser.role === 'pharmacist') {
      setActiveTab('pharmacist');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('medroute_user');
  };

  // If user is not authenticated, show gateway login screen
  if (!user) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f1f5f9',
        backgroundImage: 'radial-gradient(circle at 10% 10%, rgba(37, 99, 235, 0.04) 0%, transparent 40%), linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 100% 100%, 30px 30px, 30px 30px'
      }}>
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <>
      <header>
        <div className="logo-container">
          <img src="/logo.svg" alt="MedRoute Logo" className="logo-img" />
          <span className="logo-text">MEDROUTE</span>
        </div>

        {/* Render Nav tabs strictly based on User Role */}
        <div className="nav-links">
          {user.role === 'admin' && (
            <>
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
            </>
          )}

          {user.role === 'driver' && (
            <button className="nav-btn active">
              <Truck size={16} />
              Driver Dispatch (Mobile PWA)
            </button>
          )}

          {user.role === 'pharmacist' && (
            <button className="nav-btn active">
              <Compass size={16} />
              PHC Ramanagara Console
            </button>
          )}
        </div>

        {/* User Badge & Logout Option */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '12px' }}>
            <span style={{ fontWeight: '700', color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={13} style={{ color: 'var(--accent-blue)' }} />
              {user.name}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {user.title}
            </span>
          </div>

          <button 
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ 
              width: '34px', 
              height: '34px', 
              borderRadius: '8px', 
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              color: '#dc2626'
            }}
            title="Log Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main Viewport Content mapping */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {user.role === 'admin' && activeTab === 'dashboard' && <Dashboard />}
        {user.role === 'admin' && activeTab === 'analytics' && <Analytics />}
        {user.role === 'driver' && <DriverApp />}
        
        {/* Pharmacist View: immediately loads single Ramanagara PHC panel in full-screen content */}
        {user.role === 'pharmacist' && (
          <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <ClinicDetail 
              clinicId={user.clinicId} 
              onClose={() => {}} 
              isEmbedded={true}
            />
          </div>
        )}
      </main>
      
      {/* Smooth CSS additions */}
      <style>{`
        /* Reset Leaflet popups on Light mode */
        .leaflet-popup-content-wrapper {
          color: var(--text-bright) !important;
        }
        .leaflet-popup-content h4 {
          color: var(--text-heading);
          font-weight: 700;
        }
        .leaflet-container a.leaflet-popup-close-button {
          color: var(--text-muted) !important;
        }
      `}</style>
    </>
  );
}
