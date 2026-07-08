"""
Model Training Pipeline - Orchestrates data generation, training, and evaluation
"""
import pandas as pd
import numpy as np
import logging
from pathlib import Path

from models.ensemble import CreditScoringModel
from pipelines.preprocessing import FeatureEngineer, validate_input
from utils.explainability import ModelExplainer

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def generate_synthetic_data(n_samples: int = 5000) -> pd.DataFrame:
    """
    Generate synthetic credit data matching real-world distributions.
    Based on Indian retail lending market (RBI data).
    """
    np.random.seed(42)

    data = pd.DataFrame({
        # Traditional Features
        'monthly_income': np.random.normal(50000, 15000, n_samples).clip(10000, 200000),
        'income_stability': np.random.randint(50, 100, n_samples),
        'total_emi': np.random.normal(15000, 5000, n_samples).clip(1000, 60000),
        'credit_limit': np.random.normal(200000, 50000, n_samples).clip(50000, 500000),
        'outstanding_balance': np.random.normal(50000, 20000, n_samples).clip(0, 400000),
        'past_delinquencies': np.random.randint(0, 5, n_samples),
        'months_since_last_dq': np.random.randint(0, 36, n_samples),
        'loan_amount_requested': np.random.normal(100000, 40000, n_samples).clip(10000, 500000),
        'loan_tenure': np.random.randint(6, 36, n_samples),

        # Alternative Data Features
        'upi_volume': np.random.normal(30000, 15000, n_samples).clip(0, 200000),
        'ecommerce_spend': np.random.normal(8000, 3000, n_samples).clip(0, 50000),
        'utility_score': np.random.randint(60, 100, n_samples),
    })

    # Synthetic default label - rule-based (mimics real underwriting)
    data['default'] = (
        (data['total_emi'] / data['monthly_income'] > 0.5) |
        (data['past_delinquencies'] > 2) |
        (data['utility_score'] < 70)
    ).astype(int)

    logger.info(f"Generated {n_samples} synthetic samples, default rate: {data['default'].mean():.2%}")
    return data


def prepare_data(data: pd.DataFrame, test_size: float = 0.2):
    """
    Prepare data for training.

    Returns:
        X_train, X_test, y_train, y_test, feature_engineer
    """
    # Feature Engineering
    fe = FeatureEngineer()
    data = fe.engineer_features(data)

    # Validate
    is_valid, msg = validate_input(data)
    if not is_valid:
        raise ValueError(f"Data validation failed: {msg}")

    # Split (stratified)
    from sklearn.model_selection import train_test_split
    X = data.drop('default', axis=1)
    y = data['default']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        stratify=y,
        random_state=42
    )

    logger.info(f"Data split: {len(X_train)} train, {len(X_test)} test")
    logger.info(f"Train default rate: {y_train.mean():.2%}, Test default rate: {y_test.mean():.2%}")

    return X_train, X_test, y_train, y_test, fe


def train_pipeline():
    """Main training pipeline"""
    logger.info("=" * 70)
    logger.info("STARTING CREDIT SCORING MODEL TRAINING PIPELINE")
    logger.info("=" * 70)

    # 1. Generate Data
    logger.info("\n[STEP 1] Generating synthetic data...")
    data = generate_synthetic_data(n_samples=5000)

    # 2. Prepare Data
    logger.info("\n[STEP 2] Preparing data with feature engineering...")
    X_train, X_test, y_train, y_test, fe = prepare_data(data)

    # 3. Train Model
    logger.info("\n[STEP 3] Training XGBoost ensemble model...")
    model = CreditScoringModel(model_dir="./model_artifacts")
    training_metrics = model.train(X_train, y_train, use_smote=True, cv_splits=5)

    logger.info(f"Training complete!")
    logger.info(f"  CV AUC: {training_metrics['cv_auc_mean']:.4f} "
               f"(±{training_metrics['cv_auc_std']:.4f})")

    # 4. Evaluate Model
    logger.info("\n[STEP 4] Evaluating model on test set...")
    eval_metrics = model.evaluate(X_test, y_test)

    logger.info(f"Test Set Metrics:")
    logger.info(f"  AUC-ROC: {eval_metrics['auc_roc']:.4f}")
    logger.info(f"  Precision: {eval_metrics['precision']:.4f}")
    logger.info(f"  Recall: {eval_metrics['recall']:.4f}")
    logger.info(f"  F1-Score: {eval_metrics['f1_score']:.4f}")
    logger.info(f"  Optimal Threshold: {eval_metrics['optimal_threshold']:.3f}")

    # 5. Feature Importance
    logger.info("\n[STEP 5] Computing feature importances...")
    feature_imp = model.get_feature_importance(top_n=10)
    logger.info("Top 10 Features:")
    for feat, imp in feature_imp.items():
        logger.info(f"  {feat}: {imp:.4f}")

    # 6. Save Model
    logger.info("\n[STEP 6] Saving model artifacts...")
    model_path = model.save("credit_scoring_model_v1")
    logger.info(f"Model saved to: {model_path}")

    # 7. Test Loading
    logger.info("\n[STEP 7] Testing model loading...")
    loaded_model = CreditScoringModel.load("credit_scoring_model_v1")
    test_pred = loaded_model.predict(X_test.iloc[[0]])
    logger.info(f"Loaded model prediction: {test_pred}")

    logger.info("\n" + "=" * 70)
    logger.info("TRAINING PIPELINE COMPLETE ✅")
    logger.info("=" * 70)

    return model, X_train, X_test, y_train, y_test


if __name__ == "__main__":
    model, X_train, X_test, y_train, y_test = train_pipeline()
