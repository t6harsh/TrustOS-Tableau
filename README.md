# 🛡️ TrustOS for Tableau

> **The "Check Engine" Light for Your Dashboard**

TrustOS is a safety layer for Tableau that prevents executives from making decisions on broken numbers by automatically detecting data anomalies and locking dashboards.

![TrustOS](https://img.shields.io/badge/Tableau-Extensions%20API-blue)
![Data](https://img.shields.io/badge/Data-Real%20Worksheet%20Access-green)
![Stats](https://img.shields.io/badge/Analysis-Statistical%20Z--Score-orange)

---

## 🎯 The Problem

Modern data stacks (dbt/Airflow) only check if the pipeline **worked**. They don't check if the number **makes sense**.

| Scenario | What Happens | dbt/Airflow | TrustOS |
|----------|--------------|-------------|---------|
| **Currency Flip** | Exchange rate logic breaks, Revenue shows 100x growth | ✅ "Pass" | 🛑 **LOCKS** |
| **Join Explosion** | Duplicate rows, Sales doubles overnight | ✅ "Success" | 🛑 **LOCKS** |
| **Filter Drop** | Filter removed, Churn looks artificially low | ✅ No Alert | 🛑 **LOCKS** |

---

## 💡 How It Works

TrustOS monitors "Hero Metrics" - the numbers that get people fired if they're wrong.

```
1. Fetch Data    → getSummaryDataReaderAsync() gets ALL points from worksheet
2. Calculate     → Mean and Std Dev from the visible data
3. Z-Score       → Compare latest value against historical values
4. Decision      → Z-Score > 2.5? Lock the dashboard
```

### Real Statistical Analysis

The extension extracts **every data point** visible in your chart and calculates:

```javascript
// Real statistics from worksheet data
const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
const variance = values.map(v => Math.pow(v - mean, 2)).reduce((s, v) => s + v, 0) / values.length;
const std = Math.sqrt(variance);

// Z-Score of the latest value
const zScore = Math.abs(latestValue - mean) / std;
```

---

## 🔌 Technical Implementation

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Data Access** | `getSummaryDataReaderAsync()` | Fetch real worksheet data |
| **Analysis** | JavaScript Statistics | Calculate mean, std, z-score |
| **Circuit Breaker** | Parameters API | Control `TrustOS_Status` |
| **UI Lock** | Dynamic Zone Visibility | Show/hide dashboard |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Tableau Dashboard                     │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              TrustOS Extension (JS)              │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  worksheet.getSummaryDataReaderAsync()     │  │  │
│  │  │  ↓                                          │  │  │
│  │  │  Extract ALL data points (n values)        │  │  │
│  │  │  ↓                                          │  │  │
│  │  │  Calculate: mean = Σ(values)/n             │  │  │
│  │  │  Calculate: std = √(Σ(v-mean)²/n)         │  │  │
│  │  │  Calculate: zScore = |latest - mean| / std │  │  │
│  │  │  ↓                                          │  │  │
│  │  │  if (zScore > 2.5) → LOCK DASHBOARD        │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                             │
│                           ▼                             │
│                   TrustOS_Status = FALSE                │
│                           │                             │
│                           ▼                             │
│              Dynamic Zone Visibility                    │
│              → Charts HIDDEN                            │
│              → Lock Screen VISIBLE                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Serve the Extension
```bash
cd extension
python3 -m http.server 3000
```

### 2. In Tableau Cloud/Desktop
1. Create dashboard with time-series data (must include `Gross_Margin` or similar)
2. Create parameter `TrustOS_Status` (Boolean, default TRUE)
3. Create calculated field `Is_Unsafe` = `NOT [TrustOS_Status]`
4. Set up Dynamic Zone Visibility
5. Add extension from `trustos.trex`

See [TABLEAU_CLOUD_SETUP.md](TABLEAU_CLOUD_SETUP.md) for detailed steps.

---

## 📁 Project Structure

```
TrustOS-Tableau/
├── extension/
│   ├── index.html        # Extension UI
│   ├── styles.css        # Glassmorphism styling  
│   ├── script.js         # Core logic: data fetch + z-score
│   └── trustos.trex      # Tableau manifest
├── assets/
│   ├── locked_screen.png # Lock screen overlay
│   └── sample_data.csv   # Test data
└── *.md                  # Documentation
```

---

## 🎬 Demo Flow

The demo buttons don't "fake" the detection - they inject a bad data point that the real statistical analysis catches.

| Time | Action | What Happens |
|------|--------|--------------|
| 0:00 | Show dashboard | Extension fetches data, calculates z-score, shows ✓ Verified |
| 0:20 | Click "Inject Anomaly" | Adds 2400% value to real data, re-analyzes |
| 0:25 | See LOCK | Z-Score spikes, extension sets parameter FALSE, lock screen appears |
| 0:40 | Click "Remove Anomaly" | Removes injected data, re-analyzes with clean data |
| 0:45 | See VERIFIED | Z-Score normal, dashboard unlocked |

---

## 🏆 Hackathon Alignment

| Criteria | Weight | Implementation |
|----------|--------|----------------|
| **Innovation** | 40% | "Circuit Breaker" pattern for data governance |
| **Technical** | 30% | Real Extensions API + actual statistical analysis |
| **Impact** | 20% | Prevents decisions on corrupted data |
| **UX** | 10% | Dramatic lock screen, clear feedback |

---

## 📈 The Math (Real Z-Score)

Given worksheet data points: `[24, 23, 25, 24, 26, 23, 24, 25]`

```
n     = 8
mean  = (24+23+25+24+26+23+24+25) / 8 = 24.25
std   = √((Σ(value - 24.25)²) / 8) = 0.97

Latest value = 25
zScore = |25 - 24.25| / 0.97 = 0.77  → SAFE ✓

Anomaly value = 2400
zScore = |2400 - 24.25| / 0.97 = 2449  → LOCKED 🔒
```

---

*"We didn't just find a bug. We stopped a disaster. That is TrustOS."*
