import React, { useState, useEffect } from 'react';
import { Shield, Truck, Activity, Lock, Mail, Key, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '../api/firebase';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDemoProfiles, setShowDemoProfiles] = useState(false);
  
  // Rotating taglines state
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [quoteFade, setQuoteFade] = useState(true);

  const quotes = [
    {
      title: "Connecting health clinics. Balancing stocks. Safeguarding lives.",
      description: "MedRoute coordinates vaccine and medicine supply chains across district networks, ensuring clinical needs are met ahead of time."
    },
    {
      title: "Preventing vaccine wastage with evolutionary intelligence.",
      description: "Our client-side Genetic Algorithm schedules optimal redistribution routes, prioritizing near-expiry batches to minimize wastage."
    },
    {
      title: "Smart Digit-Swap protection securing ledger database integrity.",
      description: "Automatically detects and warns pharmacists of scrambled inputs or transposing mistakes before logs are finalized."
    },
    {
      title: "Explainable AI demand forecasting built for clinical officers.",
      description: "Predicts stockout horizons up to 10 days in advance, explaining recommendations using transparent SHAP values."
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteFade(false);
      setTimeout(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
        setQuoteFade(true);
      }, 500);
    }, 4500);
    return () => clearInterval(timer);
  }, [quotes.length]);

  const demoProfiles = [
    {
      name: 'Dr. Sumanth',
      role: 'admin',
      title: 'District Health Officer (DHO)',
      email: 'sumanth@medroute.gov.in',
      avatarClass: 'admin',
      icon: <Shield size={20} />
    },
    {
      name: 'Rajesh Kumar',
      role: 'driver',
      title: 'Vaccine Logistics Driver',
      email: 'rajesh@medroute.gov.in',
      avatarClass: 'driver',
      icon: <Truck size={20} />
    },
    {
      name: 'Dr. Lakshmi Devi',
      role: 'pharmacist',
      title: 'PHC Ramanagara Pharmacist',
      email: 'lakshmi@medroute.gov.in',
      clinicId: 1, // Ramanagara PHC
      avatarClass: 'pharmacist',
      icon: <Activity size={20} />
    }
  ];

  const handleSelectProfile = (profile) => {
    onLogin({
      name: profile.name,
      role: profile.role,
      email: profile.email,
      title: profile.title,
      clinicId: profile.clinicId || null
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const firebaseUser = await authService.loginWithEmail(email, password);
      const role = firebaseUser.role || (firebaseUser.email.includes('driver') ? 'driver' : firebaseUser.email.includes('pharmacist') ? 'pharmacist' : 'admin');
      const clinicId = firebaseUser.clinicId || (firebaseUser.email.includes('pharmacist') ? 1 : null);
      const title = firebaseUser.title || (firebaseUser.email.includes('driver') ? 'Government Dispatch Driver' : firebaseUser.email.includes('pharmacist') ? 'PHC Ramanagara Pharmacist' : 'District Health Officer (DHO)');
      const name = firebaseUser.name || firebaseUser.displayName || firebaseUser.email.split('@')[0];
      
      onLogin({
        uid: firebaseUser.uid,
        name,
        email: firebaseUser.email,
        role,
        clinicId,
        title
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const firebaseUser = await authService.loginWithGoogle();
      const role = firebaseUser.role || (firebaseUser.email.includes('driver') ? 'driver' : firebaseUser.email.includes('pharmacist') ? 'pharmacist' : 'admin');
      const clinicId = firebaseUser.clinicId || (firebaseUser.email.includes('pharmacist') ? 1 : null);
      const title = firebaseUser.title || (firebaseUser.email.includes('driver') ? 'Government Dispatch Driver' : firebaseUser.email.includes('pharmacist') ? 'PHC Ramanagara Pharmacist' : 'District Health Officer (DHO)');
      const name = firebaseUser.name || firebaseUser.displayName || firebaseUser.email.split('@')[0];

      onLogin({
        uid: firebaseUser.uid,
        name,
        email: firebaseUser.email,
        role,
        clinicId,
        title
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* Left Panel: Brand Showcase */}
      <div className="login-brand-panel" style={{
        flex: '1.2',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem',
        color: '#ffffff',
        overflow: 'hidden'
      }}>
        {/* Background Grid & Ambient Glows */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(37, 99, 235, 0.12) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)',
          opacity: 0.8,
          pointerEvents: 'none'
        }} />
        
        {/* Logo and Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 2 }}>
          <img src="/logo.svg" alt="MedRoute Logo" style={{ width: '40px', height: '40px' }} />
          <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>MEDROUTE</span>
        </div>

        {/* Tagline / Moving Text Carousel */}
        <div style={{ zIndex: 2, maxWidth: '520px', margin: 'auto 0' }}>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '800', 
            color: '#3b82f6', 
            textTransform: 'uppercase', 
            letterSpacing: '0.15em',
            marginBottom: '16px',
            fontFamily: 'var(--font-mono)'
          }}>
            SYSTEM SECURITY PROTOCOL: VERIFIED
          </div>
          
          {/* Animated Quote Wrapper */}
          <div style={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '800', 
              lineHeight: '1.3', 
              color: '#ffffff', 
              margin: '0 0 16px 0',
              transition: 'opacity 0.4s ease-in-out',
              opacity: quoteFade ? 1 : 0
            }}>
              "{quotes[currentQuoteIndex].title}"
            </h1>
            <p style={{ 
              fontSize: '14.5px', 
              color: '#94a3b8', 
              lineHeight: '1.65', 
              margin: 0,
              transition: 'opacity 0.4s ease-in-out',
              opacity: quoteFade ? 1 : 0
            }}>
              {quotes[currentQuoteIndex].description}
            </p>
          </div>

          {/* Dots Indicator */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
            {quotes.map((_, idx) => (
              <div 
                key={idx} 
                style={{
                  width: idx === currentQuoteIndex ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: idx === currentQuoteIndex ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div style={{ zIndex: 2, display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#475569' }}>
          <span>Karnataka Health Logistics Protocol</span>
          <span>v2.1.0-secure</span>
        </div>
      </div>

      {/* Right Panel: The Gateway Form */}
      <div className="login-form-panel" style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundImage: 'radial-gradient(circle at 10% 10%, rgba(37, 99, 235, 0.02) 0%, transparent 40%), linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 100% 100%, 30px 30px, 30px 30px',
        backgroundColor: '#f8fafc'
      }}>
        {/* Form Container */}
        <div className="login-container glass-panel" style={{ 
          padding: '2.5rem', 
          maxWidth: '420px', 
          width: '100%', 
          boxSizing: 'border-box',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02)'
        }}>
          {/* Header (visible on mobile only since brand panel has logo/title) */}
          <div className="mobile-only-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img 
              src="/logo.svg" 
              alt="MedRoute Logo" 
              style={{ width: '48px', height: '48px', marginBottom: '12px' }} 
            />
            <h2 style={{ fontSize: '20px', color: 'var(--text-heading)', fontFamily: 'var(--font-mono)', margin: 0, letterSpacing: '0.5px' }}>
              MEDROUTE SECURE GATEWAY
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
              Enter credentials to access district health telemetry
            </span>
          </div>

          <div className="desktop-only-header" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-bright)', margin: '0 0 6px 0' }}>
              Secure Gateway
            </h2>
            <span style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
              Provide authorized credentials to access dashboard services.
            </span>
          </div>

          {error && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontSize: '12.5px',
              marginBottom: '1.5rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-bright)', marginBottom: '6px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input 
                  type="email"
                  placeholder="e.g., sumanth@medroute.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-bright)',
                    fontSize: '14px',
                    outline: 'none',
                    height: '42px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-bright)', marginBottom: '6px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input 
                  type="password"
                  placeholder="Enter your security credentials"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-bright)',
                    fontSize: '14px',
                    outline: 'none',
                    height: '42px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button 
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ 
                height: '42px', 
                justifyContent: 'center', 
                fontSize: '14px', 
                fontWeight: '600',
                marginTop: '8px'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin-anim" />
                  Verifying Security Token...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Authenticate Credentials
                </>
              )}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            <span style={{ padding: '0 12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn btn-secondary"
            style={{ 
              width: '100%', 
              height: '42px', 
              justifyContent: 'center', 
              fontSize: '14px',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              gap: '10px'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.6z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.9-2.26C11.25 14.13 10.22 14.4 9 14.4c-2.33 0-4.3-1.57-5-3.69H.97v2.33C2.46 16.03 5.48 18 9 18z" fill="#34A853"/>
              <path d="M4 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.97a8.99 8.99 0 0 0 0 8.08L4 10.71z" fill="#FBBC05"/>
              <path d="M9 3.6c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.47.8 11.43 0 9 0 5.48 0 2.46 1.97.97 4.96L4 7.29c.7-2.12 2.67-3.69 5-3.69z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button 
              type="button"
              onClick={() => setShowDemoProfiles(!showDemoProfiles)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-blue)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '6px 12px',
                borderRadius: '4px'
              }}
            >
              {showDemoProfiles ? "Hide Demo Profiles" : "Sign in with Demo Profiles (Offline Access)"}
            </button>
          </div>

          {showDemoProfiles && (
            <div style={{ 
              marginTop: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px',
              borderTop: '1px dashed var(--border-color)',
              paddingTop: '16px'
            }}>
              {demoProfiles.map((p, idx) => (
                <div 
                  key={idx} 
                  className="profile-card"
                  onClick={() => handleSelectProfile(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.6)',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <div className={`profile-avatar ${p.avatarClass}`} style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-accent)',
                    color: 'var(--accent-blue)'
                  }}>
                    {p.icon}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-bright)', fontSize: '13px' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {p.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '2rem', fontSize: '11.5px', color: 'var(--text-muted)' }}>
            <Lock size={12} />
            <span>Government Supply Chain Protocol SSL Secured</span>
          </div>
        </div>
      </div>
    </div>
  );
}
