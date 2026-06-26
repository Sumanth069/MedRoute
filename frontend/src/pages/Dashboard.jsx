import React, { useState, useEffect, useRef } from 'react';
import DistrictMap from '../components/DistrictMap';
import ActionCard from '../components/ActionCard';
import ClinicDetail from './ClinicDetail';
import { api } from '../api/client';
import { 
  Activity, 
  AlertTriangle, 
  ShieldAlert, 
  Zap, 
  RefreshCw, 
  Compass, 
  PackageCheck,
  TrendingDown
} from 'lucide-react';

export default function Dashboard() {
  const [clinics, setClinics] = useState([]);
  const [manifests, setManifests] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [stats, setStats] = useState({
    total_items_saved: 0,
    total_waste_prevented_rs: 0,
    active_deliveries: 0,
    completed_deliveries: 0,
    district_stockouts: 0,
    average_safety_horizon_days: 14.5
  });
  const [alerts, setAlerts] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [loadingOptimizer, setLoadingOptimizer] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const wsRef = useRef(null);

  // Load initial data
  const loadData = async () => {
    try {
      const clinicsData = await api.getClinics();
      setClinics(clinicsData);
      
      const manifestsData = await api.getManifests();
      setManifests(manifestsData);
      
      const statsData = await api.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  // Run Optimizer manually
  const runOptimizationEngine = async () => {
    setLoadingOptimizer(true);
    try {
      const recs = await api.runOptimizer();
      setRecommendations(recs);
    } catch (err) {
      console.error('Error running optimization engine:', err);
    } finally {
      setLoadingOptimizer(false);
    }
  };

  // Setup WebSockets for live alerts feed
  useEffect(() => {
    loadData();
    
    // Connect to WebSocket alert stream
    wsRef.current = api.connectAlerts((newAlert) => {
      // Prepend the new alert
      setAlerts((prev) => [newAlert, ...prev].slice(0, 5));
      
      // Auto-reload data when a transfer status updates or manifest is created
      if (newAlert.type === 'manifest_created' || newAlert.type === 'manifest_updated') {
        loadData();
      }
    });

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleApproveManifest = () => {
    // Refresh stats and manifests
    loadData();
    // Clear the approved recommendation
    setRecommendations([]);
    // Run optimizer again to get remaining suggestions
    runOptimizationEngine();
  };

  return (
    <div className="dashboard-container">
      {/* Left panel: Map */}
      <div style={{ position: 'relative', flex: 1, height: '100%' }}>
        <DistrictMap 
          clinics={clinics}
          activeManifests={manifests}
          onSelectClinic={setSelectedClinic}
          selectedClinicId={selectedClinic?.id}
        />
        
        {/* Float map control buttons */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 1000,
          display: 'flex',
          gap: '10px'
        }}>
          <button 
            className="btn btn-secondary glass-panel"
            onClick={handleRefresh}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
          >
            <RefreshCw size={16} className={refreshing ? 'spin-anim' : ''} />
            Refresh Telemetry
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={runOptimizationEngine}
            disabled={loadingOptimizer}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
          >
            <Zap size={16} />
            {loadingOptimizer ? 'Optimizing...' : 'Run Resource Optimizer'}
          </button>
        </div>
      </div>

      {/* Right panel: Operations Command Console */}
      <div className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="sidebar-title">COMMAND CONSOLE</span>
          <span style={{ 
            fontSize: '11px', 
            background: 'rgba(16, 185, 129, 0.15)', 
            color: '#10b981', 
            padding: '3px 8px', 
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Activity size={12} />
            LIVE TELEMETRY
          </span>
        </div>

        {/* Section 1: KPI Statistics */}
        <div className="sidebar-section">
          <div className="stats-grid">
            <div className="stat-card glass-panel">
              <div className="stat-label">Stockouts</div>
              <div className="stat-value danger">{stats.district_stockouts}</div>
            </div>
            
            <div className="stat-card glass-panel">
              <div className="stat-label">Active Trans.</div>
              <div className="stat-value primary">{stats.active_deliveries}</div>
            </div>

            <div className="stat-card glass-panel">
              <div className="stat-label">Safety Horizon</div>
              <div className="stat-value success">{stats.average_safety_horizon_days}d</div>
            </div>

            <div className="stat-card glass-panel">
              <div className="stat-label">Waste Prevented</div>
              <div className="stat-value success" style={{ fontSize: '15px', wordBreak: 'break-all' }}>
                Rs. {stats.total_waste_prevented_rs}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: AI Action Cards */}
        <div className="sidebar-section" style={{ flex: 1 }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-bright)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={16} style={{ color: '#60a5fa' }} />
            AI OPTIMIZATION RECOMMENDATIONS
          </h3>
          
          {recommendations.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              color: 'var(--text-muted)',
              fontSize: '13px',
              border: '1px dashed var(--border-color)',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.01)'
            }}>
              {loadingOptimizer ? (
                <span>Running Multi-Objective Optimization Engine...</span>
              ) : (
                <span>No recommended routing plans loaded. Trigger optimizer to resolve stock balances.</span>
              )}
            </div>
          ) : (
            <div className="action-cards-container">
              {recommendations.slice(0, 3).map((rec, index) => (
                <ActionCard 
                  key={index}
                  recommendation={rec}
                  onApprove={handleApproveManifest}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Live WebSocket Alert Feed */}
        <div className="sidebar-section" style={{ borderBottom: 'none' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-bright)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} style={{ color: '#f87171' }} />
            REAL-TIME TELEMETRY ALERTS
          </h3>
          
          {alerts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '1.5rem 1rem',
              color: 'var(--text-muted)',
              fontSize: '13px',
              background: 'rgba(255, 255, 255, 0.01)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.04)'
            }}>
              Listening to live supply chain telemetry...
            </div>
          ) : (
            <div className="alert-feed">
              {alerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  className={`alert-item ${alert.type}`}
                >
                  <div>{alert.message}</div>
                  <div className="alert-time">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clinic Detail Sliding Panel */}
      {selectedClinic && (
        <ClinicDetail 
          clinicId={selectedClinic.id}
          onClose={() => setSelectedClinic(null)}
        />
      )}
      
      {/* Small inline spin animation style */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-anim {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
