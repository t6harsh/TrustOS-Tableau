# 🛡️ TrustOS for Tableau — Final Demo Script (Judge-Optimized)

> **Duration:** 3–4 minutes  
> **Goal:** Prove TrustOS enforces decision trust — not just detects anomalies

---

## Scene 1: The Real Problem (0:00 – 0:30)

**On Screen:** A clean executive Tableau dashboard (Revenue, Gross Margin, Trend Chart)

**Narration:**
> “Every data team has lived this moment.  
> A dashboard loads perfectly. No errors. No warnings.  
> But the number is wrong.
>
> A developer changes a join. A currency flag flips. A filter disappears.  
> dbt says *Pass*. Airflow says *Success*. Tableau renders flawlessly.
>
> And yet — the executive just made a decision on broken data.
>
> This silent failure is what destroys trust in analytics.  
> Today, I’ll show how TrustOS stops that from happening.”

---

## Scene 2: What TrustOS Is (0:30 – 1:00)

**On Screen:** TrustOS extension showing **green “Verified” state**

**Narration:**
> “This is TrustOS — the *Check Engine Light* for decision-making dashboards.
>
> TrustOS doesn’t try to monitor every metric in your warehouse.  
> It focuses on **Hero Metrics** — the KPIs that executives act on immediately, and that cannot afford to be wrong.
>
> In this dashboard, we’re protecting one Hero Metric:  
> **Global Gross Margin**.
>
> Right now, TrustOS has verified it’s healthy — around 22.5%, well within its historical and organizational bounds.”

**Action:** Hover over Z-Score, baseline, confidence indicators

---

## Scene 3: How TrustOS Actually Works (1:00 – 1:45)

**On Screen:** Extension stats + dashboard visible

**Narration:**
> “Here’s the key idea.
>
> When this dashboard loads, TrustOS evaluates the *exact number Tableau is about to display* — not the raw database value.
>
> We use **Tableau’s VizQL Data Service**, so filters, calculations, and aggregations are already applied.
>
> That value is compared against a seasonal historical baseline using simple, explainable statistics — rolling averages and Z-Scores.
>
> No black-box AI. No hallucinations. Just fast, deterministic checks.
>
> The result is written into a Tableau parameter called **`[TrustOS_Status]`**.”

---

## Scene 4: The Critical Innovation — Fail Closed (1:45 – 2:05)

**On Screen:** Highlight dashboard + chart container

**Narration:**
> “This part is important.
>
> `[TrustOS_Status]` is referenced directly inside Tableau — in calculated fields, filters, and Dynamic Zone Visibility.
>
> That means TrustOS doesn’t just *warn* you.
>
> When trust is broken, the dashboard **fails closed**.
>
> The visualization itself refuses to render.”

---

## Scene 5: The Failure Event (2:05 – 2:40)

**On Screen:** TrustOS extension (still green)

**Narration:**
> “Now let’s simulate a real production failure — a broken currency conversion.
>
> This is a bug I’ve personally seen multiple times.”

**Action:** Click **Inject Anomaly** (or trigger via backend)

**Narration:**
> “The pipeline still succeeds.  
> But the system now believes Gross Margin is **2,400%**.”

**Action:** Dashboard refresh / automatic re-audit

---

## Scene 6: Enforcement in Action (2:40 – 3:10)

**On Screen:**  
- Chart disappears  
- Extension expands  
- **Red Safety Mode overlay**

**Narration:**
> “And this is where TrustOS intervenes.
>
> The dashboard is **locked**.
>
> Not hidden. Not warned. Locked.
>
> TrustOS detected that Gross Margin is 2,400% — far outside the organizational safe bounds of 5 to 50%.
>
> Because `[TrustOS_Status]` is now FALSE, Tableau itself prevents the visualization from rendering.
>
> No executive can make a decision on this data.”

---

## Scene 7: Why This Matters (3:10 – 3:35)

**On Screen:** Keep Safety Mode visible

**Narration:**
> “In a normal dashboard, this would look like an incredible profit spike.
>
> With TrustOS, we didn’t just detect a bug.
>
> **We stopped a business disaster.**
>
> And notice — dbt still passes. Airflow still succeeds.  
> Only TrustOS asks the question that matters:
>
> *Does this number make sense?*”

---

## Scene 8: Recovery & Trust Restoration (3:35 – 3:55)

**Action:** Click **Reset to Normal**

**On Screen:** Dashboard returns, green Verified badge

**Narration:**
> “Once the issue is fixed, TrustOS automatically re-evaluates the metric.
>
> The value returns to normal.  
> `[TrustOS_Status]` flips back to TRUE.
>
> The dashboard unlocks.
>
> Trust is restored.”

---

## Scene 9: Closing Vision (3:55 – 4:15)

**On Screen:** TrustOS logo / README

**Narration:**
> “TrustOS introduces a new primitive for analytics platforms:
>
> **Decision Trust.**
>
> Not alerts.  
> Not monitoring.  
> **Enforcement.**
>
> TrustOS for Tableau — the Check Engine Light for your dashboard.
>
> Thank you.”

---

## 🔑 Key Talking Points (Memorize These)

- “TrustOS validates **decision semantics**, not pipelines.”
- “Alerts fail open. TrustOS fails closed.”
- “Tableau enforces the lock — TrustOS supplies the verdict.”
- “If you can’t trust your data, you can’t trust your decisions.”