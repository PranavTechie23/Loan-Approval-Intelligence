"""
Feature Engineering Pipeline - Consistent across training and inference
"""
import pandas as pd
import numpy as np
from typing import Tuple


class FeatureEngineer:
    """Engineered features for credit scoring model"""

    def __init__(self):
        self.feature_names = None

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply feature engineering to raw applicant data.

        Args:
            df: DataFrame with raw features

        Returns:
            DataFrame with engineered features
        """
        df = df.copy()

        # Ensure no division by zero
        df['monthly_income'] = df['monthly_income'].clip(lower=1)
        df['credit_limit'] = df['credit_limit'].clip(lower=1)

        # ========== RATIO FEATURES ==========
        # Debt-to-Income: what % of income goes to EMI
        df['dti'] = df['total_emi'] / df['monthly_income']
        df['dti'] = df['dti'].clip(0, 2)  # Cap outliers

        # Credit Utilization: how much credit is used
        df['utilization'] = df['outstanding_balance'] / df['credit_limit']
        df['utilization'] = df['utilization'].clip(0, 2)

        # Loan to Annual Income: loan size relative to yearly income
        df['loan_to_income'] = df['loan_amount_requested'] / (df['monthly_income'] * 12)
        df['loan_to_income'] = df['loan_to_income'].clip(0, 5)

        # Residual Income: money left after EMI
        df['residual_income'] = df['monthly_income'] - df['total_emi']
        df['residual_income'] = df['residual_income'].clip(lower=0)

        # ========== ALTERNATIVE DATA FEATURES ==========
        # UPI to Income: cash flow regularity proxy
        df['upi_to_income'] = df['upi_volume'] / df['monthly_income']
        df['upi_to_income'] = df['upi_to_income'].clip(0, 3)

        # Credit Score from Utility Payment
        df['utility_normalized'] = df['utility_score'] / 100.0

        # Ecommerce Spend Indicator
        df['ecommerce_to_income'] = df['ecommerce_spend'] / df['monthly_income']
        df['ecommerce_to_income'] = df['ecommerce_to_income'].clip(0, 1)

        # ========== TEMPORAL FEATURES ==========
        # Delinquency recency (more recent = worse)
        df['months_since_last_dq'] = df['months_since_last_dq'].clip(lower=0)
        df['had_recent_delinquency'] = (df['months_since_last_dq'] < 12).astype(int)

        # ========== INTERACTION FEATURES ==========
        # Debt burden severity
        df['dti_x_utilization'] = df['dti'] * df['utilization']

        # Stress indicator (high DTI + low utility score)
        df['stress_indicator'] = df['dti'] * (1 - df['utility_normalized'])

        self.feature_names = df.columns.tolist()
        return df

    def get_feature_names(self) -> list:
        """Get list of feature names after engineering"""
        return self.feature_names


def validate_input(df: pd.DataFrame) -> Tuple[bool, str]:
    """
    Validate input data has required columns and valid ranges.

    Returns:
        (is_valid, error_message)
    """
    required_cols = [
        'monthly_income', 'income_stability', 'total_emi', 'credit_limit',
        'outstanding_balance', 'past_delinquencies', 'months_since_last_dq',
        'loan_amount_requested', 'loan_tenure', 'upi_volume',
        'ecommerce_spend', 'utility_score'
    ]

    missing = set(required_cols) - set(df.columns)
    if missing:
        return False, f"Missing required columns: {missing}"

    # Range checks
    if (df['monthly_income'] <= 0).any():
        return False, "monthly_income must be positive"

    if (df['utility_score'] < 0).any() or (df['utility_score'] > 100).any():
        return False, "utility_score must be between 0 and 100"

    return True, "Valid"
