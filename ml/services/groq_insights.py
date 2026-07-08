"""
Groq API Integration - Free LLM for Auto-Generated Insights
Uses Groq's ultra-fast inference for real-time report generation
"""
import logging
import os
from typing import Optional, Dict, Any
import json

logger = logging.getLogger(__name__)

# Try to import Groq SDK
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    logger.warning("Groq SDK not installed. pip install groq")


class GroqInsightGenerator:
    """Generate insights using Groq API (free LLM)"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Groq client

        Args:
            api_key: Groq API key (defaults to GROQ_API_KEY env var)
        """
        if not GROQ_AVAILABLE:
            logger.warning("Groq not available - insights will be disabled")
            self.client = None
            return

        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            logger.warning("GROQ_API_KEY not set - insights disabled")
            self.client = None
            return

        try:
            self.client = Groq(api_key=self.api_key)
            logger.info("✅ Groq client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Groq: {e}")
            self.client = None

    def is_available(self) -> bool:
        """Check if Groq is available and configured"""
        return self.client is not None

    def generate_prediction_insight(self, prediction: Dict[str, Any]) -> Optional[str]:
        """
        Generate human-readable insight for a prediction

        Args:
            prediction: Model prediction dictionary

        Returns:
            Insight text or None if unavailable
        """
        if not self.is_available():
            return None

        try:
            prompt = f"""You are a credit risk analyst. Briefly explain this credit decision in 1-2 sentences:

Probability of Default: {prediction.get('probability_of_default', 0):.1%}
Risk Band: {prediction.get('risk_band', 'Unknown')}
Decision: {prediction.get('decision', 'Unknown')}
Top Risk Factors: {', '.join([str(f) for f in prediction.get('top_risk_factors', [])])}

Keep it professional but simple."""

            message = self.client.messages.create(
                model="mixtral-8x7b-32768",  # Free Groq model
                max_tokens=150,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            insight = message.content[0].text
            logger.info(f"Generated insight: {insight[:50]}...")
            return insight

        except Exception as e:
            logger.error(f"Groq insight generation failed: {e}")
            return None

    def generate_batch_report(self, predictions: list) -> Optional[str]:
        """
        Generate batch analysis report

        Args:
            predictions: List of predictions

        Returns:
            Report text or None if unavailable
        """
        if not self.is_available():
            return None

        try:
            # Aggregate stats
            total = len(predictions)
            approved = sum(1 for p in predictions if p.get('decision') == 'APPROVE')
            rejected = sum(1 for p in predictions if p.get('decision') == 'REJECT')
            avg_pd = sum(p.get('probability_of_default', 0) for p in predictions) / total if total > 0 else 0

            prompt = f"""As a credit risk manager, provide a 3-4 sentence executive summary:

Batch Analysis:
- Total Applicants: {total}
- Approved: {approved} ({approved/total*100:.1f}%)
- Rejected: {rejected} ({rejected/total*100:.1f}%)
- Average Default Risk: {avg_pd:.1%}

Provide actionable insights and risk assessment."""

            message = self.client.messages.create(
                model="mixtral-8x7b-32768",
                max_tokens=300,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            report = message.content[0].text
            logger.info("Generated batch report")
            return report

        except Exception as e:
            logger.error(f"Batch report generation failed: {e}")
            return None

    def explain_risk_factors(self, risk_factors: list) -> Optional[str]:
        """
        Explain top risk factors in plain English

        Args:
            risk_factors: List of risk factors from SHAP

        Returns:
            Explanation text or None
        """
        if not self.is_available():
            return None

        try:
            factors_text = "\n".join([
                f"- {factor.get('feature')}: {factor.get('impact'):.4f}"
                for factor in risk_factors[:5]
            ])

            prompt = f"""Explain these credit risk factors in simple terms (2-3 sentences):

{factors_text}

Focus on what matters for lending decisions."""

            message = self.client.messages.create(
                model="mixtral-8x7b-32768",
                max_tokens=200,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            explanation = message.content[0].text
            return explanation

        except Exception as e:
            logger.error(f"Risk factor explanation failed: {e}")
            return None

    def generate_policy_recommendation(self, prediction: Dict) -> Optional[str]:
        """
        Generate policy recommendation based on risk band

        Args:
            prediction: Model prediction

        Returns:
            Recommendation text or None
        """
        if not self.is_available():
            return None

        try:
            risk_band = prediction.get('risk_band', 'Unknown')
            pd_score = prediction.get('probability_of_default', 0)

            prompt = f"""As a lending policy advisor, recommend a lending policy decision for:

Risk Band: {risk_band}
PD Score: {pd_score:.1%}

Consider: interest rate adjustment, documentation requirements, collateral needs.
Keep to 2-3 sentences."""

            message = self.client.messages.create(
                model="mixtral-8x7b-32768",
                max_tokens=200,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            recommendation = message.content[0].text
            return recommendation

        except Exception as e:
            logger.error(f"Policy recommendation failed: {e}")
            return None


# Global instance
_groq_instance: Optional[GroqInsightGenerator] = None


def get_groq_generator() -> GroqInsightGenerator:
    """Get or create Groq generator instance"""
    global _groq_instance
    if _groq_instance is None:
        _groq_instance = GroqInsightGenerator()
    return _groq_instance


# ============================================================
# Fallback Functions (when Groq unavailable)
# ============================================================

def generate_fallback_insight(prediction: Dict) -> str:
    """Generate simple insight without Groq"""
    risk_band = prediction.get('risk_band', 'Unknown')
    decision = prediction.get('decision', 'Unknown')
    pd = prediction.get('probability_of_default', 0)

    if decision == 'APPROVE':
        return f"Applicant is in {risk_band} category with {pd:.1%} default risk. Recommendation: {decision}."
    else:
        return f"High-risk profile ({pd:.1%} default probability). Recommendation: {decision} - requires further review."


def generate_fallback_report(predictions: list) -> str:
    """Generate simple batch report without Groq"""
    total = len(predictions)
    approved = sum(1 for p in predictions if p.get('decision') == 'APPROVE')
    rejected = sum(1 for p in predictions if p.get('decision') == 'REJECT')
    avg_pd = sum(p.get('probability_of_default', 0) for p in predictions) / total if total > 0 else 0

    return f"""Batch Summary:
- Total: {total} applicants
- Approved: {approved} ({approved/total*100:.1f}%)
- Rejected: {rejected} ({rejected/total*100:.1f}%)
- Average Default Risk: {avg_pd:.1%}"""
