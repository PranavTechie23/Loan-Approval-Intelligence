"""
XGBoost Ensemble Model - Training, Calibration, and Persistence
"""
import numpy as np
import pandas as pd
import joblib
import logging
from typing import Dict, Tuple, Optional
from pathlib import Path

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    roc_auc_score, classification_report, confusion_matrix,
    precision_score, recall_score, f1_score, brier_score_loss,
    roc_curve, precision_recall_curve
)
from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier

logger = logging.getLogger(__name__)


class CreditScoringModel:
    """Production-grade credit scoring model with XGBoost"""

    def __init__(self, model_dir: str = "./model_artifacts"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)

        self.base_model: Optional[XGBClassifier] = None
        self.calibrated_model: Optional[CalibratedClassifierCV] = None
        self.feature_names: Optional[list] = None
        self.optimal_threshold: float = 0.5
        self.training_metrics: Dict = {}

    def train(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        hyperparams: Optional[Dict] = None,
        use_smote: bool = True,
        cv_splits: int = 5
    ) -> Dict:
        """
        Train XGBoost ensemble with SMOTE and calibration.

        Args:
            X_train: Training features
            y_train: Training target (0/1)
            hyperparams: XGBoost hyperparameters (uses defaults if None)
            use_smote: Apply SMOTE for imbalance handling
            cv_splits: Number of CV folds

        Returns:
            Dictionary with training metrics
        """
        self.feature_names = X_train.columns.tolist()

        # Default hyperparameters (from ACIE notebook optimization)
        if hyperparams is None:
            hyperparams = {
                'n_estimators': 200,
                'max_depth': 4,
                'learning_rate': 0.05,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'min_child_weight': 1,
                'gamma': 0.1,
                'reg_alpha': 0.5,
                'reg_lambda': 1.0,
                'eval_metric': 'logloss',
                'random_state': 42,
                'n_jobs': -1,
                'tree_method': 'hist'
            }

        logger.info(f"Training XGBoost with params: {hyperparams}")

        # Apply SMOTE to training data (training only - no leakage!)
        if use_smote:
            smote = SMOTE(random_state=42, k_neighbors=5)
            X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
            logger.info(
                f"SMOTE applied. Original: {len(X_train)}, "
                f"Resampled: {len(X_train_res)}, "
                f"Default rate: {y_train_res.mean():.2%}"
            )
        else:
            X_train_res, y_train_res = X_train, y_train

        # Cross-validation for robustness check
        self.base_model = XGBClassifier(**hyperparams)
        skf = StratifiedKFold(n_splits=cv_splits, shuffle=True, random_state=42)
        cv_scores = cross_val_score(
            self.base_model, X_train_res, y_train_res,
            cv=skf, scoring='roc_auc', n_jobs=-1
        )
        logger.info(
            f"Cross-validation AUC: {cv_scores.mean():.4f} "
            f"(±{cv_scores.std():.4f})"
        )

        # Train final model
        self.base_model.fit(X_train_res, y_train_res)
        logger.info("Base model training complete")

        # Calibrate probabilities (Isotonic regression)
        self.calibrated_model = CalibratedClassifierCV(
            self.base_model, method='isotonic', cv=3
        )
        self.calibrated_model.fit(X_train_res, y_train_res)
        logger.info("Probability calibration complete")

        # Store training metrics
        self.training_metrics = {
            'cv_auc_mean': float(cv_scores.mean()),
            'cv_auc_std': float(cv_scores.std()),
            'hyperparams': hyperparams,
            'n_training_samples': len(X_train),
            'n_training_samples_resampled': len(X_train_res),
            'feature_count': len(self.feature_names)
        }

        return self.training_metrics

    def evaluate(
        self,
        X_test: pd.DataFrame,
        y_test: pd.Series
    ) -> Dict:
        """
        Evaluate model on test set and optimize threshold.

        Returns:
            Dictionary with evaluation metrics
        """
        if self.calibrated_model is None:
            raise ValueError("Model not trained yet")

        # Get predicted probabilities
        probs = self.calibrated_model.predict_proba(X_test)[:, 1]

        # Precision-Recall curve for threshold optimization
        precision, recall, pr_thresholds = precision_recall_curve(y_test, probs)

        # F-2 score (recall weighted 2x more than precision)
        beta = 2
        f_beta_scores = (1 + beta**2) * (precision[:-1] * recall[:-1]) / \
                        (beta**2 * precision[:-1] + recall[:-1] + 1e-8)
        optimal_idx = np.argmax(f_beta_scores)
        self.optimal_threshold = float(pr_thresholds[optimal_idx])

        logger.info(f"Optimal threshold: {self.optimal_threshold:.3f}")

        # Evaluate at optimal threshold
        y_pred = (probs >= self.optimal_threshold).astype(int)

        metrics = {
            'auc_roc': float(roc_auc_score(y_test, probs)),
            'brier_score': float(brier_score_loss(y_test, probs)),
            'precision': float(precision_score(y_test, y_pred)),
            'recall': float(recall_score(y_test, y_pred)),
            'f1_score': float(f1_score(y_test, y_pred)),
            'optimal_threshold': self.optimal_threshold,
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
        }

        logger.info(f"Test set AUC-ROC: {metrics['auc_roc']:.4f}")
        logger.info(f"Precision: {metrics['precision']:.4f}, "
                   f"Recall: {metrics['recall']:.4f}")

        return metrics

    def predict(self, X: pd.DataFrame) -> Dict:
        """
        Make predictions with confidence.

        Args:
            X: Features (must match training features)

        Returns:
            Dictionary with prediction, PD score, risk band
        """
        if self.calibrated_model is None:
            raise ValueError("Model not trained yet")

        # Validate feature alignment
        if set(X.columns) != set(self.feature_names):
            raise ValueError(
                f"Feature mismatch. Expected: {self.feature_names}, "
                f"Got: {X.columns.tolist()}"
            )

        # Ensure correct column order
        X = X[self.feature_names]

        # Get probability
        pd_score = float(self.calibrated_model.predict_proba(X)[:, 1][0])

        # Risk band classification
        if pd_score < 0.10:
            risk_band = 'LOW_RISK'
        elif pd_score < 0.20:
            risk_band = 'MODERATE_RISK'
        elif pd_score < 0.35:
            risk_band = 'ELEVATED_RISK'
        else:
            risk_band = 'HIGH_RISK'

        decision = 'REJECT' if pd_score >= self.optimal_threshold else 'APPROVE'

        return {
            'probability_of_default': pd_score,
            'risk_band': risk_band,
            'decision': decision,
            'threshold_used': self.optimal_threshold
        }

    def get_feature_importance(self, top_n: int = 10) -> Dict[str, float]:
        """Get top N feature importances"""
        if self.base_model is None:
            raise ValueError("Model not trained yet")

        importances = dict(zip(
            self.feature_names,
            self.base_model.feature_importances_
        ))
        return dict(sorted(importances.items(), key=lambda x: x[1], reverse=True)[:top_n])

    def save(self, model_name: str = "credit_scoring_model") -> str:
        """
        Save model, features, and threshold to disk.

        Returns:
            Path where model was saved
        """
        if self.calibrated_model is None:
            raise ValueError("Model not trained yet")

        # Save calibrated model
        model_path = self.model_dir / f"{model_name}.pkl"
        joblib.dump(self.calibrated_model, model_path)

        # Save feature names
        features_path = self.model_dir / f"{model_name}_features.pkl"
        joblib.dump(self.feature_names, features_path)

        # Save threshold
        threshold_path = self.model_dir / f"{model_name}_threshold.pkl"
        joblib.dump(self.optimal_threshold, threshold_path)

        # Save metrics
        metrics_path = self.model_dir / f"{model_name}_metrics.json"
        import json
        with open(metrics_path, 'w') as f:
            json.dump(self.training_metrics, f, indent=2)

        logger.info(f"Model saved to {model_path}")
        return str(model_path)

    @classmethod
    def load(cls, model_name: str = "credit_scoring_model", model_dir: str = "./model_artifacts"):
        """
        Load model from disk.

        Returns:
            CreditScoringModel instance with loaded weights
        """
        model_dir = Path(model_dir)
        instance = cls(model_dir=model_dir)

        model_path = model_dir / f"{model_name}.pkl"
        features_path = model_dir / f"{model_name}_features.pkl"
        threshold_path = model_dir / f"{model_name}_threshold.pkl"

        instance.calibrated_model = joblib.load(model_path)
        instance.feature_names = joblib.load(features_path)
        instance.optimal_threshold = joblib.load(threshold_path)

        logger.info(f"Model loaded from {model_path}")
        return instance
