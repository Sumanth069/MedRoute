import React, { useState, useEffect } from 'react';
import XAIPanel from '../components/XAIPanel';
import PriorityBadge from '../components/PriorityBadge';
import { api } from '../api/client';
import { X, Phone, MapPin, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';

export default function ClinicDetail({ clinicId, onClose }) {
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadClinicDetails = async () => {
    setLoading(true);
    try {
      const data = await api.getClinicDetail(clinicId);
      setClinic(data);
    } catch (err) {
      console.error('Error fetching clinic details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinicDetails();
  }, [clinicId]);

  if (loading) {
    return (
      <div className="detail-overlay">
        <div className="detail-panel" style={{ justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin-anim" />
          <span style={{ marginTop: '12px' }}>Loading Command Center console...</span>
        </div>
      </div>
    );
  }

  if (!clinic) return null;

  return (
    <div className="detail-overlay">
      <div className="detail-panel">
        <div className="panel-header">
          <div>
            <h2 style={{ fontSize: '18px', color: 'var(--text-bright)', margin: 0 }}>
              {clinic.name}
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{clinic.type} Console</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="panel-body">
          {/* Clinic metadata contact block */}
          <div className="glass-panel" style={{ padding: '14px', marginBottom: '1.5rem', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <MapPin size={14} style={{ color: '#60a5fa' }} />
              <span>{clinic.address}</span>
            </div>
            {clinic.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={14} style={{ color: '#10b981' }} />
                <span>{clinic.phone}</span>
              </div>
            )}
          </div>

          <h3 style={{ fontSize: '14px', color: 'var(--text-bright)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} style={{ color: '#10b981' }} />
            AI FORECASTING & EXPLANATORY CONSOLE
          </h3>

          <div className="inventory-list">
            {clinic.inventory.map((item) => {
              // Calculate percent of maximum visual scale (say 500 units max)
              const stockPercent = Math.min(100, (item.current_stock / 250) * 100);
              
              // Colors for stock fill
              let progressColor = '#10b981'; // Green
              if (item.current_stock === 0 || item.days_until_stockout <= 3.0) {
                progressColor = '#ef4444'; // Red
              } else if (item.days_until_stockout <= 7.0) {
                progressColor = '#f59e0b'; // Orange
              }

              return (
                <div key={item.id} className="inventory-item">
                  <div className="inv-main-info">
                    <div>
                      <strong style={{ fontSize: '15px', color: 'var(--text-bright)' }}>
                        {item.medicine_name}
                      </strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Batch: {item.batch_name} | {item.medicine_category}
                      </div>
                    </div>
                    <PriorityBadge level={item.priority_level} />
                  </div>

                  <div className="inv-stock-indicator">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span>Current Stock: <strong>{item.current_stock}</strong> units</span>
                        <span>Usage: {item.avg_daily_consumption}/day</span>
                      </div>
                      <div className="inv-progress-bar">
                        <div 
                          className="inv-progress-fill" 
                          style={{ width: `${stockPercent}%`, backgroundColor: progressColor }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* AI Stockout Prediction Box */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ 
                      fontSize: '12.5px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      marginBottom: '8px'
                    }}>
                      <span>
                        AI Stockout Forecast:{' '}
                        {item.current_stock === 0 ? (
                          <strong style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={12} />
                            STOCKOUT NOW
                          </strong>
                        ) : item.days_until_stockout <= 3.0 ? (
                          <strong style={{ color: '#ef4444' }}>
                            {item.days_until_stockout} Days (Critical)
                          </strong>
                        ) : item.days_until_stockout <= 7.0 ? (
                          <strong style={{ color: '#f59e0b' }}>
                            {item.days_until_stockout} Days (Warning)
                          </strong>
                        ) : (
                          <strong style={{ color: '#10b981' }}>
                            {item.days_until_stockout} Days (Safe)
                          </strong>
                        )}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Confidence: <strong>{item.confidence}%</strong>
                      </span>
                    </div>

                    {/* Explainable AI Breakdowns */}
                    {item.current_stock > 0 && (
                      <XAIPanel reasons={item.xai_reasons} />
                    )}
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
