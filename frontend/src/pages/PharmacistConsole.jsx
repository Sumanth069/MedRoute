import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  Wifi, 
  AlertTriangle, 
  Zap, 
  CheckCircle2, 
  RefreshCw, 
  Send, 
  Archive,
  Layers,
  HelpCircle,
  FileText
} from 'lucide-react';

export default function PharmacistConsole({ clinicId }) {
  const [clinicData, setClinicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [auditingMedId, setAuditingMedId] = useState('');
  const [physicalCount, setPhysicalCount] = useState('');
  const [auditReason, setAuditReason] = useState('');
  const [typoAlert, setTypoAlert] = useState('');
  const [auditSuccess, setAuditSuccess] = useState('');
  const [requisitionMsg, setRequisitionMsg] = useState('');
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [requestingTransferId, setRequestingTransferId] = useState(null);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'audit' | 'requisitions'

  // Fetch clinic inventory and forecasts
  const fetchConsoleData = async () => {
    try {
      const data = await api.getClinicDetail(clinicId);
      setClinicData(data);
    } catch (err) {
      console.error('Error fetching pharmacist clinic detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsoleData();
  }, [clinicId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConsoleData();
    setRefreshing(false);
  };

  // Typo check for digit swapping when physical count input changes
  const checkDigitSwapping = (val) => {
    setPhysicalCount(val);
    setTypoAlert('');
    
    if (!auditingMedId || !val) return;
    
    const selectedItem = clinicData?.inventory?.find(inv => Number(inv.medicine_id) === Number(auditingMedId));
    if (!selectedItem) return;
    
    const dbStock = selectedItem.current_stock;
    const inputVal = parseInt(val);
    
    if (isNaN(inputVal) || dbStock === inputVal) return;
    
    // Check for digit-swapping (e.g. 59 and 95)
    const dbStr = String(dbStock);
    const inputStr = String(inputVal);
    
    if (dbStr.length === 2 && inputStr.length === 2) {
      const dbSwapped = dbStr[1] + dbStr[0];
      if (dbSwapped === inputStr) {
        setTypoAlert(`⚠️ Potential Typo: You typed "${inputStr}" but the system expects "${dbStr}". Did you accidentally swap the digits?`);
      }
    } else if (dbStr.length === 3 && inputStr.length === 3) {
      // Check if digits are scrambled
      const sortedDb = [...dbStr].sort().join('');
      const sortedInput = [...inputStr].sort().join('');
      if (sortedDb === sortedInput) {
        setTypoAlert(`⚠️ Potential Typo: You typed "${inputStr}" but expected "${dbStr}". Please double-check for transposed numbers.`);
      }
    }
  };

  const handleAuditSubmit = async (e) => {
    e.preventDefault();
    if (!auditingMedId || !physicalCount) return;
    
    setSubmittingAudit(true);
    setAuditSuccess('');
    try {
      await api.auditInventory(clinicId, auditingMedId, physicalCount);
      setAuditSuccess('🎉 Inventory audit logged and synced successfully!');
      setPhysicalCount('');
      setAuditReason('');
      setTypoAlert('');
      
      // Reload inventory
      await fetchConsoleData();
    } catch (err) {
      console.error('Error logging audit:', err);
    } finally {
      setSubmittingAudit(false);
    }
  };

  // Trigger auto-requisition from surplus
  const handleAutoRequisition = async (medicineId) => {
    setRequestingTransferId(medicineId);
    setRequisitionMsg('');
    try {
      const res = await api.requestAutoRequisition(clinicId, medicineId);
      setRequisitionMsg(`✅ Transfer approved! ${res.quantity} units of ${res.medicine_name} will be dispatched from ${res.source_clinic_name}.`);
      
      // Reload details
      await fetchConsoleData();
    } catch (err) {
      setRequisitionMsg(`❌ Error: ${err.message || 'No surplus clinics found.'}`);
    } finally {
      setRequestingTransferId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px' }}>
        <RefreshCw size={24} className="spin-anim" style={{ color: 'var(--accent-blue)' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading Pharmacist Console...</span>
      </div>
    );
  }

  // Split inventory into Warning (Stockout danger) and Stable items
  const warnings = clinicData?.inventory?.filter(item => item.days_until_stockout <= 10) || [];
  const normalStock = clinicData?.inventory?.filter(item => item.days_until_stockout > 10) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      
      {/* PWA offline sync indicator bar */}
      <div className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#166534', fontWeight: '600' }}>
          <Wifi size={16} style={{ color: '#16a34a' }} />
          <span>PHC TELEMETRY GATEWAY: CONNECTED</span>
        </div>
        <button 
          onClick={handleRefresh}
          className="btn btn-secondary" 
          style={{ height: '30px', padding: '0 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', background: '#ffffff', borderColor: '#d1fae5' }}
        >
          <RefreshCw size={12} className={refreshing ? 'spin-anim' : ''} />
          Sync
        </button>
      </div>

      {/* Clinic Title Banner */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Ramanagara District PHC Network
        </span>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-bright)', margin: 0 }}>
          {clinicData?.name} Pharmacist Console
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
          Manage local stock reconciliation and trigger automated transfer requests.
        </p>
      </div>

      {/* Tab select menu */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '1px' }}>
        <button 
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: '600',
            background: 'none',
            border: 'none',
            color: activeTab === 'inventory' ? 'var(--accent-blue)' : 'var(--text-muted)',
            borderBottom: activeTab === 'inventory' ? '2px solid var(--accent-blue)' : 'none',
            cursor: 'pointer'
          }}
        >
          Clinic Stock Ledger
        </button>
        
        <button 
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: '600',
            background: 'none',
            border: 'none',
            color: activeTab === 'audit' ? 'var(--accent-blue)' : 'var(--text-muted)',
            borderBottom: activeTab === 'audit' ? '2px solid var(--accent-blue)' : 'none',
            cursor: 'pointer'
          }}
        >
          Verification Audit Tool
        </button>

        <button 
          onClick={() => setActiveTab('requisitions')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: '600',
            background: 'none',
            border: 'none',
            color: activeTab === 'requisitions' ? 'var(--accent-blue)' : 'var(--text-muted)',
            borderBottom: activeTab === 'requisitions' ? '2px solid var(--accent-blue)' : 'none',
            cursor: 'pointer'
          }}
        >
          Auto-Requisition Center
        </button>
      </div>

      {/* TAB 1: INVENTORY & FORECASTS */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Stockout Warnings */}
          {warnings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <AlertTriangle size={15} />
                CRITICAL STOCKOUT HAZARDS (&lt; 10 Days Horizon)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {warnings.map((item) => (
                  <div 
                    key={item.id} 
                    className="glass-panel" 
                    style={{
                      borderLeft: '4px solid #ef4444',
                      padding: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#fffdfd'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--text-bright)', fontSize: '14px' }}>
                        {item.medicine_name} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>({item.batch_name})</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Stock: <strong>{item.current_stock}</strong> units | Consumption: {item.avg_daily_consumption}/day
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '700' }}>Runs out in</div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#b91c1c' }}>
                          {item.days_until_stockout.toFixed(1)} days
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setActiveTab('requisitions');
                        }}
                        className="btn btn-primary"
                        style={{ height: '32px', padding: '0 12px', fontSize: '11px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                      >
                        Request Transfer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Normal Inventory Ledger */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Archive size={15} style={{ color: 'var(--accent-blue)' }} />
              STABLE MEDICINE STOCK
            </h3>

            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Medicine</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Batch</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Priority</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'right' }}>Current Stock</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'right' }}>Safety Horizon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalStock.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-bright)' }}>{item.medicine_name}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.batch_name}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            background: item.priority_level >= 4 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(148, 163, 184, 0.1)',
                            color: item.priority_level >= 4 ? '#ef4444' : 'var(--text-muted)'
                          }}>
                            LVL {item.priority_level}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700' }}>{item.current_stock}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#16a34a', fontWeight: '700' }}>
                          {item.days_until_stockout > 90 ? '90+ days' : `${item.days_until_stockout.toFixed(0)} days`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: VERIFICATION AUDIT FORM */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-bright)', marginTop: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: 'var(--accent-blue)' }} />
              Periodic Physical Stock Audit
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Select a medicine category to audit local records. MedRoute uses AI verification checks to flag potential human input typos.
            </p>

            {auditSuccess && (
              <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '8px', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
                {auditSuccess}
              </div>
            )}

            <form onSubmit={handleAuditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-bright)' }}>Select Medicine Batch</label>
                <select 
                  value={auditingMedId}
                  onChange={(e) => {
                    setAuditingMedId(e.target.value);
                    setPhysicalCount('');
                    setTypoAlert('');
                    setAuditSuccess('');
                  }}
                  style={{
                    height: '42px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    padding: '0 12px',
                    fontSize: '13px',
                    background: '#ffffff'
                  }}
                  required
                >
                  <option value="">-- Choose Medicine --</option>
                  {clinicData?.inventory?.map(inv => (
                    <option key={inv.medicine_id} value={inv.medicine_id}>
                      {inv.medicine_name} ({inv.batch_name}) - Current Rec: {inv.current_stock}
                    </option>
                  ))}
                </select>
              </div>

              {auditingMedId && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-bright)' }}>
                      Actual Physical Count
                    </label>
                    <input 
                      type="number"
                      value={physicalCount}
                      onChange={(e) => checkDigitSwapping(e.target.value)}
                      placeholder="Count individual vials or pill packs"
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        padding: '0 12px',
                        fontSize: '13px'
                      }}
                      required
                    />
                  </div>

                  {/* Digit Swap / Transposition Typos Flag Alert */}
                  {typoAlert && (
                    <div style={{
                      padding: '12px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#92400e',
                      borderRadius: '8px',
                      fontSize: '12px',
                      lineHeight: '1.4',
                      fontWeight: '600'
                    }}>
                      {typoAlert}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-bright)' }}>Audit/Discrepancy Reason</label>
                    <textarea 
                      value={auditReason}
                      onChange={(e) => setAuditReason(e.target.value)}
                      placeholder="Explain discrepancies, damage, or confirm exact matching..."
                      style={{
                        minHeight: '80px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        padding: '10px 12px',
                        fontSize: '13px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingAudit}
                    style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '700' }}
                  >
                    {submittingAudit ? 'Auditing...' : 'Log Verified Stock Count'}
                  </button>
                </>
              )}
            </form>
          </div>

        </div>
      )}

      {/* TAB 3: AUTO-REQUISITION CENTER */}
      {activeTab === 'requisitions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-bright)', marginTop: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} style={{ color: 'var(--accent-blue)' }} />
              Automated Requisition & Surplus Matching
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Below is the list of stock counts projected to run out in less than 15 days. Click "Request Smart Requisition" to fetch supplies from the best surplus clinic in the district.
            </p>

            {requisitionMsg && (
              <div style={{
                padding: '12px 16px',
                background: requisitionMsg.includes('❌') ? '#fef2f2' : '#f0fdf4',
                border: requisitionMsg.includes('❌') ? '1px solid #fee2e2' : '1px solid #bbf7d0',
                color: requisitionMsg.includes('❌') ? '#991b1b' : '#166534',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '20px'
              }}>
                {requisitionMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {clinicData?.inventory?.filter(item => item.days_until_stockout <= 15).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                  🎉 All stock horizons exceed the 15-day safety line. No requisition is currently required.
                </div>
              ) : (
                clinicData?.inventory?.filter(item => item.days_until_stockout <= 15).map(item => (
                  <div 
                    key={item.id}
                    className="glass-panel"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.4)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: 'var(--text-bright)', fontSize: '14px' }}>{item.medicine_name}</strong>
                        <span style={{ fontSize: '10px', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          Horizon: {item.days_until_stockout.toFixed(1)}d
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Local Stock: {item.current_stock} | Daily Consumption: {item.avg_daily_consumption}/day
                      </div>
                    </div>

                    <button 
                      onClick={() => handleAutoRequisition(item.medicine_id)}
                      disabled={requestingTransferId !== null}
                      className="btn btn-primary"
                      style={{
                        height: '36px',
                        padding: '0 14px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: '#ffffff'
                      }}
                    >
                      <Send size={12} />
                      {requestingTransferId === item.medicine_id ? 'Requesting...' : 'Request Smart Requisition'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
