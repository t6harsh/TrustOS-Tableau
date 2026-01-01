"""
TrustOS Anomaly Detection Engine
Z-Score based anomaly detection with moving average baseline
"""
import numpy as np
from typing import Tuple, Optional
from datetime import datetime

from database import get_metric_history, get_hero_metrics, get_system_state
from models import ValidationStatus, ValidationResponse


class AnomalyDetector:
    """
    Core anomaly detection using Z-Score analysis
    
    The Z-Score tells us how many standard deviations a value is from the mean.
    - Z-Score < 2: Normal variation
    - Z-Score 2-3: Warning (unusual but possible)
    - Z-Score > 3: Critical anomaly (should almost never happen naturally)
    """
    
    def __init__(self, z_threshold: float = 2.5):
        self.z_threshold = z_threshold
    
    def calculate_baseline(self, values: list[float]) -> Tuple[float, float]:
        """
        Calculate mean and standard deviation from historical values
        Uses numpy for efficient computation
        """
        if not values or len(values) < 2:
            return 0.0, 1.0
        
        arr = np.array(values)
        mean = float(np.mean(arr))
        std = float(np.std(arr))
        
        # Prevent division by zero
        if std == 0:
            std = 0.01
        
        return mean, std
    
    def calculate_z_score(self, value: float, mean: float, std: float) -> float:
        """
        Calculate Z-Score: (value - mean) / std
        Tells us how many standard deviations from normal
        """
        return abs(value - mean) / std
    
    def get_confidence_score(self, z_score: float, threshold: float) -> float:
        """
        Convert Z-Score to a confidence percentage
        Higher confidence = more certain the data is valid
        """
        if z_score <= 1:
            return 100.0
        elif z_score >= threshold:
            return 0.0
        else:
            # Linear interpolation between 1 and threshold
            return max(0, 100 * (1 - (z_score - 1) / (threshold - 1)))
    
    def validate_metric(self, metric_id: int, metric_name: str, 
                        current_value: float, threshold: float = 2.5,
                        min_expected: float = 0, max_expected: float = 100) -> ValidationResponse:
        """
        Validate a metric value against historical baseline
        
        Returns:
            ValidationResponse with status, message, and diagnostic info
        """
        # Get historical data
        history = get_metric_history(metric_id, days=30)
        values = [h['value'] for h in history]
        
        # Calculate baseline
        mean, std = self.calculate_baseline(values)
        
        # Calculate Z-Score
        z_score = self.calculate_z_score(current_value, mean, std)
        
        # Calculate confidence
        confidence = self.get_confidence_score(z_score, threshold)
        
        # Determine status
        if z_score > threshold or current_value < min_expected * 0.5 or current_value > max_expected * 2:
            status = ValidationStatus.LOCKED
            color = "#dc3545"  # Red
            
            if current_value > max_expected * 2:
                message = f"CRITICAL ALERT: {metric_name} is {current_value:.1f}% (Historical Max: {max_expected:.0f}%). Dashboard Locked."
            elif current_value < min_expected * 0.5:
                message = f"CRITICAL ALERT: {metric_name} is {current_value:.1f}% (Historical Min: {min_expected:.0f}%). Dashboard Locked."
            else:
                message = f"ANOMALY DETECTED: {metric_name} Z-Score is {z_score:.2f} (Threshold: {threshold}). Dashboard Locked."
        
        elif z_score > threshold * 0.7:
            status = ValidationStatus.WARNING
            color = "#ffc107"  # Yellow
            message = f"WARNING: {metric_name} is {current_value:.1f}% (slightly unusual). Monitoring closely."
        
        else:
            status = ValidationStatus.SAFE
            color = "#28a745"  # Green
            message = f"TrustOS Verified: {metric_name} is {current_value:.1f}% - within normal range."
        
        return ValidationResponse(
            status=status,
            message=message,
            color=color,
            metric_name=metric_name,
            current_value=round(current_value, 2),
            baseline_mean=round(mean, 2),
            baseline_std=round(std, 2),
            z_score=round(z_score, 2),
            threshold=threshold,
            confidence=round(confidence, 1),
            last_checked=datetime.now().isoformat()
        )


def get_current_metric_value(metric_name: str) -> float:
    """
    Get the "current" value of a metric.
    
    In production, this would call VizQL Data Service.
    For demo, we read from system state (can be toggled for anomaly simulation).
    """
    # Check if anomaly mode is active
    anomaly_mode = get_system_state('anomaly_mode')
    
    if anomaly_mode == 'true':
        # Return the simulated anomaly value (e.g., 2400%)
        simulated = get_system_state('simulated_value')
        return float(simulated) if simulated else 2400.0
    else:
        # Return a normal value (slight random variation around 24%)
        import random
        return round(random.gauss(24.0, 1.5), 2)


# Singleton instance
detector = AnomalyDetector()
