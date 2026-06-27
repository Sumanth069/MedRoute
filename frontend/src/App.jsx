import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import DriverApp from './pages/DriverApp';
import Analytics from './pages/Analytics';
import ClinicDetail from './pages/ClinicDetail';
import Login from './pages/Login';
import PharmacistConsole from './pages/PharmacistConsole';
import { Compass, Truck, BarChart2, LogOut, ShieldCheck, User, Download } from 'lucide-react';

export default function App() {
  // Session-based user profile state
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('medroute_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallPopup, setShowInstallPopup] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      console.log("PWA beforeinstallprompt event captured.");
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Trigger bottom slide-up banner after 3 seconds of opening page
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if not already in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      if (!isStandalone) {
        setShowInstallPopup(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`PWA install outcome: ${outcome}`);
    setInstallPrompt(null);
  };

  const executePwaInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log(`PWA install outcome: ${outcome}`);
      setInstallPrompt(null);
      setShowInstallPopup(false);
    } else {
      alert(
        "💡 Quick PWA Installation Guide:\n\n" +
        "• Chrome (Android/PC): Tap the three-dot menu icon in the top-right corner of Chrome, then select 'Add to Home screen' or 'Install app'.\n\n" +
        "• Safari (iPhone): Tap the Share button (square with arrow) at the bottom, then scroll down and select 'Add to Home Screen'."
      );
      setShowInstallPopup(false);
    }
  };

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
    return <Login onLogin={handleLogin} />;
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
          {installPrompt && (
            <button 
              className="btn btn-primary"
              onClick={handleInstallClick}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                height: '34px',
                padding: '0 12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <Download size={14} />
              Install App
            </button>
          )}

          <div className="header-user-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '12px' }}>
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
        
        {/* Pharmacist View: loads the advanced verification console */}
        {user.role === 'pharmacist' && (
          <PharmacistConsole clinicId={user.clinicId} />
        )}
      </main>
      
      {/* Custom Bottom PWA Installation Popup Banner */}
      {showInstallPopup && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '420px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)',
          zIndex: 100000,
          animation: 'slide-up-banner 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#38bdf8' }}>
                  Install MedRoute App
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                  Add MedRoute to your home screen for instant offline inventory access & real-time route updates.
                </p>
              </div>
              <button 
                onClick={() => setShowInstallPopup(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '2px',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={executePwaInstall}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  height: '36px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Install Now
              </button>
              <button 
                onClick={() => setShowInstallPopup(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  width: '70px',
                  height: '36px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
          
          <style>{`
            @keyframes slide-up-banner {
              from { transform: translate(-50%, 120%); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
        </div>
      )}

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
