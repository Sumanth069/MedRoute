import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import PriorityBadge from '../components/PriorityBadge';
import { Truck, MapPin, CheckCircle, RefreshCw, Compass, ArrowRight, Trash2, Edit } from 'lucide-react';

export default function DriverApp() {
  const [manifests, setManifests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const standaloneCheck = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standaloneCheck);
  }, []);

  const [activeSignId, setActiveSignId] = useState(null);
  const [receivedQuantities, setReceivedQuantities] = useState({});
  
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

  const [deliveringId, setDeliveringId] = useState(null);

  const handleUpdateStatus = async (id, status, signature = null, receivedQty = null) => {
    setDeliveringId(id);
    try {
      await api.updateManifest(id, status, signature, receivedQty);
      await loadManifests();
      setActiveSignId(null);
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setDeliveringId(null);
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
    const qty = receivedQuantities[manifestId];
    if (qty === undefined || qty === '') {
      alert('Intake verification count is required to confirm delivery.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      alert('Signature canvas not loaded. Please try again.');
      return;
    }
    
    // Check if canvas is drawn on (not fully blank)
    const isCanvasBlank = (c) => {
      const blank = document.createElement('canvas');
      blank.width = c.width;
      blank.height = c.height;
      return c.toDataURL() === blank.toDataURL();
    };

    if (isCanvasBlank(canvas)) {
      alert('Please draw a signature on the canvas before confirming receipt.');
      return;
    }
    
    // Get base64 data string representation of drawn canvas
    const signatureDataUrl = canvas.toDataURL('image/png');
    handleUpdateStatus(manifestId, 'delivered', signatureDataUrl, qty);
  };

  return (
    <div className="driver-container">
      {/* PWA Install Help banner for drivers */}
      {!isStandalone && (
        <div style={{
          background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
          border: '1px solid #7dd3fc',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '16px',
          color: '#0369a1',
          fontSize: '13px',
          lineHeight: '1.5'
        }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#0369a1' }}>
            💡 PWA Install Guide
          </h4>
          To install this app on your home screen for quick offline access:
          <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
            <li><strong>Android / Chrome:</strong> Tap the green <strong>"Install App"</strong> button in the top header (or select "Add to Home screen" in Chrome menu).</li>
            <li><strong>iPhone / Safari:</strong> Tap the browser <strong>Share</strong> button and select <strong>"Add to Home Screen"</strong>.</li>
            <li><em>Note: If you are opening this from Instagram or WhatsApp, open it in your regular browser (Chrome or Safari) to enable installation.</em></li>
          </ul>
        </div>
      )}

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
                  color: m.status === 'delivered' ? (m.has_discrepancy ? '#ef4444' : '#34d399') : m.status === 'in_transit' ? '#60a5fa' : '#fbbf24',
                  backgroundColor: m.status === 'delivered' ? (m.has_discrepancy ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)') : m.status === 'in_transit' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)'
                }}>
                  {m.status === 'delivered' && m.has_discrepancy ? 'delivered with discrepancy' : m.status.replace('_', ' ')}
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
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  {/* Intake Verification Input Field */}
                  <div style={{ marginBottom: '14px', background: 'rgba(0, 0, 0, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-bright)', display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                      INTAKE VERIFICATION (ACTUALLY RECEIVED COUNT):
                    </label>
                    <input 
                      type="number"
                      placeholder={`Enter actual units received (Intended: ${m.quantity})`}
                      value={receivedQuantities[m.id] !== undefined ? receivedQuantities[m.id] : ''}
                      onChange={(e) => setReceivedQuantities({
                        ...receivedQuantities,
                        [m.id]: e.target.value
                      })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-bright)',
                        fontSize: '13.5px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        height: '40px',
                        boxSizing: 'border-box'
                      }}
                      min="0"
                    />
                    
                    {/* Dynamic Mismatch Alert */}
                    {receivedQuantities[m.id] !== undefined && receivedQuantities[m.id] !== '' && parseInt(receivedQuantities[m.id]) !== m.quantity && (
                      <div style={{ 
                        marginTop: '8px', 
                        padding: '8px 10px', 
                        borderRadius: '6px', 
                        backgroundColor: 'rgba(239, 68, 68, 0.08)', 
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        fontSize: '11px',
                        lineHeight: '1.4'
                      }}>
                        ⚠️ Intake mismatch! Intended: {m.quantity}, Received: {receivedQuantities[m.id]}. This discrepancy will be permanently flagged in the logistics ledger.
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-bright)' }}>
                      RECIPIENT E-SIGNATURE:
                    </span>
                    <button 
                      onClick={clearSignature}
                      style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                    >
                      <Trash2 size={12} />
                      Clear
                    </button>
                  </div>
                  
                  {/* Drawing Signature Canvas */}
                  <div className="signature-box" style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', touchAction: 'none' }}>
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
                      style={{ filter: 'invert(1)', background: 'transparent', touchAction: 'none' }}
                    />
                    <div style={{ color: '#94a3b8', fontSize: '11.5px', pointerEvents: 'none' }}>
                      Sign here to confirm receipt
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', width: '100%' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setActiveSignId(null)}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => submitSignature(m.id)}
                      disabled={deliveringId !== null || receivedQuantities[m.id] === undefined || receivedQuantities[m.id] === ''}
                      style={{ 
                        flex: 2.2,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        opacity: (deliveringId !== null || receivedQuantities[m.id] === undefined || receivedQuantities[m.id] === '') ? 0.5 : 1
                      }}
                    >
                      {deliveringId === m.id ? 'Delivering...' : 'Confirm Signature & Deliver'}
                    </button>
                  </div>
                </div>
              )}

              {m.status === 'delivered' && (
                <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <span>Delivered: <strong>{m.received_quantity !== undefined ? m.received_quantity : m.quantity} units</strong></span>
                    {m.has_discrepancy && (
                      <div style={{ 
                        marginTop: '6px', 
                        padding: '6px 8px', 
                        borderRadius: '4px', 
                        backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        color: '#dc2626',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        ⚠️ Discrepancy logged: Intended {m.quantity} vs Actually Received {m.received_quantity}
                      </div>
                    )}
                  </div>
                  {m.driver_signature && (
                    <>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Digital Signature Verified:
                      </span>
                      <img 
                        src={m.driver_signature} 
                        alt="Signature" 
                        style={{ 
                          height: '40px', 
                          background: '#f8fafc', 
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          padding: '2px',
                          filter: 'invert(1)'
                        }} 
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
