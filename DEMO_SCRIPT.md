# TrustOS Demo Video Script

> **Duration:** 3-5 minutes  
> **Goal:** Show how TrustOS prevents executives from making decisions on broken data

---

## Pre-Recording Setup

### Terminal 1: Start Backend
```bash
cd /Users/harsh/Documents/hackathon/Tableau/TrustOS-Tableau/backend
pip install -r requirements.txt
python main.py
```

### Terminal 2: Start Extension Server
```bash
cd /Users/harsh/Documents/hackathon/Tableau/TrustOS-Tableau/extension
python -m http.server 3000
```

### Browser
- Open `http://localhost:3000` (for standalone demo)
- OR load extension in Tableau Desktop

---

## Scene-by-Scene Script

### Scene 1: The Problem (0:00 - 0:30)

**On Screen:** Show a typical executive dashboard with revenue/margin metrics

**Narration:**
> "Every data team has lived this nightmare: A developer pushes a change, a logic flag flips, and suddenly your Revenue dashboard shows a 100x spike. 
>
> dbt says 'Pass.' Airflow says 'Success.' But the number is completely wrong.
>
> By the time anyone notices, the CEO has already announced a hiring spree based on fake money.
>
> This is the silent killer of trust in data. And today, we fix it."

---

### Scene 2: Introducing TrustOS (0:30 - 1:00)

**On Screen:** Show the TrustOS extension UI with green "Verified" badge

**Narration:**
> "Meet TrustOS - the 'Check Engine Light' for your dashboard.
>
> Instead of monitoring every metric in your warehouse, TrustOS focuses on what I call 'Hero Metrics' - the numbers that get people fired if they're wrong.
>
> Right now, we're monitoring Global Gross Margin. See this green badge? It means TrustOS has verified the data is within normal historical range - around 24%."

**Action:** Hover over the stats showing Z-Score, Baseline, and Confidence

---

### Scene 3: How It Works (1:00 - 1:45)

**On Screen:** Show the confidence meter and stats

**Narration:**
> "Here's the magic. TrustOS maintains a 30-day rolling baseline of your Hero Metrics. When the dashboard loads, we fetch the current value and calculate a Z-Score - a statistical measure of how unusual the number is.
>
> A Z-Score under 2? Normal variation. Over 3? Something is seriously wrong.
>
> We're not using complex AI that hallucinates. Just simple, bulletproof statistics."

---

### Scene 4: The Disaster Simulation (1:45 - 2:30)

**On Screen:** Show the TrustOS extension

**Narration:**
> "Now let's simulate what happens when a developer breaks the currency conversion logic - a real bug I've seen three times in my career."

**Action:** Click the "💥 Trigger Bug" button

**Narration:**
> "I just triggered an anomaly. The system now thinks Gross Margin is 2,400% instead of 24%."

**Action:** Wait for refresh / click Re-Audit

**On Screen:** UI turns RED, Safety Mode overlay appears

**Narration:**
> "BOOM. The dashboard is now LOCKED. The red overlay isn't just a warning - it's a circuit breaker. Nobody can make a decision on this data until the issue is resolved.
>
> Look at the numbers: Current value 2,400%. Historical max 28%. Z-Score is off the charts. Confidence is ZERO."

---

### Scene 5: The Value (2:30 - 3:00)

**On Screen:** Keep the red Safety Mode visible

**Narration:**
> "In a normal dashboard, that executive would have seen what looks like a massive profit spike and made decisions based on it.
>
> With TrustOS, we didn't just find a bug. We stopped a disaster.
>
> And notice - dbt would still say 'Pass.' Airflow would still say 'Success.' But TrustOS knows the number doesn't make sense."

---

### Scene 6: Reset & Wrap Up (3:00 - 3:30)

**Action:** Click "✅ Reset" button

**On Screen:** UI returns to green "Verified" state

**Narration:**
> "Once the bug is fixed, TrustOS automatically detects the data is back to normal and unlocks the dashboard.
>
> The green badge returns. Trust is restored."

---

### Scene 7: Future Vision (3:30 - 4:00)

**On Screen:** Show README or architecture diagram

**Narration:**
> "This is just the beginning. TrustOS can integrate with:
> - Slack and Teams for real-time alerts
> - Multiple Hero Metrics for comprehensive coverage  
> - And critically - Salesforce Agentforce, to prevent AI agents from hallucinating answers based on corrupted data.
>
> Because if you can't trust your data, you can't trust your decisions."

---

### Scene 8: Closing (4:00 - 4:15)

**On Screen:** TrustOS logo and tagline

**Narration:**
> "TrustOS for Tableau. The Check Engine Light for Your Dashboard.
>
> Thank you."

---

## Key Commands for Demo

```bash
# Trigger anomaly (from terminal or use button)
curl -X POST http://localhost:8000/trigger-anomaly

# Reset to normal
curl -X POST http://localhost:8000/reset-normal

# Check status
curl http://localhost:8000/validate-dashboard | python -m json.tool
```

---

## Recording Tips

1. **Use a clean browser window** (Incognito mode)
2. **Zoom browser to 125%** for better visibility
3. **Use a screen recording tool** with mic audio
4. **Practice the timing** - aim for 3-4 minutes total
5. **Upload to YouTube as Unlisted** for submission
