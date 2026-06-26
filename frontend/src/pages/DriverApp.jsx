import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import PriorityBadge from '../components/PriorityBadge';
import { Truck, MapPin, CheckCircle, RefreshCw, Compass, ArrowRight, Trash2, Edit } from 'lucide-react';

export default function DriverApp() {
  const [manifests, setManifests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSignId, setActiveSignId] = useState(null);
  
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  const loadManifests = async () => {
    setLoading(true);
    try {
      const data = await api.getManifests();
      // Filter out only active manifests (pending and in_transit) for driver utility
      setManifests(data);
    } catch (err) {
      console.error('Error loading manifests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManifests();
  }, []);

  const handleUpdateStatus = async (id, status, signature = null) => {
    try {
      await api.updateManifest(id, status, signature);
      loadManifests();
      setActiveSignId(null);
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  // Canvas drawing functions for digital signature
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    isDrawingRef.current = true;
    ctx.beginPath();
    
    // Support mouse & touch events coordinates
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Prevent scrolling when drawing on mobile touch screens
    e.preventDefault();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const submitSignature = (manifestId) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Get base64 data string representation of drawn canvas
    const signatureDataUrl = canvas.toDataURL('image/png');
    handleUpdateStatus(manifestId, 'delivered', signatureDataUrl);
  };

  return (
    <div className="driver-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <h2 style={{ fontSize: '20px', color: 'var(--text-bright)', margin: 0 }}>Driver Manifests</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mobile Dispatching Hub</span>
        </div>
        <button 
          onClick={loadManifests} 
          className="btn btn-secondary"
          style={{ width: '40px', height: '40px', padding: 0 }}
        >
          <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={20} className="spin-anim" style={{ marginBottom: '8px' }} />
          <div>Loading manifests...</div>
        </div>
      ) : manifests.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <Truck size={36} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
          <h4>No Active Manifests</h4>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>
            No dispatch routes are currently assigned. Approvals from the District Dashboard will show up here immediately.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: '1', flexDirection: 'column', gap: '14px' }}>
          {manifests.map((m) => (
            <div key={m.id} className="driver-manifest-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="manifest-status-badge pending" style={{ 
                  color: m.status === 'delivered' ? '#34d399' : m.status === 'in_transit' ? '#60a5fa' : '#fbbf24',
                  backgroundColor: m.status === 'delivered' ? 'rgba(16, 185, 129, 0.1)' : m.status === 'in_transit' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)'
                }}>
                  {m.status.replace('_', ' ')}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Manifest #{m.id}</span>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <PriorityBadge level={m.medicine_priority} />
                <h4 style={{ fontSize: '16px', color: 'var(--text-bright)', marginTop: '8px' }}>
                  {m.quantity} units of {m.medicine_name}
                </h4>
              </div>

              {/* Delivery Addresses */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <MapPin size={16} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-bright)' }}>PICKUP FROM:</div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{m.source_clinic_name}</div>
                  </div>
                </div>
                
                <div style={{ paddingLeft: '8px', borderLeft: '2px dashed rgba(255,255,255,0.1)', marginLeft: '7px' }}>
                  <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <MapPin size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-bright)' }}>DELIVER TO:</div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{m.dest_clinic_name}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                <span>Distance: <strong>{m.distance_km} km</strong></span>
                <span>Est. Time: <strong>{m.estimated_travel_time_mins} mins</strong></span>
              </div>

              {/* Action Buttons */}
              {m.status === 'pending' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => handleUpdateStatus(m.id, 'in_transit')}
                  style={{ width: '100%' }}
                >
                  <Truck size={16} />
                  Start Delivery Route
                </button>
              )}

              {m.status === 'in_transit' && activeSignId !== m.id && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveSignId(m.id)}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  <CheckCircle size={16} />
                  Mark as Delivered
                </button>
              )}

              {/* Signature Capture Box */}
              {activeSignId === m.id && (
                <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-bright)' }}>
                      Recipient E-Signature:
                    </span>
                    <button 
                      onClick={clearSignature}
                      style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={12} />
                      Clear Signature
                    </button>
                  </div>
                  
                  {/* Drawing Signature Canvas */}
                  <div className="signature-box">
                    <canvas 
                      ref={canvasRef}
                      className="signature-canvas"
                      width="400"
                      height="120"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: '12px', pointerEvents: 'none' }}>
                      Sign here to confirm receipt
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setActiveSignId(null)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => submitSignature(m.id)}
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      Confirm Signature & Deliver
                    </button>
                  </div>
                </div>
              )}

              {m.status === 'delivered' && m.driver_signature && (
                <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Digital Signature Verified:
                  </span>
                  <img 
                    src={m.driver_signature} 
                    alt="Signature" 
                    style={{ 
                      height: '40px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '4px',
                      padding: '2px'
                    }} 
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
