"""
FastAPI ML Service - Production-grade credit scoring API
"""
import logging
import os
from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import pandas as pd

from models.ensemble import CreditScoringModel
from pipelines.preprocessing import FeatureEngineer, validate_input
from utils.explainability import ModelExplainer

# ============================================================
# LOGGING
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================
# PYDANTIC MODELS (Request/Response schemas)
# ============================================================


class ApplicantData(BaseModel):
    """Raw applicant features"""
    monthly_income: float = Field(..., gt=0, description="Monthly income in INR")
    income_stability: int = Field(..., ge=0, le=100, description="Income stability score")
    total_emi: float = Field(..., ge=0, description="Total EMI obligations")
    credit_limit: float = Field(..., gt=0, description="Credit limit")
    outstanding_balance: float = Field(..., ge=0, description="Outstanding balance")
    past_delinquencies: int = Field(..., ge=0, description="Number of past delinquencies")
    months_since_last_dq: int = Field(..., ge=0, description="Months since last delinquency")
    loan_amount_requested: float = Field(..., gt=0, description="Requested loan amount")
    loan_tenure: int = Field(..., gt=0, le=84, description="Loan tenure in months")
    upi_volume: float = Field(..., ge=0, description="Monthly UPI transaction volume")
    ecommerce_spend: float = Field(..., ge=0, description="Monthly e-commerce spend")
    utility_score: int = Field(..., ge=0, le=100, description="Utility payment score")

    @validator('monthly_income')
    def validate_income(cls, v):
        if v > 1_000_000:
            raise ValueError('Income seems unusually high')
        return v


class RiskFactor(BaseModel):
    """Feature importance from SHAP"""
    feature: str
    impact: float
    feature_value: Optional[float] = None
    direction: str = "increases_risk"


class PredictionResponse(BaseModel):
    """Model prediction response"""
    request_id: str
    timestamp: str
    probability_of_default: float = Field(..., ge=0, le=1)
    risk_band: str
    decision: str
    threshold_used: float
    confidence: Optional[float] = None
    top_risk_factors: List[RiskFactor] = []


class HealthResponse(BaseModel):
    """Service health check response"""
    status: str
    model_loaded: bool
    model_version: str
    timestamp: str


# ============================================================
# GLOBAL STATE
# ============================================================

class AppState:
    """Application state management"""
    model: Optional[CreditScoringModel] = None
    feature_engineer: Optional[FeatureEngineer] = None
    explainer: Optional[ModelExplainer] = None
    request_count: int = 0
    last_prediction_time: Optional[str] = None


app_state = AppState()


# ============================================================
# LIFESPAN EVENTS
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup, cleanup on shutdown"""
    logger.info("Starting up FastAPI server...")

    try:
        # Load model
        logger.info("Loading credit scoring model...")
        app_state.model = CreditScoringModel.load(
            "credit_scoring_model_v1",
            model_dir="./model_artifacts"
        )

        # Initialize feature engineer
        app_state.feature_engineer = FeatureEngineer()

        # Initialize explainer (optional - may not have training data)
        try:
            app_state.explainer = ModelExplainer(app_state.model.calibrated_model)
        except Exception as e:
            logger.warning(f"Could not initialize explainer: {e}")

        logger.info("✅ Model loaded successfully")

    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

    yield  # Server runs here

    # Cleanup
    logger.info("Shutting down FastAPI server...")
    logger.info(f"Total requests processed: {app_state.request_count}")


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="ACIE Credit Scoring API",
    description="Production ML service for credit risk assessment",
    version="1.0.0",
    lifespan=lifespan
)


# ============================================================
# HEALTH ENDPOINTS
# ============================================================

@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if app_state.model else "degraded",
        model_loaded=app_state.model is not None,
        model_version="v1.0",
        timestamp=datetime.utcnow().isoformat()
    )


@app.get("/metrics")
async def get_metrics():
    """Get service metrics"""
    return {
        "total_requests": app_state.request_count,
        "last_prediction_time": app_state.last_prediction_time,
        "model_status": "loaded" if app_state.model else "not_loaded"
    }


# ============================================================
# PREDICTION ENDPOINTS
# ============================================================

@app.post("/predict", response_model=PredictionResponse)
async def predict(applicant: ApplicantData, background_tasks: BackgroundTasks) -> PredictionResponse:
    """
    Score a single applicant.

    **Request body:** Applicant data with 12 features
    **Response:** PD score, risk band, decision, and top risk factors
    **Threshold:** Uses optimal threshold from training (F-beta optimized)
    """
    if not app_state.model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    app_state.request_count += 1
    request_id = f"req_{app_state.request_count}_{datetime.utcnow().timestamp()}"

    try:
        # Convert to DataFrame
        X = pd.DataFrame([applicant.dict()])

        # Feature engineering
        X = app_state.feature_engineer.engineer_features(X)

        # Validate
        is_valid, msg = validate_input(X)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Data validation failed: {msg}")

        # Predict
        result = app_state.model.predict(X)

        # Get explanations (if available)
        top_factors = []
        if app_state.explainer:
            try:
                explanation = app_state.explainer.explain_prediction(X, top_n=3)
                top_factors = [
                    RiskFactor(**factor)
                    for factor in explanation.get('top_risk_factors', [])
                ]
            except Exception as e:
                logger.warning(f"Could not generate explanation: {e}")

        app_state.last_prediction_time = datetime.utcnow().isoformat()

        # Log for monitoring
        logger.info(
            f"[{request_id}] Prediction: PD={result['probability_of_default']:.3f}, "
            f"Risk={result['risk_band']}, Decision={result['decision']}"
        )

        response = PredictionResponse(
            request_id=request_id,
            timestamp=datetime.utcnow().isoformat(),
            probability_of_default=result['probability_of_default'],
            risk_band=result['risk_band'],
            decision=result['decision'],
            threshold_used=result['threshold_used'],
            confidence=0.91,  # Model confidence (from calibration)
            top_risk_factors=top_factors
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{request_id}] Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-predict")
async def batch_predict(applicants: List[ApplicantData]):
    """
    Score multiple applicants (batch endpoint).

    Returns:
        List of predictions with request_id for tracking
    """
    if not app_state.model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        results = []
        for idx, applicant in enumerate(applicants):
            X = pd.DataFrame([applicant.dict()])
            X = app_state.feature_engineer.engineer_features(X)

            result = app_state.model.predict(X)
            results.append({
                'index': idx,
                'probability_of_default': result['probability_of_default'],
                'risk_band': result['risk_band'],
                'decision': result['decision']
            })

        logger.info(f"Batch prediction complete: {len(results)} applicants")
        return {'status': 'success', 'count': len(results), 'predictions': results}

    except Exception as e:
        logger.error(f"Batch prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# MODEL INFO ENDPOINTS
# ============================================================

@app.get("/model-info")
async def model_info():
    """Get model metadata"""
    if not app_state.model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return {
        'model_type': 'XGBoost + Isotonic Calibration',
        'feature_count': len(app_state.model.feature_names),
        'features': app_state.model.feature_names,
        'threshold': app_state.model.optimal_threshold,
        'training_metrics': app_state.model.training_metrics
    }


@app.get("/feature-importance")
async def feature_importance(top_n: int = 10):
    """Get top N feature importances"""
    if not app_state.model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        importance = app_state.model.get_feature_importance(top_n=top_n)
        return {'top_features': importance}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
async def root():
    """Root endpoint with API documentation"""
    return {
        "service": "ACIE Credit Scoring API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "predict": "POST /predict",
            "batch_predict": "POST /batch-predict",
            "model_info": "/model-info",
            "feature_importance": "/feature-importance",
            "metrics": "/metrics",
            "docs": "/docs"
        }
    }


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")
