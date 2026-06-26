import React, { useState, useEffect } from 'react';
import XAIPanel from '../components/XAIPanel';
import PriorityBadge from '../components/PriorityBadge';
import { api } from '../api/client';
import { dbService } from '../api/firebase';
import { X, Phone, MapPin, Sparkles, RefreshCw, AlertTriangle, Check, Plus, Edit, ShieldAlert } from 'lucide-react';

export default function ClinicDetail({ clinicId, onClose, isEmbedded = false }) {
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState([]);
  
  // Audit Forms State
  const [auditingItemId, setAuditingItemId] = useState(null);
  const [auditCount, setAuditCount] = useState('');
  const [auditWarning, setAuditWarning] = useState('');
  const [auditSuccess, setAuditSuccess] = useState(null);

  // New Batch Form State
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [newBatch, setNewBatch] = useState({
    medicine_id: '',
    batch_name: '',
    current_stock: '',
    days_to_expiry: ''
  });
  const [batchError, setBatchError] = useState('');

  const loadClinicDetails = async () => {
    setLoading(true);
    try {
      const data = await api.getClinicDetail(clinicId);
      setClinic(data);
      
      const meds = await dbService.getMedicines();
      setMedicines(meds);
    } catch (err) {
      console.error('Error fetching clinic details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinicDetails();
  }, [clinicId]);

  // Handle audit input changes with constraint-validation (Failure #1 & #2)
  const handleAuditChange = (e, item) => {
    const val = e.target.value;
    setAuditCount(val);
    setAuditWarning('');

    if (val === '') return;

    const numVal = parseInt(val);
    if (isNaN(numVal) || numVal < 0) {
      setAuditWarning('Invalid quantity. Positive integers only.');
      return;
    }

    // Validation rule 1: Digits swapping alert (e.g. 156 -> 165)
    // If the difference is minor but stock values are large, flag a warning.
    const diff = Math.abs(numVal - item.current_stock);
    if (diff > 0 && diff <= 15 && item.current_stock > 100) {
      setAuditWarning(`Minor count variance detected (+/- ${diff} units). Ensure numbers aren't transposed (e.g. 156 vs 165).`);
    }

    // Validation rule 2: Consumption threshold check
    // If they input a quantity that exceeds 60 days of consumption, verify there's a reason.
    const dailyConsumption = item.avg_daily_consumption || 1.0;
    const daysOfSupply = numVal / dailyConsumption;
    if (daysOfSupply > 100) {
      setAuditWarning(`Large inventory detected (${Math.round(daysOfSupply)} days of supply). Confirm this is a fresh batch receipt.`);
    }
  };

  // Submit Daily Physical Count Audit
  const handleCommitAudit = async (item) => {
    const parsedQty = parseInt(auditCount);
    if (isNaN(parsedQty) || parsedQty < 0) return;

    try {
      // Find item in local storage DB, update the stock count
      const inventory = await dbService.getInventory();
      const dbItem = inventory.find(inv => inv.id === item.id);
      
      if (dbItem) {
        dbItem.current_stock = parsedQty;
        // Reset last updated timestamp
        dbItem.last_updated = new Date().toISOString();
        await dbService.saveInventoryItem(dbItem);
        
        setAuditSuccess(item.id);
        setTimeout(() => setAuditSuccess(null), 3000);
        setAuditingItemId(null);
        setAuditCount('');
        setAuditWarning('');
        
        // Reload details
        loadClinicDetails();
      }
    } catch (e) {
      console.error('Failed to commit stock audit:', e);
    }
  };

  // Submit New Batch Entry (Failure #3)
  const handleAddBatch = async (e) => {
    e.preventDefault();
    setBatchError('');

    if (!newBatch.medicine_id || !newBatch.batch_name || !newBatch.current_stock || !newBatch.days_to_expiry) {
      setBatchError('All fields are required.');
      return;
    }

    const stock = parseInt(newBatch.current_stock);
    const expiry = parseInt(newBatch.days_to_expiry);

    if (isNaN(stock) || stock < 0) {
      setBatchError('Stock must be a positive number.');
      return;
    }
    if (isNaN(expiry) || expiry <= 0) {
      setBatchError('Days to expiry must be greater than 0.');
      return;
    }

    try {
      await dbService.addInventoryBatch({
        clinic_id: clinicId,
        medicine_id: newBatch.medicine_id,
        batch_name: newBatch.batch_name,
        current_stock: stock,
        days_to_expiry: expiry,
        avg_daily_consumption: 1.2
      });

      setShowBatchForm(false);
      setNewBatch({ medicine_id: '', batch_name: '', current_stock: '', days_to_expiry: '' });
      loadClinicDetails();
    } catch (err) {
      setBatchError(`Failed to save batch: ${err.message}`);
    }
  };

  if (loading) {
    if (isEmbedded) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin-anim" />
          <span style={{ marginTop: '12px', fontSize: '13px' }}>Syncing local inventory telemetry...</span>
        </div>
      );
    }
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

  const renderContent = () => (
    <>
      {/* Clinic metadata contact block */}
      <div className="glass-panel" style={{ padding: '14px', marginBottom: '1.5rem', fontSize: '13px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <MapPin size={14} style={{ color: 'var(--accent-blue)' }} />
            <span style={{ color: 'var(--text-bright)' }}>{clinic.address}</span>
          </div>
          {clinic.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={14} style={{ color: 'var(--accent-green)' }} />
              <span style={{ color: 'var(--text-bright)' }}>{clinic.phone}</span>
            </div>
          )}
        </div>
        
        {/* Enable batch log entry for pharmacists */}
        {isEmbedded && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowBatchForm(true)}
            style={{ height: '34px', padding: '0 12px' }}
          >
            <Plus size={15} />
            Receive New Batch
          </button>
        )}
      </div>

      {/* Slide-out Batch Intake Form */}
      {showBatchForm && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '1.5rem', background: '#f0fdf4', borderColor: 'var(--accent-green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--accent-green)', fontWeight: '700', margin: 0 }}>
              BATCH INTAKE LOGGING (PREVENTS FAILURE #3)
            </h4>
            <button className="close-btn" style={{ width: '24px', height: '24px' }} onClick={() => setShowBatchForm(false)}>
              <X size={14} />
            </button>
          </div>
          
          {batchError && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={12} />
              {batchError}
            </div>
          )}

          <form onSubmit={handleAddBatch} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Select Medicine</label>
              <select 
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '0 8px' }}
                value={newBatch.medicine_id}
                onChange={e => setNewBatch({ ...newBatch, medicine_id: e.target.value })}
              >
                <option value="">-- Choose Drug --</option>
                {medicines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Batch Number</label>
              <input 
                type="text" 
                placeholder="e.g. B-INS-941" 
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '0 8px' }}
                value={newBatch.batch_name}
                onChange={e => setNewBatch({ ...newBatch, batch_name: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Physical Stock Count</label>
              <input 
                type="number" 
                placeholder="Initial count" 
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '0 8px' }}
                value={newBatch.current_stock}
                onChange={e => setNewBatch({ ...newBatch, current_stock: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Days to Expiry</label>
              <input 
                type="number" 
                placeholder="Expiry countdown" 
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '0 8px' }}
                value={newBatch.days_to_expiry}
                onChange={e => setNewBatch({ ...newBatch, days_to_expiry: e.target.value })}
              />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '36px' }}>
                Verify & Add to Register
              </button>
            </div>
          </form>
        </div>
      )}

      <h3 style={{ fontSize: '14px', color: 'var(--text-heading)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Sparkles size={14} style={{ color: 'var(--accent-green)' }} />
        AI DEMAND FORECASTING & EXPLAINABLE TELEMETRY
      </h3>

      <div className="inventory-list">
        {clinic.inventory.map((item) => {
          const stockPercent = Math.min(100, (item.current_stock / 250) * 100);
          
          let progressColor = 'var(--accent-green)'; // Green
          if (item.current_stock === 0 || item.days_until_stockout <= 3.0) {
            progressColor = 'var(--accent-red)'; // Red
          } else if (item.days_until_stockout <= 7.0) {
            progressColor = 'var(--accent-orange)'; // Orange
          }

          // Check if AI-triggered reorder is recommended (Failure #4)
          // 7 to 10 days until stockout triggers an automatic reorder recommendation
          const isReorderTriggered = item.days_until_stockout > 0 && item.days_until_stockout <= 10.0;
          const reorderSuggestedQty = Math.ceil(item.avg_daily_consumption * 30); // 30 days buffer order

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isReorderTriggered && (
                    <span style={{ 
                      fontSize: '10px', 
                      background: 'rgba(217, 119, 6, 0.12)', 
                      color: 'var(--accent-orange)', 
                      padding: '3px 6px', 
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      AUTO-REORDER SUCCESTED
                    </span>
                  )}
                  <PriorityBadge level={item.priority_level} />
                </div>
              </div>

              <div className="inv-stock-indicator" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Current Stock: <strong style={{ color: 'var(--text-bright)' }}>{item.current_stock}</strong> units</span>
                    <span>Usage: {item.avg_daily_consumption}/day</span>
                  </div>
                  <div className="inv-progress-bar">
                    <div 
                      className="inv-progress-fill" 
                      style={{ width: `${stockPercent}%`, backgroundColor: progressColor }}
                    ></div>
                  </div>
                </div>

                {/* Edit Stock Audit Controls (Failure #1 & #2) */}
                {isEmbedded && (
                  <div>
                    {auditingItemId === item.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', width: '220px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                          <input 
                            type="number"
                            className="glass-panel"
                            placeholder="Physical count"
                            value={auditCount}
                            onChange={(e) => handleAuditChange(e, item)}
                            style={{ width: '100%', height: '30px', padding: '0 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '12px' }}
                          />
                          <button 
                            className="btn btn-primary"
                            onClick={() => handleCommitAudit(item)}
                            style={{ width: '32px', height: '30px', padding: 0 }}
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            className="btn btn-secondary"
                            onClick={() => { setAuditingItemId(null); setAuditWarning(''); }}
                            style={{ width: '32px', height: '30px', padding: 0 }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        
                        {auditWarning && (
                          <div style={{ color: 'var(--accent-orange)', fontSize: '10px', lineHeight: '1.2', display: 'flex', gap: '4px', marginTop: '2px' }}>
                            <ShieldAlert size={12} style={{ flexShrink: 0 }} />
                            <span>{auditWarning}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button 
                        className="btn btn-secondary"
                        onClick={() => { setAuditingItemId(item.id); setAuditCount(item.current_stock); }}
                        style={{ height: '30px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit size={12} />
                        Audit Count
                      </button>
                    )}
                    {auditSuccess === item.id && (
                      <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: '600', display: 'block', marginTop: '4px', textAlign: 'right' }}>
                        ✓ Count audit saved
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* AI Auto-Indent Alert Block (Failure #4) */}
              {isReorderTriggered && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '10px 14px', 
                  background: 'rgba(217, 119, 6, 0.03)', 
                  border: '1px dashed var(--accent-orange)', 
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-bright)' }}>
                    <strong>AI Reorder Trigger</strong>: Stockout in <strong style={{ color: 'var(--accent-orange)' }}>{item.days_until_stockout} days</strong>. 
                    Suggested reorder: <strong>{reorderSuggestedQty} units</strong>.
                  </div>
                  {isEmbedded && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => alert(`Indent Request for ${reorderSuggestedQty} units of ${item.medicine_name} submitted to Block Health Officer.`)}
                      style={{ height: '28px', fontSize: '11px', padding: '0 8px', background: 'var(--grad-orange)' }}
                    >
                      File Auto-Indent
                    </button>
                  )}
                </div>
              )}

              {/* AI Stockout Prediction Box */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ 
                  fontSize: '12.5px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  background: '#f8fafc',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  marginBottom: '8px'
                }}>
                  <span>
                    AI Stockout Forecast:{' '}
                    {item.current_stock === 0 ? (
                      <strong style={{ color: 'var(--accent-red)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={12} />
                        STOCKOUT NOW
                      </strong>
                    ) : item.days_until_stockout <= 3.0 ? (
                      <strong style={{ color: 'var(--accent-red)' }}>
                        {item.days_until_stockout} Days (Critical)
                      </strong>
                    ) : item.days_until_stockout <= 7.0 ? (
                      <strong style={{ color: 'var(--accent-orange)' }}>
                        {item.days_until_stockout} Days (Warning)
                      </strong>
                    ) : (
                      <strong style={{ color: 'var(--accent-green)' }}>
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
    </>
  );

  if (isEmbedded) {
    return (
      <div className="glass-panel" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '22px', color: 'var(--text-heading)', margin: 0, fontFamily: 'var(--font-mono)' }}>
              {clinic.name}
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{clinic.type} Local Supply Console</span>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={loadClinicDetails}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '34px' }}
          >
            <RefreshCw size={14} />
            Sync Stock
          </button>
        </div>
        {renderContent()}
      </div>
    );
  }

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
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
