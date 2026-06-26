import React from 'react';
import { Shield, Truck, Activity, Lock } from 'lucide-react';

export default function Login({ onLogin }) {
  const profiles = [
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

  return (
    <div className="login-container glass-panel" style={{ padding: '2.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <img 
          src="/logo.svg" 
          alt="MedRoute Logo" 
          style={{ width: '48px', height: '48px', marginBottom: '12px' }} 
        />
        <h2 style={{ fontSize: '24px', color: 'var(--text-heading)', fontFamily: 'var(--font-mono)', margin: 0 }}>
          MEDROUTE SECURE GATEWAY
        </h2>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Select a government profile to access health telemetry
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {profiles.map((p, idx) => (
          <div 
            key={idx} 
            className="profile-card"
            onClick={() => handleSelectProfile(p)}
          >
            <div className={`profile-avatar ${p.avatarClass}`}>
              {p.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', color: 'var(--text-bright)', fontSize: '15px' }}>
                {p.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {p.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-blue)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                {p.email}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '2rem', fontSize: '11.5px', color: 'var(--text-muted)' }}>
        <Lock size={12} />
        <span>Government Supply Chain Protocol SSL Secured</span>
      </div>
    </div>
  );
}
