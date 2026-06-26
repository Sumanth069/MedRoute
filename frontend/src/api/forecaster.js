/**
 * Client-Side AI Demand Forecasting Engine
 * Mimics RandomForestRegressor predictions and SHAP explainability calculations in JavaScript.
 */

export const forecaster = {
  predict(current_stock, avg_daily_consumption, days_to_expiry, season_score, visit_trend, priority_level) {
    // 1. Calculate effective daily usage based on visit trends and seasonal modifier
    const trendModifier = 1.0 + (visit_trend / 100.0);
    const seasonModifier = 1.0 + (season_score * 0.4);
    const effectiveConsumption = Math.max(0.1, avg_daily_consumption * trendModifier * seasonModifier);

    // 2. Base stockout days
    let predictedDays = current_stock / effectiveConsumption;

    // Expiry modifier: if stock is going to expire before it's consumed, it reduces safety window
    if (days_to_expiry < predictedDays) {
      predictedDays = Math.max(days_to_expiry, predictedDays * 0.85);
    }

    // Clip to maximum 60 days
    predictedDays = Math.min(60.0, Math.max(0.0, predictedDays));

    // Force 0 if stock is 0
    if (current_stock <= 0) {
      predictedDays = 0.0;
    }

    // 3. Compute Confidence Score
    // Volatility in visits reduces confidence, low stockout window increases confidence
    const volatility = Math.abs(visit_trend) / 100.0;
    let confidence = 100.0 - Math.min(40.0, volatility * 50.0);
    if (predictedDays <= 3.0) {
      confidence = Math.max(confidence, 92.0); // Critical prediction has high priority confidence
    }
    confidence = Math.round(Math.min(99.0, Math.max(65.0, confidence)));

    // 4. Calculate SHAP additive contributions (relative to a baseline of 14.5 average days)
    const baseline = 14.5;
    const shapValues = [];

    // Feature 1: Current Stock Contribution
    const stockDiff = current_stock - 50.0;
    const stockShap = stockDiff * 0.15; // Positive or negative
    shapValues.push({
      feature: 'current_stock',
      factor: stockShap < 0 
        ? `Low Current Stock (${current_stock} units)` 
        : `Healthy Current Stock (${current_stock} units)`,
      contribution: stockShap < 0 
        ? `${stockShap.toFixed(1)} days` 
        : `+${stockShap.toFixed(1)} days`,
      impact: stockShap < 0 ? 'negative' : 'positive',
      magnitude: Math.abs(stockShap)
    });

    // Feature 2: Daily Consumption Contribution
    const consDiff = avg_daily_consumption - 2.5;
    const consShap = -consDiff * 2.2; // High consumption reduces days remaining
    shapValues.push({
      feature: 'avg_daily_consumption',
      factor: consShap < 0 
        ? `High Consumption (${avg_daily_consumption.toFixed(1)} units/day)` 
        : `Low Consumption (${avg_daily_consumption.toFixed(1)} units/day)`,
      contribution: consShap < 0 
        ? `${consShap.toFixed(1)} days` 
        : `+${consShap.toFixed(1)} days`,
      impact: consShap < 0 ? 'negative' : 'positive',
      magnitude: Math.abs(consShap)
    });

    // Feature 3: Near Expiry Contribution
    if (days_to_expiry < 15 && predictedDays > days_to_expiry) {
      const expiryShap = -((15 - days_to_expiry) * 1.5);
      shapValues.push({
        feature: 'days_to_expiry',
        factor: `Near Expiry (${days_to_expiry} days remaining)`,
        contribution: `${expiryShap.toFixed(1)} days`,
        impact: 'negative',
        magnitude: Math.abs(expiryShap)
      });
    }

    // Feature 4: Seasonal Modifier Contribution
    if (season_score > 0.6) {
      const seasonShap = -(season_score * 4.8);
      shapValues.push({
        feature: 'season_score',
        factor: `High Seasonal Demand (Score: ${season_score})`,
        contribution: `${seasonShap.toFixed(1)} days`,
        impact: 'negative',
        magnitude: Math.abs(seasonShap)
      });
    }

    // Feature 5: Patient Visit Trend Contribution
    if (visit_trend > 10.0) {
      const trendShap = -(visit_trend * 0.18);
      shapValues.push({
        feature: 'visit_trend',
        factor: `Spike in Clinic Visits (+${visit_trend}%)`,
        contribution: `${trendShap.toFixed(1)} days`,
        impact: 'negative',
        magnitude: Math.abs(trendShap)
      });
    } else if (visit_trend < -5.0) {
      const trendShap = Math.abs(visit_trend) * 0.12;
      shapValues.push({
        feature: 'visit_trend',
        factor: `Drop in Clinic Visits (${visit_trend}%)`,
        contribution: `+${trendShap.toFixed(1)} days`,
        impact: 'positive',
        magnitude: Math.abs(trendShap)
      });
    }

    // Sort factors by absolute magnitude of contribution
    shapValues.sort((a, b) => b.magnitude - a.magnitude);

    return {
      days_until_stockout: parseFloat(predictedDays.toFixed(1)),
      confidence: confidence,
      xai_reasons: shapValues.slice(0, 3).map(item => ({
        factor: item.factor,
        contribution: item.contribution,
        impact: item.impact
      }))
    };
  }
};
