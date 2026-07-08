"""
SHAP-based Model Explainability for Credit Scoring
"""
import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Optional

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

logger = logging.getLogger(__name__)


class ModelExplainer:
    """Generate SHAP explanations for model predictions"""

    def __init__(self, model, X_background: Optional[pd.DataFrame] = None):
        """
        Initialize explainer.

        Args:
            model: Fitted sklearn model (with predict_proba)
            X_background: Background data for SHAP (subset for speed)
        """
        if not SHAP_AVAILABLE:
            logger.warning("SHAP not installed - explanations unavailable")
            return

        self.model = model

        # Use random subset for speed (100 samples is typically enough)
        if X_background is not None:
            if len(X_background) > 100:
                X_bg = X_background.sample(n=100, random_state=42)
            else:
                X_bg = X_background
        else:
            X_bg = None

        try:
            self.explainer = shap.Explainer(model) if X_bg is None else \
                             shap.Explainer(model, X_bg)
            logger.info("SHAP explainer initialized")
        except Exception as e:
            logger.error(f"Failed to initialize SHAP explainer: {e}")
            self.explainer = None

    def explain_prediction(
        self,
        X: pd.DataFrame,
        instance_idx: int = 0,
        top_n: int = 5
    ) -> Dict:
        """
        Generate local explanation for single prediction.

        Args:
            X: Features (single row or multiple)
            instance_idx: Which row to explain
            top_n: Number of top factors to return

        Returns:
            Dictionary with explanation
        """
        if self.explainer is None:
            return {
                'error': 'SHAP explainer not available',
                'top_risk_factors': []
            }

        try:
            shap_values = self.explainer(X.iloc[[instance_idx]])
            shap_vals = shap_values.values[0]

            # Get feature names and SHAP values
            factors = pd.DataFrame({
                'feature': X.columns,
                'shap_value': shap_vals,
                'feature_value': X.iloc[instance_idx].values
            }).sort_values('shap_value', key=abs, ascending=False)

            # Top positive (increasing default risk)
            positive_factors = factors[factors['shap_value'] > 0].head(top_n)

            result = {
                'top_risk_factors': [
                    {
                        'feature': row['feature'],
                        'impact': float(row['shap_value']),
                        'feature_value': float(row['feature_value']),
                        'direction': 'increases_risk'
                    }
                    for _, row in positive_factors.iterrows()
                ]
            }

            return result

        except Exception as e:
            logger.error(f"Error generating explanation: {e}")
            return {
                'error': str(e),
                'top_risk_factors': []
            }

    def get_global_importance(self, X: pd.DataFrame, top_n: int = 10) -> Dict[str, float]:
        """
        Get global feature importance across dataset.

        Args:
            X: Features (sample subset recommended)
            top_n: Number of top features

        Returns:
            Dictionary of feature importance scores
        """
        if self.explainer is None:
            return {}

        try:
            # Limit to 200 samples for speed
            if len(X) > 200:
                X_sample = X.sample(n=200, random_state=42)
            else:
                X_sample = X

            shap_values = self.explainer(X_sample)
            mean_abs_shap = np.abs(shap_values.values).mean(axis=0)

            importances = dict(zip(X.columns, mean_abs_shap))
            return dict(sorted(importances.items(), key=lambda x: x[1], reverse=True)[:top_n])

        except Exception as e:
            logger.error(f"Error computing global importance: {e}")
            return {}


def explain_batch_predictions(
    model,
    X: pd.DataFrame,
    predictions: np.ndarray,
    top_n: int = 3
) -> List[Dict]:
    """
    Generate explanations for batch of predictions.

    Returns:
        List of explanation dictionaries
    """
    explainer = ModelExplainer(model, X)

    results = []
    for idx in range(len(X)):
        explanation = explainer.explain_prediction(X, instance_idx=idx, top_n=top_n)
        results.append({
            'prediction_index': idx,
            'explanation': explanation
        })

    return results
