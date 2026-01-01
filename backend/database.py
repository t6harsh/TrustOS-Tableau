"""
TrustOS Database Layer
SQLite storage for historical baselines and audit logs
"""
import sqlite3
from datetime import datetime, timedelta
import random
from pathlib import Path

DB_PATH = Path(__file__).parent / "trustos.db"


def get_connection():
    """Get database connection"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize database with tables and seed data"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create tables
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS hero_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            field_name TEXT NOT NULL,
            min_expected REAL NOT NULL,
            max_expected REAL NOT NULL,
            z_score_threshold REAL DEFAULT 3.0,
            is_active INTEGER DEFAULT 1
        );
        
        CREATE TABLE IF NOT EXISTS metric_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_id INTEGER NOT NULL,
            value REAL NOT NULL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (metric_id) REFERENCES hero_metrics(id)
        );
        
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_name TEXT NOT NULL,
            current_value REAL NOT NULL,
            baseline_mean REAL,
            baseline_std REAL,
            z_score REAL,
            status TEXT NOT NULL,
            message TEXT,
            checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS system_state (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    """)
    
    # Check if we need to seed data
    cursor.execute("SELECT COUNT(*) FROM hero_metrics")
    if cursor.fetchone()[0] == 0:
        seed_data(cursor)
    
    conn.commit()
    conn.close()


def seed_data(cursor):
    """Seed database with demo data"""
    
    # Insert Hero Metric: Gross Margin
    cursor.execute("""
        INSERT INTO hero_metrics (name, field_name, min_expected, max_expected, z_score_threshold)
        VALUES (?, ?, ?, ?, ?)
    """, ("Global Gross Margin", "gross_margin_pct", 15.0, 35.0, 2.5))
    
    metric_id = cursor.lastrowid
    
    # Generate 30 days of historical data (20-28% range, normal distribution around 24%)
    base_date = datetime.now() - timedelta(days=30)
    for i in range(30):
        # Normal distribution: mean=24, std=2
        value = random.gauss(24.0, 2.0)
        value = max(18.0, min(30.0, value))  # Clamp to reasonable range
        
        record_date = base_date + timedelta(days=i)
        cursor.execute("""
            INSERT INTO metric_snapshots (metric_id, value, recorded_at)
            VALUES (?, ?, ?)
        """, (metric_id, round(value, 2), record_date.isoformat()))
    
    # Initialize system state (normal mode)
    cursor.execute("""
        INSERT OR REPLACE INTO system_state (key, value) VALUES ('anomaly_mode', 'false')
    """)
    cursor.execute("""
        INSERT OR REPLACE INTO system_state (key, value) VALUES ('simulated_value', '24.5')
    """)


def get_hero_metrics():
    """Get all active hero metrics"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM hero_metrics WHERE is_active = 1")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_metric_history(metric_id: int, days: int = 30):
    """Get historical values for a metric"""
    conn = get_connection()
    cursor = conn.cursor()
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    cursor.execute("""
        SELECT value, recorded_at FROM metric_snapshots 
        WHERE metric_id = ? AND recorded_at >= ?
        ORDER BY recorded_at ASC
    """, (metric_id, cutoff))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def add_audit_log(metric_name: str, current_value: float, baseline_mean: float,
                  baseline_std: float, z_score: float, status: str, message: str):
    """Log a validation check"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO audit_logs (metric_name, current_value, baseline_mean, baseline_std, z_score, status, message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (metric_name, current_value, baseline_mean, baseline_std, z_score, status, message))
    conn.commit()
    conn.close()


def get_system_state(key: str) -> str:
    """Get system state value"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM system_state WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row['value'] if row else None


def set_system_state(key: str, value: str):
    """Set system state value"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO system_state (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()


def reset_database():
    """Reset database (for demo purposes)"""
    if DB_PATH.exists():
        DB_PATH.unlink()
    init_database()


# Initialize on import
init_database()
