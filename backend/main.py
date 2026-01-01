"""
TrustOS Backend API
FastAPI server for dashboard validation and anomaly detection
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from models import (
    ValidationResponse, DashboardStatus, ValidationStatus,
    HeroMetric, ValidationRequest
)
from database import (
    get_hero_metrics, add_audit_log, get_system_state, 
    set_system_state, reset_database, init_database
)
from anomaly_detector import detector, get_current_metric_value

# Initialize database
init_database()

app = FastAPI(
    title="TrustOS API",
    description="The 'Check Engine Light' for Your Dashboard",
    version="1.0.0"
)

# CORS - Allow Tableau Extension to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "service": "TrustOS",
        "status": "online",
        "version": "1.0.0",
        "tagline": "The 'Check Engine Light' for Your Dashboard"
    }


@app.get("/validate-dashboard", response_model=DashboardStatus)
def validate_dashboard():
    """
    Main validation endpoint - checks all Hero Metrics
    
    This is where the magic happens:
    1. Fetch all active Hero Metrics
    2. Get current values (simulated VizQL Data Service)
    3. Run Z-Score anomaly detection
    4. Return overall dashboard safety status
    """
    metrics = get_hero_metrics()
    
    if not metrics:
        return DashboardStatus(
            is_safe=True,
            status=ValidationStatus.UNKNOWN,
            message="No Hero Metrics configured",
            color="#6c757d",
            metrics_checked=0,
            anomalies_detected=0,
            confidence_score=0,
            last_audit=datetime.now().isoformat(),
            details=[]
        )
    
    results = []
    anomalies = 0
    total_confidence = 0
    
    for metric in metrics:
        # Get current value (from VizQL Data Service in production)
        current_value = get_current_metric_value(metric['name'])
        
        # Run anomaly detection
        result = detector.validate_metric(
            metric_id=metric['id'],
            metric_name=metric['name'],
            current_value=current_value,
            threshold=metric['z_score_threshold'],
            min_expected=metric['min_expected'],
            max_expected=metric['max_expected']
        )
        
        results.append(result)
        total_confidence += result.confidence
        
        if result.status == ValidationStatus.LOCKED:
            anomalies += 1
        
        # Log the check
        add_audit_log(
            metric_name=metric['name'],
            current_value=current_value,
            baseline_mean=result.baseline_mean,
            baseline_std=result.baseline_std,
            z_score=result.z_score,
            status=result.status.value,
            message=result.message
        )
    
    # Determine overall status
    avg_confidence = total_confidence / len(metrics) if metrics else 0
    
    if anomalies > 0:
        return DashboardStatus(
            is_safe=False,
            status=ValidationStatus.LOCKED,
            message=f"SAFETY MODE ACTIVE: {anomalies} critical anomaly detected",
            color="#dc3545",
            metrics_checked=len(metrics),
            anomalies_detected=anomalies,
            confidence_score=round(avg_confidence, 1),
            last_audit=datetime.now().isoformat(),
            details=results
        )
    else:
        return DashboardStatus(
            is_safe=True,
            status=ValidationStatus.SAFE,
            message="TrustOS Verified: All metrics within normal range",
            color="#28a745",
            metrics_checked=len(metrics),
            anomalies_detected=0,
            confidence_score=round(avg_confidence, 1),
            last_audit=datetime.now().isoformat(),
            details=results
        )


@app.get("/metrics")
def get_metrics():
    """Get all configured Hero Metrics"""
    return get_hero_metrics()


@app.post("/trigger-anomaly")
def trigger_anomaly(value: float = 2400.0):
    """
    DEMO ENDPOINT: Simulate a data anomaly
    
    This simulates what happens when a "currency logic failure" occurs
    and Gross Margin suddenly shows 2400% instead of 24%
    """
    set_system_state('anomaly_mode', 'true')
    set_system_state('simulated_value', str(value))
    
    return {
        "status": "Anomaly Triggered",
        "simulated_value": value,
        "message": f"Gross Margin is now simulated at {value}%. Refresh dashboard to see Safety Mode activate."
    }


@app.post("/reset-normal")
def reset_normal():
    """
    DEMO ENDPOINT: Reset to normal state
    
    Returns the dashboard to healthy state with normal values
    """
    set_system_state('anomaly_mode', 'false')
    set_system_state('simulated_value', '24.5')
    
    return {
        "status": "Reset to Normal",
        "message": "System restored to normal mode. Gross Margin will show ~24%."
    }


@app.post("/reset-database")
def reset_db():
    """
    DEMO ENDPOINT: Reset entire database
    
    Clears all data and re-seeds with fresh demo data
    """
    reset_database()
    return {"status": "Database Reset", "message": "Fresh demo data loaded"}


@app.get("/status")
def get_status():
    """Get current system state (for debugging)"""
    return {
        "anomaly_mode": get_system_state('anomaly_mode'),
        "simulated_value": get_system_state('simulated_value')
    }


if __name__ == "__main__":
    import uvicorn
    print("🛡️  TrustOS Backend Starting...")
    print("📊 The 'Check Engine Light' for Your Dashboard")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)