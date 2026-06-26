import React, { useState } from 'react';
import PriorityBadge from './PriorityBadge';
import { ShieldCheck, Truck, Clock, Navigation } from 'lucide-react';
import { api } from '../api/client';

export default function ActionCard({ recommendation, onApprove }) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await api.createManifest({
        source_clinic_id: recommendation.source_clinic_id,
        dest_clinic_id: recommendation.dest_clinic_id,
        medicine_id: recommendation.medicine_id,
        quantity: recommendation.quantity,
        estimated_travel_time_mins: recommendation.estimated_travel_time_mins,
        distance_km: recommendation.distance_km
      });
      // Call success callback
      onApprove();
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="action-card">
      <div className="action-card-header">
        <PriorityBadge level={recommendation.medicine_priority} />
        {recommendation.waste_saved_rs > 0 && (
          <span className="saving-tag">
            <ShieldCheck size={14} />
            Saves Rs. {recommendation.waste_saved_rs}
          </span>
        )}
      </div>

      <div className="action-details">
        <strong>{recommendation.quantity} units</strong> of {recommendation.medicine_name} 
        <br />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {recommendation.source_clinic_name}
        </span>
        <span className="action-arrow">&rarr;</span>
        <span style={{ fontSize: '13px', color: 'var(--text-bright)' }}>
          {recommendation.dest_clinic_name}
        </span>
      </div>

      <div className="action-meta">
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Navigation size={12} />
          {recommendation.distance_km} km
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} />
          {recommendation.estimated_travel_time_mins} mins
        </span>
        {recommendation.surplus_days_to_expiry <= 10 && (
          <span style={{ color: '#f87171', fontWeight: '500' }}>
            Expiring in {recommendation.surplus_days_to_expiry}d
          </span>
        )}
      </div>

      <div className="action-btns">
        <button 
          className="btn btn-primary"
          onClick={handleApprove}
          disabled={loading}
        >
          <Truck size={14} />
          {loading ? 'Dispatching...' : 'Approve Route'}
        </button>
      </div>
    </div>
  );
}
