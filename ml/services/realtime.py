"""
WebSocket Real-time Prediction Service
Handles real-time model predictions with streaming responses
"""
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import socketio

logger = logging.getLogger(__name__)

# Socket.io server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*'
)


class RealtimeManager:
    """Manages real-time connections and broadcasts"""

    def __init__(self):
        self.active_connections: Dict[str, Any] = {}
        self.prediction_count = 0
        self.connected_clients = 0

    async def connect(self, sid: str):
        """Register new WebSocket connection"""
        self.active_connections[sid] = {
            'connected_at': datetime.utcnow().isoformat(),
            'predictions': 0
        }
        self.connected_clients = len(self.active_connections)
        logger.info(f"Client {sid} connected. Total: {self.connected_clients}")

        # Broadcast connection update
        await sio.emit('clients_update', {
            'connected_clients': self.connected_clients,
            'timestamp': datetime.utcnow().isoformat()
        }, to=None)

    async def disconnect(self, sid: str):
        """Unregister WebSocket connection"""
        if sid in self.active_connections:
            del self.active_connections[sid]
        self.connected_clients = len(self.active_connections)
        logger.info(f"Client {sid} disconnected. Total: {self.connected_clients}")

        # Broadcast disconnection update
        await sio.emit('clients_update', {
            'connected_clients': self.connected_clients,
            'timestamp': datetime.utcnow().isoformat()
        }, to=None)

    async def broadcast_prediction(self, data: Dict):
        """Broadcast prediction to all connected clients"""
        self.prediction_count += 1

        # Add metadata
        data['broadcast_timestamp'] = datetime.utcnow().isoformat()
        data['total_predictions'] = self.prediction_count

        logger.info(f"Broadcasting prediction #{self.prediction_count}")

        # Emit to all connected clients
        await sio.emit('prediction:update', data, to=None)

    async def send_to_client(self, sid: str, event: str, data: Dict):
        """Send event to specific client"""
        await sio.emit(event, data, to=sid)

    async def broadcast_metric(self, metric_name: str, value: Any):
        """Broadcast real-time metric"""
        await sio.emit('metric:update', {
            'metric': metric_name,
            'value': value,
            'timestamp': datetime.utcnow().isoformat()
        }, to=None)


# Global instance
realtime_manager = RealtimeManager()


# ============================================================
# Socket.io Event Handlers
# ============================================================

@sio.event
async def connect(sid, environ):
    """Handle new WebSocket connection"""
    logger.info(f"Socket.io client {sid} connecting...")
    await realtime_manager.connect(sid)


@sio.event
async def disconnect(sid):
    """Handle WebSocket disconnection"""
    logger.info(f"Socket.io client {sid} disconnecting...")
    await realtime_manager.disconnect(sid)


@sio.event
async def predict_realtime(sid, data):
    """
    Handle real-time prediction request from client

    Emits back:
    - 'prediction:loading' immediately
    - 'prediction:complete' with results
    """
    try:
        logger.info(f"Prediction request from {sid}")

        # Signal loading
        await realtime_manager.send_to_client(
            sid, 'prediction:loading',
            {'request_id': data.get('request_id', 'unknown')}
        )

        # Simulate processing (will be replaced with actual model call)
        await asyncio.sleep(0.1)

        # Prepare response
        prediction_result = {
            'request_id': data.get('request_id'),
            'probability_of_default': 0.15,
            'risk_band': 'MODERATE_RISK',
            'decision': 'APPROVE',
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'realtime'
        }

        # Send complete prediction
        await realtime_manager.send_to_client(
            sid, 'prediction:complete',
            prediction_result
        )

        # Broadcast to all (for dashboard)
        await realtime_manager.broadcast_prediction(prediction_result)

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        await realtime_manager.send_to_client(
            sid, 'prediction:error',
            {'error': str(e)}
        )


@sio.event
async def request_metrics(sid):
    """Send current metrics to client"""
    metrics = {
        'connected_clients': realtime_manager.connected_clients,
        'total_predictions': realtime_manager.prediction_count,
        'timestamp': datetime.utcnow().isoformat()
    }
    await realtime_manager.send_to_client(sid, 'metrics:current', metrics)


@sio.event
async def subscribe_metrics(sid):
    """Subscribe client to real-time metric updates"""
    logger.info(f"Client {sid} subscribed to metrics")
    # Metrics will be broadcasted automatically
    await realtime_manager.send_to_client(
        sid, 'metrics:subscribed',
        {'status': 'subscribed'}
    )


# ============================================================
# HTTP Endpoints for Real-time Info
# ============================================================

def create_realtime_routes(app: FastAPI):
    """Add real-time endpoints to FastAPI app"""

    @app.get("/realtime/status")
    async def realtime_status():
        """Get real-time connection status"""
        return {
            'connected_clients': realtime_manager.connected_clients,
            'total_predictions': realtime_manager.prediction_count,
            'connections': realtime_manager.active_connections,
            'timestamp': datetime.utcnow().isoformat()
        }

    @app.get("/realtime/dashboard")
    async def realtime_dashboard():
        """Serve real-time dashboard HTML"""
        return HTMLResponse(get_dashboard_html())

    return app


def get_dashboard_html() -> str:
    """Get real-time dashboard HTML with Socket.io client"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>ACIE Real-Time Dashboard</title>
        <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                background: #f5f5f5;
            }
            .container {
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #007bff;
                padding-bottom: 15px;
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 30px;
            }
            .stat-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #007bff;
            }
            .stat-value {
                font-size: 32px;
                font-weight: bold;
                color: #007bff;
            }
            .stat-label {
                color: #666;
                font-size: 14px;
                margin-top: 5px;
            }
            .predictions {
                border-top: 2px solid #f5f5f5;
                padding-top: 20px;
            }
            .prediction-item {
                padding: 15px;
                margin-bottom: 10px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #28a745;
            }
            .status {
                display: inline-block;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                margin-right: 10px;
            }
            .status.connected {
                background: #d4edda;
                color: #155724;
            }
            .status.disconnected {
                background: #f8d7da;
                color: #721c24;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 ACIE Real-Time Dashboard</h1>
                <div>
                    <span class="status connected" id="connection-status">● Connected</span>
                </div>
            </div>

            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value" id="clients">0</div>
                    <div class="stat-label">Connected Clients</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="predictions">0</div>
                    <div class="stat-label">Total Predictions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="rate">0/min</div>
                    <div class="stat-label">Prediction Rate</div>
                </div>
            </div>

            <div class="predictions">
                <h2>Recent Predictions (Live)</h2>
                <div id="predictions-list"></div>
            </div>
        </div>

        <script>
            const socket = io();
            let predictionCount = 0;
            let lastMin = new Date().getMinutes();
            let minPredictions = 0;

            socket.on('connect', () => {
                document.getElementById('connection-status').innerHTML = '● Connected';
                socket.emit('subscribe_metrics');
            });

            socket.on('disconnect', () => {
                document.getElementById('connection-status').innerHTML = '● Disconnected';
                document.getElementById('connection-status').classList.remove('connected');
                document.getElementById('connection-status').classList.add('disconnected');
            });

            socket.on('clients_update', (data) => {
                document.getElementById('clients').innerText = data.connected_clients;
            });

            socket.on('prediction:update', (data) => {
                predictionCount++;
                document.getElementById('predictions').innerText = predictionCount;

                const listEl = document.getElementById('predictions-list');
                const itemEl = document.createElement('div');
                itemEl.className = 'prediction-item';
                itemEl.innerHTML = `
                    <strong>PD Score:</strong> ${(data.probability_of_default * 100).toFixed(1)}%
                    | <strong>Risk:</strong> ${data.risk_band}
                    | <strong>Decision:</strong> ${data.decision}
                    | <strong>Time:</strong> ${new Date(data.timestamp).toLocaleTimeString()}
                `;
                listEl.insertBefore(itemEl, listEl.firstChild);

                // Keep only last 10
                while (listEl.children.length > 10) {
                    listEl.removeChild(listEl.lastChild);
                }
            });

            socket.on('metrics:update', (data) => {
                if (data.metric === 'prediction_rate') {
                    document.getElementById('rate').innerText = data.value.toFixed(1) + '/min';
                }
            });
        </script>
    </body>
    </html>
    """


# ============================================================
# Integration Helper
# ============================================================

def add_realtime_support(app: FastAPI) -> FastAPI:
    """Add all real-time features to FastAPI app"""

    # Add Socket.io ASGI app
    app_with_socketio = socketio.ASGIApp(
        sio,
        app,
        socketio_path="/socket.io"
    )

    # Add HTTP endpoints
    create_realtime_routes(app)

    logger.info("Real-time support added to FastAPI")
    return app_with_socketio
