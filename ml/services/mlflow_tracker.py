"""
MLflow Integration - Model Versioning, Tracking, and Registry
"""
import logging
import os
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    import mlflow
    from mlflow.models import ModelSignature
    from mlflow.types.schema import Schema, ColSpec
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False
    logger.warning("MLflow not installed. pip install mlflow")


class MLflowTracker:
    """Track model training and versioning with MLflow"""

    def __init__(self, tracking_uri: str = "http://localhost:5000", experiment_name: str = "credit_scoring"):
        """
        Initialize MLflow tracker

        Args:
            tracking_uri: MLflow server URI
            experiment_name: Name of experiment
        """
        if not MLFLOW_AVAILABLE:
            logger.warning("MLflow not available")
            return

        try:
            mlflow.set_tracking_uri(tracking_uri)
            mlflow.set_experiment(experiment_name)
            self.experiment_name = experiment_name
            logger.info(f"✅ MLflow initialized: {tracking_uri}")
        except Exception as e:
            logger.error(f"MLflow initialization failed: {e}")

    def is_available(self) -> bool:
        """Check if MLflow is available"""
        return MLFLOW_AVAILABLE

    def log_training_run(
        self,
        model,
        training_metrics: Dict[str, Any],
        evaluation_metrics: Dict[str, Any],
        params: Dict[str, Any],
        features: list,
        model_name: str = "credit_scoring_model"
    ) -> Optional[str]:
        """
        Log complete training run to MLflow

        Args:
            model: Trained model
            training_metrics: Training metrics dict
            evaluation_metrics: Evaluation metrics dict
            params: Model hyperparameters
            features: Feature names
            model_name: Model name for registry

        Returns:
            Run ID or None
        """
        if not self.is_available():
            return None

        try:
            with mlflow.start_run(run_name=f"{model_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}") as run:
                # Log parameters
                for key, value in params.items():
                    if isinstance(value, (int, float, str, bool)):
                        mlflow.log_param(key, value)

                # Log training metrics
                mlflow.log_metrics({f"train_{k}": v for k, v in training_metrics.items()})

                # Log evaluation metrics
                mlflow.log_metrics({f"test_{k}": v for k, v in evaluation_metrics.items()})

                # Log feature names as artifacts
                mlflow.log_dict({"features": features}, "features.json")

                # Log model info
                mlflow.log_dict({
                    "timestamp": datetime.utcnow().isoformat(),
                    "model_type": str(type(model)),
                    "framework": "sklearn"
                }, "model_info.json")

                run_id = run.info.run_id
                logger.info(f"✅ MLflow run logged: {run_id}")
                return run_id

        except Exception as e:
            logger.error(f"MLflow logging failed: {e}")
            return None

    def register_model(
        self,
        model_uri: str,
        model_name: str,
        version_description: str = ""
    ) -> Optional[str]:
        """
        Register model in MLflow Model Registry

        Args:
            model_uri: Model artifact URI
            model_name: Model name in registry
            version_description: Version description

        Returns:
            Version or None
        """
        if not self.is_available():
            return None

        try:
            result = mlflow.register_model(model_uri, model_name)
            logger.info(f"✅ Model registered: {model_name} v{result.version}")
            return result.version

        except Exception as e:
            logger.error(f"Model registration failed: {e}")
            return None

    def transition_stage(
        self,
        model_name: str,
        version: int,
        stage: str = "Production"
    ) -> bool:
        """
        Transition model to different stage

        Args:
            model_name: Model name
            version: Model version
            stage: Target stage (Staging, Production, Archived)

        Returns:
            True if successful
        """
        if not self.is_available():
            return False

        try:
            client = mlflow.tracking.MlflowClient()
            client.transition_model_version_stage(
                name=model_name,
                version=version,
                stage=stage
            )
            logger.info(f"✅ Model transitioned to {stage}: {model_name} v{version}")
            return True

        except Exception as e:
            logger.error(f"Stage transition failed: {e}")
            return False

    def log_metrics_continuous(
        self,
        metrics: Dict[str, float],
        step: int
    ):
        """
        Log metrics continuously (e.g., during batch processing)

        Args:
            metrics: Dictionary of metric names to values
            step: Step number
        """
        if not self.is_available():
            return

        try:
            mlflow.log_metrics(metrics, step=step)
        except Exception as e:
            logger.error(f"Metrics logging failed: {e}")

    def log_predictions(
        self,
        predictions: list,
        run_id: Optional[str] = None
    ) -> bool:
        """
        Log batch predictions for analysis

        Args:
            predictions: List of prediction dictionaries
            run_id: MLflow run ID (current if None)

        Returns:
            True if successful
        """
        if not self.is_available():
            return False

        try:
            # Save as artifact
            import json
            timestamp = datetime.utcnow().isoformat()
            artifact_name = f"predictions_{timestamp}.json"

            with open(artifact_name, 'w') as f:
                json.dump(predictions, f, indent=2)

            mlflow.log_artifact(artifact_name)
            os.remove(artifact_name)

            logger.info(f"✅ Predictions logged: {len(predictions)} records")
            return True

        except Exception as e:
            logger.error(f"Prediction logging failed: {e}")
            return False

    def get_model_uri(
        self,
        model_name: str,
        stage: str = "Production"
    ) -> Optional[str]:
        """
        Get production model URI

        Args:
            model_name: Model name
            stage: Stage (Production, Staging, etc.)

        Returns:
            Model URI or None
        """
        if not self.is_available():
            return None

        try:
            client = mlflow.tracking.MlflowClient()
            models = client.get_latest_versions(model_name, stages=[stage])
            if models:
                return models[0].source
            return None
        except Exception as e:
            logger.error(f"Failed to get model URI: {e}")
            return None


# Global instance
_mlflow_tracker: Optional[MLflowTracker] = None


def get_mlflow_tracker(tracking_uri: str = "http://localhost:5000") -> MLflowTracker:
    """Get or create MLflow tracker instance"""
    global _mlflow_tracker
    if _mlflow_tracker is None:
        _mlflow_tracker = MLflowTracker(tracking_uri)
    return _mlflow_tracker


# ============================================================
# MLflow Dashboard Setup
# ============================================================

def setup_mlflow_server(host: str = "0.0.0.0", port: int = 5000, backend_store: str = "./mlruns"):
    """
    Setup MLflow tracking server

    Run in separate terminal:
    mlflow server --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./artifacts
    """
    logger.info(f"MLflow tracking UI: http://{host}:{port}")
    logger.info("Ensure MLflow server is running:")
    logger.info("  mlflow server --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./artifacts")
