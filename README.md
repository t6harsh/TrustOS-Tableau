<p align="center">
  <img src="https://img.shields.io/badge/🛡️_TrustOS-Decision_Trust_Fabric-1a1a2e?style=for-the-badge&labelColor=2D3748" alt="TrustOS">
</p>

<h1 align="center">TrustOS</h1>

<p align="center">
  <strong>The Decision Trust Fabric for Tableau</strong>
</p>

<p align="center">
  <em>A semantic trust layer that governs humans AND AI agents across your analytics platform.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tableau-Extensions_API-E97627?style=flat-square&logo=tableau&logoColor=white" alt="Tableau">
  <img src="https://img.shields.io/badge/Primitive-DecisionTrustState-4CAF50?style=flat-square" alt="Trust State">
  <img src="https://img.shields.io/badge/AI_Ready-Agent_Gating-9C27B0?style=flat-square" alt="AI Agent">
  <img src="https://img.shields.io/badge/Multi--Metric-Composite_Trust-2196F3?style=flat-square" alt="Multi-Metric">
</p>

<p align="center">
  <a href="#-the-missing-layer">Problem</a> •
  <a href="#-decision-trust-state">Core Concept</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-ai-agent-gating">AI Gating</a> •
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
    denyAgentAccess();
}
```

---

## 🤖 AI Agent Gating

**TrustOS prevents AI agents from acting on corrupted analytics.**

In the age of Agentforce and autonomous AI, bad data doesn't just mislead humans—it triggers automated actions.

### Agent Decision Endpoint

```
GET /agent/decision?dashboard=executive_dashboard

Response (TRUSTED):
{
    "trust_state": "TRUSTED",
    "confidence": 0.94,
    "allow_action": true,
    "metrics_evaluated": 3
}

Response (UNTRUSTED):
{
    "trust_state": "UNTRUSTED", 
    "confidence": 0.12,
    "allow_action": false,
    "blocked_reason": "Gross Margin Z-Score: 847 exceeds threshold",
    "recommendation": "Await data team review"
}
```

### Integration Pattern

```python
# AI Agent Integration
def execute_decision(dashboard_id, action):
    trust = trustos.get_decision_state(dashboard_id)
    
    if trust.state == "UNTRUSTED":
        return {
            "action": "BLOCKED",
            "reason": "TrustOS prevented execution on untrusted data"
        }
    
    return execute_action(action)
```

> *"TrustOS prevents AI agents from hallucinating decisions based on corrupted analytics."*

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

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TABLEAU DASHBOARD                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │   ┌─────────────────────────────────────────────────────────┐    │  │
│  │   │              TrustOS Decision Trust Fabric               │    │  │
│  │   │                                                          │    │  │
│  │   │  ┌──────────────────────────────────────────────────┐   │    │  │
│  │   │  │           Multi-Metric Evaluator                  │   │    │  │
│  │   │  │  • Gross Margin    → Z-Score: 0.4  ✅            │   │    │  │
│  │   │  │  • Revenue         → Z-Score: 0.6  ✅            │   │    │  │
│  │   │  │  • Active Users    → Z-Score: 0.3  ✅            │   │    │  │
│  │   │  └──────────────────────────────────────────────────┘   │    │  │
│  │   │                         │                                │    │  │
│  │   │                         ▼                                │    │  │
│  │   │              Composite Trust Score: 94%                  │    │  │
│  │   │                         │                                │    │  │
│  │   │                         ▼                                │    │  │
│  │   │            DecisionTrustState = TRUSTED                  │    │  │
│  │   │                         │                                │    │  │
│  │   └─────────────────────────┼────────────────────────────────┘    │  │
│  │                             │                                     │  │
│  │              ┌──────────────┴──────────────┐                     │  │
│  │              ▼                              ▼                     │  │
│  │     👤 Human Consumer              🤖 AI Agent                   │  │
│  │     Dashboard VISIBLE              Actions ALLOWED                │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```mermaid
flowchart LR
    A[VizQL Data Service] --> B[TrustOS Fabric]
    B --> C{Multi-Metric Analysis}
    C --> D[Gross Margin]
    C --> E[Revenue]
    C --> F[Active Users]
    D --> G{Composite Trust}
    E --> G
    F --> G
    G -->|TRUSTED| H[Dashboard Visible]
    G -->|TRUSTED| I[Agent Allowed]
    G -->|UNTRUSTED| J[Dashboard Locked]
    G -->|UNTRUSTED| K[Agent Denied]
```

---

## 🎬 Demo

| Time | Action | System Response |
|------|--------|-----------------|
| **0:00** | Dashboard loads | TrustOS evaluates 3 metrics across 180 data points |
| **0:05** | Trust established | `DecisionTrustState: TRUSTED`, Confidence: 96% |
| **0:20** | **Simulate Logic Regression** | Injects corrupted value into data stream |
| **0:22** | Re-evaluation triggers | Z-Score spikes to 847 |
| **0:25** | **Trust Revoked** | Dashboard locked, AI agent access denied |
| **0:40** | **Restore Clean State** | Remove corrupted data |
| **0:45** | Trust re-established | Dashboard unlocked, Confidence: 94% |

> **Note:** The simulation injects real data that the statistical engine catches—not UI theater.

---

## 📈 Impact

### Quantified Value

| Metric | Before TrustOS | With TrustOS |
|--------|----------------|--------------|
| Catastrophic KPI misreads | Undetected | **Caught at decision-time** |
| Decision risk window | Hours to days | **Seconds** |
| AI agent bad-data actions | Possible | **Gated** |
| Downstream export corruption | Uncontrolled | **Flagged before export** |

### The Core Insight

> *"TrustOS converts silent data failures into safe, visible system states."*

---

## 🔑 Why This Must Be in Tableau

TrustOS isn't just JavaScript + statistics. It's deeply integrated with Tableau's native capabilities:

| Tableau Capability | How TrustOS Uses It |
|--------------------|--------------------|
| **Extensions API** | Real-time access to worksheet data via `getSummaryDataReaderAsync()` |
| **Parameters API** | `DecisionTrustState` as a first-class Tableau object |
| **Dynamic Zone Visibility** | Native UI gating—no custom overlays |
| **VizQL Semantics** | Operates on the same aggregated data users see |

> An external tool would require ETL → Database → API → Dashboard. TrustOS operates **at the point of consumption**, inside the visualization layer.

---

## ⚠️ Honest Limitations

| Limitation | Mitigation |
|------------|------------|
| Z-Score is naive for seasonal data | Threshold tuning + future ML roadmap |
| Agent gating is conceptual | Pattern demonstrated, not production-enforced |
| UI hiding ≠ security gate | Defense-in-depth with access controls |
| Demo uses simulated corruption | Explicitly stated; real detection logic runs |

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
│   ├── index.html                          # Trust Fabric UI
│   ├── script.js                           # Multi-metric evaluator + trust timeline
│   ├── styles.css                          # Professional styling
│   ├── trustos.trex                        # Tableau manifest
│   └── tableau.extensions.1.latest.min.js  # Extensions API
└── README.md
```

---

## 🏆 Hackathon Alignment

| Criteria | Implementation | Score Target |
|----------|----------------|--------------|
| **Innovation (40%)** | First Decision Trust primitive for BI; AI agent gating | 10 |
| **Technical (30%)** | Multi-metric Z-Score, composite trust, Extensions API | 10 |
| **Impact (20%)** | Prevents human + AI decisions on bad data | 10 |
| **UX (10%)** | Trust timeline, professional lock screen | 10 |

---

## 🔮 Roadmap

- [x] Single-metric anomaly detection
- [x] Multi-metric composite trust
- [x] Trust timeline audit trail
- [x] AI agent gating concept
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
