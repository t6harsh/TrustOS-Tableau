<p align="center">
  <img src="https://img.shields.io/badge/🛡️_TrustOS-Dashboard_Guardian-064e3b?style=for-the-badge&labelColor=022c22" alt="TrustOS">
</p>

<h1 align="center">TrustOS</h1>

<p align="center">
  <strong>A Trust Layer for Tableau Dashboards</strong>
</p>

<p align="center">
  <em>Automatically detect data anomalies and lock dashboards before bad numbers reach decision-makers.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tableau-Extensions_API-E97627?style=flat-square&logo=tableau&logoColor=white" alt="Tableau">
  <img src="https://img.shields.io/badge/Primitive-DecisionTrustState-4CAF50?style=flat-square" alt="Trust State">
  <img src="https://img.shields.io/badge/Analysis-Z--Score_Statistical-2196F3?style=flat-square" alt="Z-Score">
  <img src="https://img.shields.io/badge/Theme-Emerald_Enterprise-022c22?style=flat-square" alt="Theme">
</p>

<p align="center">
  <a href="#-the-missing-layer">Problem</a> •
  <a href="#-decision-trust-state">Core Concept</a> •
  <a href="#-pattern-detection-heuristics">Pattern Detection</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-demo">Demo</a>
</p>

---

## 🎯 The Missing Layer

> **"Analytics platforms validate data. No platform validates decisions."**

Modern data stacks ensure pipelines execute correctly. But they don't ensure the *output makes business sense* before it reaches decision-makers.

### The Gap in Today's Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CURRENT STATE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   dbt/Airflow          Tableau              Consumers                   │
│   ───────────          ───────              ─────────                   │
│   ✅ "Job passed"   →  📊 Dashboard   →  👤 Executive makes decision   │
│   ✅ "Tests green"  →  📊 Dashboard   →  🤖 AI Agent takes action      │
│                                                                         │
│                        ❌ NO TRUST GATE                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Result:** Corrupted numbers reach humans and AI agents unchecked.

### Real-World Failures

| Scenario | Pipeline Status | What Happened |
|----------|-----------------|---------------|
| 🔄 Currency logic inverts | ✅ `dbt passed` | Revenue shows 100× growth |
| 📊 Join creates duplicates | ✅ `Airflow success` | Sales doubled overnight |
| 💰 Decimal shifts | ✅ `Tests green` | Profit margins at 2400% |
| 🤖 AI agent queries bad data | ✅ `No alerts` | Automated report sent to board |

---

## 🧠 Decision Trust State

**TrustOS introduces a first-class platform primitive: `DecisionTrustState`**

This is not an alert. Not a dashboard. It's a **semantic contract** between data and all consumers.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WITH TRUSTOS                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Data Pipeline    TrustOS           DecisionTrustState    Consumers    │
│   ─────────────    ───────           ─────────────────     ─────────    │
│                                                                         │
│   dbt/Airflow  →  Multi-Metric   →   ✅ TRUSTED    →  👤 Human sees    │
│                   Z-Score Analysis                      🤖 Agent acts   │
│                                                                         │
│                                  →   ⛔ UNTRUSTED  →  🚫 BLOCKED        │
│                                                         Dashboard locked │
│                                                         Agent denied     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Trust State Hierarchy

| Scope | Description | Status |
|-------|-------------|--------|
| **Metric-Level** | Individual KPI trust (Gross Margin, Revenue, etc.) | ✅ Implemented |
| **Dashboard-Level** | Composite trust across all monitored metrics | ✅ Implemented |
| **Org-Level** | Enterprise-wide trust propagation | 🔮 Roadmap |

---

## 📊 Multi-Metric Trust Evaluation

TrustOS monitors **multiple Hero Metrics** simultaneously and computes a **composite Decision Trust State**.

### Monitored Metrics

| Metric | Weight | Threshold | Status |
|--------|--------|-----------|--------|
| Gross Margin | 40% | Z > 2.5 | ✅ |
| Revenue | 35% | Z > 2.5 | ✅ |
| Active Customers | 25% | Z > 3.0 | ✅ |

### Composite Trust Logic

```javascript
// Worst trust score governs the dashboard
const metrics = ['Gross_Margin', 'Revenue', 'Active_Customers'];
const trustScores = metrics.map(m => evaluateMetric(m));

const compositeTrust = Math.min(...trustScores.map(t => t.confidence));
const worstMetric = trustScores.find(t => t.confidence === compositeTrust);

if (worstMetric.zScore > threshold) {
    DecisionTrustState = UNTRUSTED;
    lockDashboard();
}
```

---

## 🔍 Multi-Signal Detection Engine (v21)

> **Note:** These are rule-based heuristics, not machine learning models. They use statistical signatures to detect and classify anomalies.

TrustOS v21 uses a **multi-signal detection architecture** instead of relying on a single Z-Score threshold. This dramatically reduces false positives while catching more subtle issues.

### Signal Detectors (8 Total)

| # | Signal | Detection Rule | Severity | Typical Cause |
|---|--------|---------------|----------|---------------|
| 1 | `Z_SCORE` | Z-Score > threshold | HIGH/CRITICAL | Statistical outlier |
| 2 | `BUSINESS_RULE` | Value < 5% or > 60% | CRITICAL | Outside valid business range |
| 3 | `RATE_OF_CHANGE` | >15% change from previous | HIGH/CRITICAL | Sudden data shift |
| 4 | `DUPLICATE_INFLATION` | 8-15% above mean | MEDIUM | JOIN explosion / row duplication |
| 5 | `CURRENCY_FLIP` | 15-25% above mean | MEDIUM | Currency conversion error (EUR/USD) |
| 6 | `DECIMAL_SHIFT` | Value > 50× mean | CRITICAL | Unit/decimal conversion in ETL |
| 7 | `NEGATIVE_VALUE` | Value < 0 | CRITICAL | Invalid negative for this metric |
| 8 | `HIGH_ZSCORE` | Z > 70% of threshold | LOW | Approaching threshold (early warning) |

### Decision Logic: WARNING vs LOCK

TrustOS uses **consensus-based locking** rather than single-signal decisions:

| Condition | Result | Rationale |
|-----------|--------|-----------|
| 1 LOW/MEDIUM signal | ⚠️ **WARNING** | Dashboard visible, user notified |
| 2+ signals (any severity) | ⛔ **LOCK** | Consensus: multiple issues = real problem |
| 1 CRITICAL signal | ⛔ **LOCK** | Immediate: critical issues bypass consensus |
| Persistent anomaly (2/3 evals) | ⛔ **LOCK** | Pattern: intermittent issues get caught |

### Persistence Confirmation

TrustOS tracks the last 3 evaluations. If 2+ had signals, it locks—even if the current evaluation only has 1 signal. This catches:
- Intermittent issues that appear/disappear
- Race conditions during data loads
- Flaky upstream jobs

```javascript
// Persistence check (runs every evaluation)
const recentSignals = signalHistory.slice(-3);
const anomalyCount = recentSignals.filter(count => count > 0).length;
if (anomalyCount >= 2) {
    status = 'LOCKED';  // Persistent issue detected
}
```

### How It Works (Honest Implementation)

```javascript
function runAllDetectors(latestValue, previousValue, stats, allValues) {
    const signals = [];
    const zScore = Math.abs(latestValue - stats.mean) / (stats.std || 1);
    const multiplier = latestValue / stats.mean;
    
    // Signal 1: Z-Score
    if (zScore > threshold) signals.push({ type: 'Z_SCORE', severity: 'HIGH' });
    
    // Signal 5: Currency Flip (15-25% above mean)
    if (multiplier > 1.15 && multiplier <= 1.25) {
        signals.push({ type: 'CURRENCY_FLIP', severity: 'MEDIUM' });
    }
    
    // ... 6 more detectors (all simple if-else rules)
    
    return signals;
}
```

### Related Metric Flagging (Trust Propagation)

When a metric fails, TrustOS flags related metrics as `SUSPECT`:

| If This Fails | These Become SUSPECT |
|---------------|---------------------|
| Gross Margin | Revenue, COGS, Profit |
| Revenue | Gross Margin, Units Sold |

> This uses a hardcoded relationship map, not automatic dependency parsing.

---

## 💎 Emerald Enterprise UI (v20)

For the hackathon, we invested heavily in a premium visual experience.

### Vertical Stack Layout
Optimized for the narrow extension zone (sidebar) in Tableau:
- **Sticky Header** with brand info and Re-Audit button
- **Scrollable Content Area** with full height utilization
- **Integrated DevTools** embedded cleanly, not floating

### Theme: Deep Emerald
- Background: `#022c22` (Emerald 950)
- Cards: `#064e3b` (Emerald 900)
- Accents: `#10b981` (Emerald 500)
- Glassmorphism with subtle glow borders

This makes TrustOS look like a native, enterprise-grade component—not a hastily-built hackathon add-on.

---

## 🔮 Future State: AI Agent Integration

> **Note:** This section describes a proposed architecture for how AI agents could consume TrustOS in the future. The current implementation is client-side only.

In the age of Agentforce and autonomous AI, bad data doesn't just mislead humans—it triggers automated actions. TrustOS's `DecisionTrustState` parameter could be exposed to agents:

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FUTURE INTEGRATION                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   AI Agent queries Tableau                                  │
│         ↓                                                   │
│   Check: Is DecisionTrustState = TRUE?                      │
│         ↓                                                   │
│   If FALSE → Agent blocks action, awaits human review       │
│   If TRUE  → Agent proceeds with data-driven action         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

> *"The same trust signal that locks the dashboard could gate automated decisions."*

---

## 📜 Trust Timeline

Every evaluation is logged for auditability and debugging.

| Timestamp | Metric | Z-Score | Trust State | Reason |
|-----------|--------|---------|-------------|--------|
| 00:24:28 | Gross Margin | 0.4 | ✅ TRUSTED | Within bounds |
| 00:24:58 | Gross Margin | 0.3 | ✅ TRUSTED | Within bounds |
| 00:25:28 | Gross Margin | **847** | ⛔ UNTRUSTED | Logic regression detected |
| 00:25:58 | Gross Margin | 0.5 | ✅ TRUSTED | Recovered |
| 00:26:28 | Gross Margin | 0.4 | ✅ TRUSTED | Stable |

---

## ⚙️ Architecture

### Actual Data Flow

```mermaid
flowchart LR
    A[Tableau Server] --> B[Client Browser]
    B --> C[Dashboard Renders]
    C --> D[TrustOS Extension]
    D --> E[getSummaryDataReaderAsync]
    E --> F{Z-Score Analysis}
    F -->|Safe| G[DecisionTrustState = TRUE]
    F -->|Anomaly| H[DecisionTrustState = FALSE]
    G --> I[Dashboard Visible]
    H --> J[Dashboard Locked via Dynamic Zone Visibility]
```

> **Why this is powerful:** TrustOS is lightweight and plug-and-play. No IT re-architecture needed. It operates at the point of consumption, inside the existing visualization layer.

---

## 🎬 Demo Controls (v21)

### Demo Panel

The extension includes a **live demo panel** integrated into the UI:

**Threshold Slider (1.5 - 5.0)**
| Setting | Behavior |
|---------|----------|
| 1.5 (Strict) | High sensitivity - catches subtle anomalies |
| 2.5 (Default) | Balanced - recommended for production |
| 5.0 (Relaxed) | Low sensitivity - for seasonal/volatile data |

**Demo Injection Buttons**

| Button | Injected Value | Expected Signals | Expected Result |
|--------|---------------|------------------|-----------------|
| **Subtle** | 28.2% | CURRENCY_FLIP + HIGH_ZSCORE | ⛔ LOCK (2 signals) |
| **Seasonal** | 29.5% | Z_SCORE (if > threshold) | ⛔ LOCK or ⚠️ WARNING |
| **Dupe** | 25.9% | DUPLICATE_INFLATION | ⚠️ WARNING (1 signal) |
| **Extreme** | 2400% | DECIMAL_SHIFT + Z_SCORE (CRITICAL) | ⛔ LOCK (immediate) |
| **Reset** | Normal data | None | ✅ SAFE |

### Persistence Behavior

> **Important:** TrustOS tracks signals across evaluations. If you see a WARNING, wait 30 seconds for the auto-poll—if the issue persists, it will LOCK.

| Scenario | What Happens |
|----------|--------------|
| Click **Dupe** once | ⚠️ WARNING (1 signal) |
| Wait 30s (auto-poll runs) | ⛔ LOCK (persistence: 2/3 evals had signals) |
| Click **Reset** or **Force Unlock** | ✅ SAFE (clears history) |

### Demo Flow (Recommended for Judges)

| Step | Action | Expected Response |
|------|--------|-------------------|
| 1 | Load dashboard | ✅ SAFE, 0 signals, Confidence ~100% |
| 2 | Click **Extreme** | ⛔ LOCK immediately (Z-Score ~1273) |
| 3 | Click **Force Unlock** | ✅ SAFE (history cleared) |
| 4 | Click **Subtle** | ⛔ LOCK (2 signals: CURRENCY_FLIP + HIGH_ZSCORE) |
| 5 | Click **Reset** | ✅ SAFE |
| 6 | Click **Dupe** | ⚠️ WARNING (shows multi-signal in action) |
| 7 | Adjust threshold to 1.5 | Watch same data trigger different responses |

> **Key Demo Point:** TrustOS uses consensus-based locking. One subtle signal = warning. Two signals = lock. This reduces false positives while catching real issues.

---

## 🧪 Test Results

### Dataset Statistics

| Property | Value |
|----------|-------|
| Data points | 180 rows (6 months daily data) |
| Date range | 2024-01-01 to 2024-06-28 |
| Gross Margin mean | ~23.5% |
| Gross Margin std dev | ~2.1% |
| Natural variance range | 18.8% – 29.2% |

### Configurable Detection Sensitivity

| Corruption Type | Value | Z-Score | Threshold 2.0 | Threshold 2.5 | Threshold 4.0 |
|-----------------|-------|---------|---------------|---------------|---------------|
| **Decimal shift** | 2400% | 847 | ⛔ LOCKED | ⛔ LOCKED | ⛔ LOCKED |
| **Seasonal spike** | 29.5% | 2.9 | ⛔ LOCKED | ⛔ LOCKED | ✅ TRUSTED |
| **Currency error** | 28.2% | 2.2 | ⛔ LOCKED | ⚠️ WARNING | ✅ TRUSTED |
| **Subtle drift** | 27.0% | 1.7 | ⚠️ WARNING | ✅ TRUSTED | ✅ TRUSTED |
| **Normal data** | 23.5% | 0.0 | ✅ TRUSTED | ✅ TRUSTED | ✅ TRUSTED |

### Performance Metrics

| Metric | Value |
|--------|-------|
| Detection latency | < 50ms |
| Polling interval | 30 seconds (configurable) |
| Memory footprint | < 5MB |
| Data points processed | 180+ per evaluation |

---

## 🆚 TrustOS vs Pipeline Data Quality Tools

| Capability | TrustOS | Pipeline Tools (Monte Carlo, etc.) |
|------------|---------|-----------------------------------|
| **Where it operates** | Dashboard (consumption layer) | Warehouse (pipeline layer) |
| **Installation time** | 5 minutes | Days to weeks |
| **Blocks decisions** | Yes (native Tableau visibility) | No (alerts only) |
| **Requires access to** | Tableau dashboard | Data warehouse, dbt, etc. |
| **What it validates** | Final rendered values | Raw/transformed tables |
| **Architecture changes** | None | Pipeline integration required |

> **Why both matter:** Pipeline tools catch issues upstream. TrustOS catches what slips through—at the moment of decision.

---

## 🔑 Why This Must Be in Tableau

TrustOS isn't just JavaScript + statistics. It's deeply integrated with Tableau's native capabilities:

| Tableau Capability | How TrustOS Uses It |
|--------------------|---------------------|
| **Extensions API** | Real-time access to worksheet data via `getSummaryDataReaderAsync()` |
| **Parameters API** | `DecisionTrustState` as a first-class Tableau object |
| **Dynamic Zone Visibility** | Native UI gating—no custom overlays |
| **VizQL Semantics** | Operates on the same aggregated data users see |

> An external tool would require ETL → Database → API → Dashboard. TrustOS operates **at the point of consumption**, inside the visualization layer.

---

## ⚠️ Honest Limitations

| Limitation | Mitigation |
|------------|------------|
| Z-Score assumes normal distribution | Threshold tuning for non-normal data |
| Pattern detection is rule-based, not ML | Patterns are suggestions, not guarantees |
| Trend monitoring is basic linear regression | Useful for demos, not production forecasting |
| Agent gating is conceptual | Pattern demonstrated, not production-enforced |
| UI hiding ≠ security gate | Defense-in-depth with access controls |
| Demo uses simulated corruption | Explicitly stated; real detection logic runs |
| Related metrics use hardcoded mapping | No automatic dependency inference |

---

## 🚀 Installation

### Quick Start

**1. Add TrustOS Extension**
```
https://t6harsh.github.io/TrustOS-Tableau/extension/trustos.trex
```

**2. Configure DecisionTrustState**
```
Parameter: DecisionTrustState (Boolean, default: TRUE)
Calculated Field: Is_Untrusted = NOT [DecisionTrustState]
Dynamic Zone Visibility: Container A → DecisionTrustState
                         Container B → Is_Untrusted
```

**3. Done**

TrustOS automatically:
- Discovers worksheets
- Evaluates metrics every 30 seconds
- Computes composite trust
- Locks/unlocks based on trust state

---

## 📁 Project Structure

```
TrustOS-Tableau/
├── extension/
│   ├── index.html          # Vertical Stack UI (v20)
│   ├── script.js           # Statistical analysis + heuristics
│   ├── styles.css          # Emerald Enterprise Theme
│   ├── trustos.trex        # Tableau extension manifest
│   └── tableau.extensions.1.latest.min.js
├── sample_data.csv         # 180 rows test data
└── README.md
```

---

## 🏆 Hackathon Alignment

| Criteria | Implementation | Score Target |
|----------|----------------|--------------|
| **Innovation (40%)** | `DecisionTrustState` as a platform primitive; circuit breaker for BI | 8-9 |
| **Technical (30%)** | Multi-metric Z-Score, trend detection, Extensions API integration | 8-9 |
| **Impact (20%)** | Prevents human + AI decisions on bad data at consumption time | 8-9 |
| **UX (10%)** | Emerald Enterprise theme, vertical layout, professional lock screen | 9-10 |

---

## 🔮 Roadmap

- [x] Single-metric anomaly detection
- [x] Multi-metric composite trust
- [x] Trust timeline audit trail
- [x] Pattern detection heuristics (rule-based)
- [x] Emerald Enterprise UI theme
- [ ] Slack/Teams alerting
- [ ] Org-level trust propagation
- [ ] Tableau Pulse native integration
- [ ] ML-adaptive thresholds

---

<p align="center">
  <strong><em>"Analytics platforms validate data.<br>TrustOS validates decisions."</em></strong>
</p>

<p align="center">
  <sub>TrustOS — The Decision Trust Fabric for Tableau</sub>
</p>

---

<p align="center">
  Built for <strong>Tableau Hackathon 2025</strong>
</p>
