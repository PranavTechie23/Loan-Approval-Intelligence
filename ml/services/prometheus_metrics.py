"""
Prometheus Metrics - ML Service Observability
"""
import logging
import time
from typing import Optional, Callable
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.warning("prometheus-client not installed. pip install prometheus-client")


class PrometheusMetrics:
    """Prometheus metrics for ML service monitoring"""

    def __init__(self, registry: Optional[CollectorRegistry] = None):
        """Initialize Prometheus metrics"""
        if not PROMETHEUS_AVAILABLE:
            logger.warning("Prometheus not available")
            return

        self.registry = registry or CollectorRegistry()

        # ============================================================
        # Business Metrics
        # ============================================================

        # Predictions
        self.predictions_total = Counter(
            'ml_predictions_total',
            'Total number of predictions made',
            ['result', 'risk_band'],
            registry=self.registry
        )

        self.predictions_duration = Histogram(
            'ml_prediction_duration_seconds',
            'Time taken for predictions',
            buckets=(0.01, 0.05, 0.1, 0.5, 1.0),
            registry=self.registry
        )

        # Decisions
        self.approvals_total = Counter(
            'ml_approvals_total',
            'Total approvals',
            ['risk_band'],
            registry=self.registry
        )

        self.rejections_total = Counter(
            'ml_rejections_total',
            'Total rejections',
            ['risk_band'],
            registry=self.registry
        )

        # Risk distribution
        self.risk_band_distribution = Gauge(
            'ml_risk_band_distribution',
            'Distribution of applicants across risk bands',
            ['risk_band'],
            registry=self.registry
        )

        # ============================================================
        # System Metrics
        # ============================================================

        self.active_connections = Gauge(
            'ml_active_connections',
            'Number of active WebSocket connections',
            registry=self.registry
        )

        self.model_load_time = Gauge(
            'ml_model_load_time_seconds',
            'Time taken to load model on startup',
            registry=self.registry
        )

        # ============================================================
        # API Metrics
        # ============================================================

        self.http_requests_total = Counter(
            'ml_http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status'],
            registry=self.registry
        )

        self.http_request_duration = Histogram(
            'ml_http_request_duration_seconds',
            'HTTP request latency',
            ['method', 'endpoint'],
            buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 5.0),
            registry=self.registry
        )

        # ============================================================
        # Data Quality Metrics
        # ============================================================

        self.model_accuracy = Gauge(
            'ml_model_accuracy',
            'Current model accuracy on test set',
            registry=self.registry
        )

        self.data_drift_detected = Counter(
            'ml_data_drift_detected_total',
            'Number of times drift was detected',
            ['feature'],
            registry=self.registry
        )

        self.errors_total = Counter(
            'ml_errors_total',
            'Total errors occurred',
            ['error_type'],
            registry=self.registry
        )

        logger.info("✅ Prometheus metrics initialized")

    def is_available(self) -> bool:
        """Check if Prometheus is available"""
        return PROMETHEUS_AVAILABLE

    def get_registry(self) -> Optional[object]:
        """Get Prometheus registry"""
        return self.registry if self.is_available() else None

    # ============================================================
    # Recording Methods
    # ============================================================

    def record_prediction(
        self,
        decision: str,
        risk_band: str,
        duration: float = 0.0
    ):
        """Record a prediction"""
        if not self.is_available():
            return

        self.predictions_total.labels(result=decision, risk_band=risk_band).inc()
        if duration > 0:
            self.predictions_duration.observe(duration)

        if decision == 'APPROVE':
            self.approvals_total.labels(risk_band=risk_band).inc()
        elif decision == 'REJECT':
            self.rejections_total.labels(risk_band=risk_band).inc()

    def record_http_request(
        self,
        method: str,
        endpoint: str,
        status_code: int,
        duration: float
    ):
        """Record HTTP request"""
        if not self.is_available():
            return

        self.http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status=status_code
        ).inc()

        self.http_request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)

    def set_active_connections(self, count: int):
        """Set current active connections"""
        if not self.is_available():
            return
        self.active_connections.set(count)

    def set_model_load_time(self, duration: float):
        """Record model load time"""
        if not self.is_available():
            return
        self.model_load_time.set(duration)

    def set_model_accuracy(self, accuracy: float):
        """Update model accuracy metric"""
        if not self.is_available():
            return
        self.model_accuracy.set(accuracy)

    def record_drift_detection(self, feature_name: str):
        """Record data drift detection"""
        if not self.is_available():
            return
        self.data_drift_detected.labels(feature=feature_name).inc()

    def record_error(self, error_type: str):
        """Record an error"""
        if not self.is_available():
            return
        self.errors_total.labels(error_type=error_type).inc()

    def update_risk_distribution(self, distribution: dict):
        """Update risk band distribution"""
        if not self.is_available():
            return

        for risk_band, count in distribution.items():
            self.risk_band_distribution.labels(risk_band=risk_band).set(count)


# Global instance
_prometheus_metrics: Optional[PrometheusMetrics] = None


def get_metrics() -> PrometheusMetrics:
    """Get or create Prometheus metrics instance"""
    global _prometheus_metrics
    if _prometheus_metrics is None:
        _prometheus_metrics = PrometheusMetrics()
    return _prometheus_metrics


# ============================================================
# Middleware for FastAPI
# ============================================================

async def prometheus_middleware(request, call_next):
    """FastAPI middleware to record HTTP metrics"""
    if not PROMETHEUS_AVAILABLE:
        return await call_next(request)

    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    metrics = get_metrics()
    metrics.record_http_request(
        method=request.method,
        endpoint=request.url.path,
        status_code=response.status_code,
        duration=duration
    )

    return response


# ============================================================
# Prometheus Endpoint
# ============================================================

def add_prometheus_endpoint(app):
    """Add /metrics endpoint to FastAPI app"""
    if not PROMETHEUS_AVAILABLE:
        logger.warning("Prometheus endpoint not available")
        return app

    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    from fastapi import Response

    @app.get("/metrics", response_class=Response)
    async def metrics():
        """Prometheus metrics endpoint"""
        return Response(
            generate_latest(get_metrics().get_registry()),
            media_type=CONTENT_TYPE_LATEST
        )

    logger.info("✅ Prometheus /metrics endpoint added")
    return app
