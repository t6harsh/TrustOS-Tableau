"""
TrustOS Data Models
Pydantic models for Hero Metrics, Snapshots, and Audit Logs
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ValidationStatus(str, Enum):
    SAFE = "SAFE"
    LOCKED = "LOCKED"
    WARNING = "WARNING"
    UNKNOWN = "UNKNOWN"


class HeroMetric(BaseModel):
    """A critical KPI that TrustOS monitors"""
    id: Optional[int] = None
    name: str  # e.g., "Global Gross Margin"
    field_name: str  # e.g., "gross_margin_pct"
    min_expected: float  # e.g., 15.0
    max_expected: float  # e.g., 35.0
    z_score_threshold: float = 3.0  # Standard deviations before alert
    is_active: bool = True


class MetricSnapshot(BaseModel):
    """Historical value for baseline calculation"""
    id: Optional[int] = None
    metric_id: int
    value: float
    recorded_at: datetime


class AuditLog(BaseModel):
    """Record of all validation checks"""
    id: Optional[int] = None
    metric_name: str
    current_value: float
    baseline_mean: float
    baseline_std: float
    z_score: float
    status: ValidationStatus
    message: str
    checked_at: datetime


class ValidationRequest(BaseModel):
    """Request to validate a specific metric value"""
    metric_name: Optional[str] = "gross_margin"
    current_value: Optional[float] = None  # If None, fetch from "live" data


class ValidationResponse(BaseModel):
    """Response from validation check"""
    status: ValidationStatus
    message: str
    color: str
    metric_name: str
    current_value: float
    baseline_mean: float
    baseline_std: float
    z_score: float
    threshold: float
    confidence: float  # 0-100 confidence score
    last_checked: str


class DashboardStatus(BaseModel):
    """Overall dashboard trust status"""
    is_safe: bool
    status: ValidationStatus
    message: str
    color: str
    metrics_checked: int
    anomalies_detected: int
    confidence_score: float
    last_audit: str
    details: List[ValidationResponse] = []
