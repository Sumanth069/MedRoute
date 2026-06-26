import React from 'react';
import { Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function XAIPanel({ reasons }) {
  if (!reasons || reasons.length === 0) return null;

  return (
    <div className="ai-forecast-box">
      <div className="forecast-headline">
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} style={{ color: '#60a5fa' }} />
          Explainable AI (SHAP Explainer)
        </span>
      </div>
      <div className="xai-panel">
        {reasons.map((reason, idx) => {
          const isNegative = reason.impact === 'negative';
          return (
            <div 
              key={idx} 
              className={`xai-factor ${isNegative ? 'negative' : 'positive'}`}
            >
              <span>{reason.factor}</span>
              <span className="xai-impact" style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
                {isNegative ? (
                  <>
                    <ArrowDownRight size={12} />
                    {reason.contribution}
                  </>
                ) : (
                  <>
                    <ArrowUpRight size={12} />
                    {reason.contribution}
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
