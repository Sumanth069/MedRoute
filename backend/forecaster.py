import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import shap
import warnings

# Suppress warnings for clean stdout
warnings.filterwarnings("ignore")

class AIDemandForecaster:
    def __init__(self):
        self.model = None
        self.explainer = None
        self.feature_names = [
            "current_stock", 
            "avg_daily_consumption", 
            "days_to_expiry", 
            "season_score", 
            "visit_trend"
        ]
        self._train_model()

    def _train_model(self):
        print("Training AI Demand Forecasting Model & fitting SHAP Explainer...")
        
        # 1. Generate realistic simulated training data
        np.random.seed(42)
        n_samples = 800
        
        current_stock = np.random.uniform(5, 500, n_samples)
        avg_daily_consumption = np.random.uniform(0.5, 30.0, n_samples)
        days_to_expiry = np.random.randint(2, 365, n_samples)
        season_score = np.random.uniform(0.0, 1.0, n_samples)
        visit_trend = np.random.uniform(-20.0, 50.0, n_samples)
        
        X = pd.DataFrame({
            "current_stock": current_stock,
            "avg_daily_consumption": avg_daily_consumption,
            "days_to_expiry": days_to_expiry,
            "season_score": season_score,
            "visit_trend": visit_trend
        })
        
        # Target formula: basic days until stockout = stock / consumption,
        # with modifiers for season and visit trend.
        # If season is active (high season_score), consumption increases.
        # If visit trend is high, consumption increases.
        # If days_to_expiry is low, some stock might expire before being used, reducing effective stock.
        
        effective_consumption = avg_daily_consumption * (1.0 + (visit_trend / 100.0)) * (1.0 + (season_score * 0.4))
        # Expiry modifier: if days_to_expiry is very small, stockout happens faster because stock gets wasted
        expiry_modifier = np.where(days_to_expiry < 10, 0.7, 1.0)
        
        y = (current_stock * expiry_modifier) / np.maximum(0.1, effective_consumption)
        # Clip y to a reasonable range (0 to 60 days) to represent a near-term forecasting window
        y = np.clip(y, 0, 60)
        
        # Add some random noise
        noise = np.random.normal(0, 1.5, n_samples)
        y = np.clip(y + noise, 0, 60)
        
        # 2. Train Random Forest
        self.model = RandomForestRegressor(n_estimators=50, max_depth=6, random_state=42)
        self.model.fit(X, y)
        
        # 3. Fit SHAP Explainer
        # We use a background dataset for TreeExplainer
        self.explainer = shap.TreeExplainer(self.model, data=X.sample(100, random_state=42))
        print("AI Demand Forecasting Model trained successfully.")

    def predict(self, current_stock, avg_daily_consumption, days_to_expiry, season_score, visit_trend):
        """
        Predicts days until stockout and generates SHAP explainability.
        """
        input_data = pd.DataFrame([{
            "current_stock": float(current_stock),
            "avg_daily_consumption": float(avg_daily_consumption),
            "days_to_expiry": int(days_to_expiry),
            "season_score": float(season_score),
            "visit_trend": float(visit_trend)
        }])
        
        # 1. Predict
        predicted_days = float(self.model.predict(input_data)[0])
        
        # Heuristic override if stock is literally 0
        if current_stock <= 0:
            predicted_days = 0.0
            
        # 2. Calculate confidence based on features
        # Higher confidence if stockout is very near or stock is stable
        # Lower confidence if visit trend is highly volatile
        volatility_factor = abs(visit_trend) / 100.0
        confidence = 100.0 - min(40.0, volatility_factor * 50.0)
        if predicted_days <= 3.0:
            # High confidence when stock is critically low
            confidence = max(confidence, 90.0)
        confidence = round(confidence, 1)
        
        # 3. Calculate SHAP values
        shap_values = self.explainer.shap_values(input_data)[0]
        
        # 4. Map SHAP values to explanations
        explanations = []
        
        # Map features to natural language descriptions
        for feature, val in zip(self.feature_names, shap_values):
            val_rounded = round(val, 1)
            if feature == "current_stock":
                if val_rounded < 0:
                    explanations.append({
                        "factor": f"Low Current Stock ({int(current_stock)} units)",
                        "contribution": f"{val_rounded} days",
                        "impact": "negative"
                    })
                else:
                    explanations.append({
                        "factor": f"Healthy Current Stock ({int(current_stock)} units)",
                        "contribution": f"+{val_rounded} days",
                        "impact": "positive"
                    })
            elif feature == "avg_daily_consumption":
                if val_rounded < 0:
                    explanations.append({
                        "factor": f"High Consumption ({round(avg_daily_consumption, 1)} units/day)",
                        "contribution": f"{val_rounded} days",
                        "impact": "negative"
                    })
                else:
                    explanations.append({
                        "factor": f"Low Consumption ({round(avg_daily_consumption, 1)} units/day)",
                        "contribution": f"+{val_rounded} days",
                        "impact": "positive"
                    })
            elif feature == "days_to_expiry":
                if val_rounded < 0:
                    if days_to_expiry < 15:
                        explanations.append({
                            "factor": f"Near Expiry ({days_to_expiry} days remaining)",
                            "contribution": f"{val_rounded} days",
                            "impact": "negative"
                        })
            elif feature == "season_score":
                if val_rounded < 0 and season_score > 0.6:
                    explanations.append({
                        "factor": f"High Seasonal Demand (Score: {season_score})",
                        "contribution": f"{val_rounded} days",
                        "impact": "negative"
                    })
            elif feature == "visit_trend":
                if val_rounded < 0 and visit_trend > 10.0:
                    explanations.append({
                        "factor": f"Spike in Clinic Visits (+{round(visit_trend, 1)}%)",
                        "contribution": f"{val_rounded} days",
                        "impact": "negative"
                    })
                elif val_rounded > 0 and visit_trend < -5.0:
                    explanations.append({
                        "factor": f"Drop in Clinic Visits ({round(visit_trend, 1)}%)",
                        "contribution": f"+{val_rounded} days",
                        "impact": "positive"
                    })
        
        # Sort explanations by magnitude of impact (absolute value of contribution)
        # We need to extract the numerical value from the string or keep track of it
        def get_impact_val(x):
            try:
                # Remove "+", " days", and convert to float
                clean = x["contribution"].replace("+", "").replace(" days", "").strip()
                return abs(float(clean))
            except:
                return 0.0
                
        explanations.sort(key=get_impact_val, reverse=True)
        
        # Ensure we always return at least some explanations
        if not explanations:
            explanations.append({
                "factor": "Baseline consumption patterns",
                "contribution": "Stable",
                "impact": "neutral"
            })
            
        return {
            "days_until_stockout": max(0, round(predicted_days, 1)),
            "confidence": confidence,
            "xai_reasons": explanations[:3]  # Return top 3 explanations
        }

# Singleton instance
forecaster = AIDemandForecaster()

if __name__ == "__main__":
    # Test the forecaster
    test_res = forecaster.predict(
        current_stock=10,
        avg_daily_consumption=2.5,
        days_to_expiry=5,
        season_score=0.9,
        visit_trend=20.0
    )
    print("\n--- Test Forecast ---")
    print(f"Days until stockout: {test_res['days_until_stockout']}")
    print(f"Confidence: {test_res['confidence']}%")
    print("XAI Explanations:")
    for reason in test_res['xai_reasons']:
        print(f" - {reason['factor']}: {reason['contribution']} ({reason['impact']})")
