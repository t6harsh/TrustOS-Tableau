# 🛡️ TrustOS for Tableau — Judge-Optimized Demo Script

> **Target Duration:** 3–4 minutes  
> **Primary Goal:** Convince judges that TrustOS *enforces* decision trust **inside Tableau**, not just detects anomalies.

---

## Scene 1 — The Real Problem (0:00–0:30)

**On screen:** A clean executive Tableau dashboard (Revenue, Gross Margin, Trend)

**Narration (say this calmly, not dramatic):**

> “Every data team has experienced this.  
> A dashboard loads perfectly. No errors. No warnings.
>
> But the number is wrong.
>
> A join changes. A currency flag flips. A filter disappears.  
> dbt passes. Airflow succeeds. Tableau renders flawlessly.
>
> And yet — an executive just made a decision on broken data.
>
> This is a *silent failure*. And this is where TrustOS comes in.”

---

## Scene 2 — What TrustOS Is (0:30–1:00)

**On screen:** TrustOS extension panel showing **green VERIFIED state**

**Narration:**

> “This is TrustOS — a decision trust layer that lives *inside* Tableau.
>
> TrustOS does not monitor every metric.  
> It protects **Hero Metrics** — the KPIs executives act on immediately.
>
> In this dashboard, we’re protecting one Hero Metric:  
> **Global Gross Margin**.
>
> Right now, TrustOS has verified it’s healthy — around 22.5%, well within historical bounds.”

**Action:** Hover over confidence, baseline window, Z-score

---

## Scene 3 — How It Works (1:00–1:45)

**On screen:** Dashboard + TrustOS evaluation details

**Narration:**

> “Here’s the key technical detail.
>
> TrustOS evaluates the *exact number Tableau is about to display* — not raw warehouse data.
>
> It uses Tableau’s VizQL Data Service, so filters, joins, and calculations are already applied.
>
> That value is compared against historical baselines using simple, explainable statistics — rolling averages and Z-scores.
>
> No black-box AI. No hallucinations. Just fast, deterministic checks.
>
> The result is written into a Tableau parameter called **[TrustOS_Status]**.”

---

## Scene 4 — The Key Innovation: Fail Closed (1:45–2:05)

**On screen:** Highlight calculated field / Dynamic Zone Visibility rule

**Narration:**

> “This is the critical innovation.
>
> [TrustOS_Status] is referenced directly *inside Tableau* — in calculated fields and Dynamic Zone Visibility.
>
> That means TrustOS doesn’t just warn you.
>
> When trust is broken, the dashboard **fails closed**.
>
> Tableau itself refuses to render the visualization.”

---

## Scene 5 — Simulated Production Failure (2:05–2:40)

**On screen:** TrustOS still green

**Narration:**

> “Now let’s simulate a real production failure — a broken currency conversion.
>
> This is a controlled simulation for demo clarity, but the detection logic is real.”

**Action:** Click **Inject Anomaly** / toggle corrupted value

**Narration:**

> “The pipeline still succeeds.  
> But Tableau now believes Gross Margin is **2,400%**.”

---

## Scene 6 — Enforcement in Action (2:40–3:10)

**On screen:**
- Dashboard disappears
- Red **SAFETY MODE** panel
- TrustOS turns UNTRUSTED

**Narration:**

> “TrustOS immediately revokes trust.
>
> The dashboard is **locked**.
>
> Not hidden. Not warned. Locked.
>
> Because [TrustOS_Status] is now FALSE, Tableau itself prevents the visualization from rendering.
>
> No executive can act on this data.”

---

## Scene 7 — Why This Matters (3:10–3:35)

**On screen:** Safety mode stays visible

**Narration:**

> “In a normal dashboard, this would look like an incredible profit spike.
>
> With TrustOS, we didn’t just detect a bug.
>
> **We prevented a decision from being made on corrupted data.**
>
> dbt still passes. Airflow still succeeds.
>
> TrustOS asks the only question that matters:
>
> *Does this number make sense?*”

---

## Scene 8 — Recovery & Trust Restoration (3:35–3:55)

**Action:** Reset anomaly

**On screen:** Dashboard returns, TrustOS VERIFIED

**Narration:**

> “Once the issue is fixed, TrustOS automatically re-evaluates the metric.
>
> Trust is restored.
>
> The dashboard unlocks.
>
> Decisions can resume safely.”

---

## Scene 9 — Closing (3:55–4:15)

**On screen:** TrustOS logo / project name

**Narration (slow, confident):**

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

## 🧠 Judge Sound-Bites (Memorize)

- “TrustOS validates **decision semantics**, not pipelines.”
- “Alerts fail open. TrustOS fails closed.”
- “Tableau enforces the lock — TrustOS supplies the verdict.”
- “If you can’t trust your data, you can’t trust your decisions.”



---

# 🎯 Grand Prize vs Honorable Mention — Judge Tuning

## If You Are Targeting **Honorable Mention**

**Judge expectation:** Solid Tableau usage + clever idea

Emphasize:
- Multi-metric trust logic
- Clean Tableau Extensions API usage
- Visual lock / unlock behavior

Language to lean on:
- “Practical safeguard”
- “Lightweight governance”
- “Immediately usable by analytics teams”

You can move a bit faster through:
- VizQL explanation
- Parameter mechanics

This already qualifies for Honorable Mention.

---

## If You Are Targeting **Grand Prize** (This Is the Important One)

**Judge expectation:** Platform-level thinking + future of Tableau

You must emphasize **three things repeatedly**:

1. **New Primitive, Not a Feature**
   - Say this explicitly:
     > “TrustOS introduces a *new primitive* for analytics platforms — Decision Trust.”

2. **Why Only Tableau Can Do This**
   - Slow down in Scene 3 and Scene 4
   - Make judges feel this could not exist outside Tableau’s semantic layer

3. **AI-First Framing**
   - Insert this line (verbatim works):
     > “As AI agents begin acting directly on dashboards, analytics platforms must fail closed — not just warn.”

If judges believe:
> “This should be a built-in Tableau capability someday”

You are in **Grand Prize territory**.

---

# 🎙️ Teleprompter-Friendly Demo Script (Final)

> **Tone:** Calm, confident, explanatory — not salesy

---

**[0:00–0:20]**

“Every data team has experienced this.
A dashboard loads perfectly.
No errors. No warnings.

But the number is wrong.”

---

**[0:20–0:45]**

“Pipelines pass.
Airflow succeeds.
Tableau renders flawlessly.

And yet — an executive just made a decision on broken data.

This silent failure is what destroys trust in analytics.”

---

**[0:45–1:10]**

“This is TrustOS.

TrustOS is a decision trust layer that lives *inside* Tableau.

It does not monitor every metric.
It protects the **Hero Metrics** that executives act on immediately.”

---

**[1:10–1:40]**

“When this dashboard loads, TrustOS evaluates the *exact number Tableau is about to show*.

Not raw warehouse data.
Not logs.

The VizQL-aggregated value — with filters and calculations applied.”

---

**[1:40–2:00]**

“That value is compared against historical baselines using simple, explainable statistics.

The result is written into a Tableau parameter called **TrustOS Status**.”

---

**[2:00–2:20]**

“This is the key innovation.

TrustOS does not alert.

When trust is broken, the dashboard **fails closed**.”

---

**[2:20–2:45]**

“I’m now simulating a real production failure — a broken currency conversion.

This simulation is controlled for demo clarity.
The detection logic is real.”

---

**[2:45–3:05]**

“Trust is revoked.

Because TrustOS Status is now false, Tableau itself prevents the visualization from rendering.

No decision can be made on this data.”

---

**[3:05–3:30]**

“This matters even more as AI agents begin acting directly on dashboards.

Bad data doesn’t just mislead humans.
It triggers automated actions.”

---

**[3:30–3:55]**

“Once the issue is fixed, TrustOS re-evaluates the metric.

Trust is restored.
The dashboard unlocks.”

---

**[3:55–4:10]**

“TrustOS introduces a new primitive for analytics platforms.

Decision Trust.

TrustOS for Tableau.

Thank you.”

---

# ✅ Devpost / Judge Heuristic Cross-Check

## Innovation (40%) — PASS
- New primitive framing ✅
- Tableau-native semantics ✅
- AI-forward narrative ✅

## Technical Execution (30%) — STRONG
- Extensions API in real use ✅
- Parameters + Dynamic Zone Visibility ✅
- Honest limitation disclosure ✅

⚠️ Optional boost: mention *second heuristic planned*

## Impact (20%) — STRONG
- Real-world failure scenarios ✅
- Decision-time enforcement ✅
- AI agent relevance ✅

## UX & Presentation (10%) — EXCELLENT
- Clear cause → effect demo ✅
- No cluttered UI ✅
- Judges can follow in under 60 seconds ✅

---

## 🧠 Final Judge Impression You’re Aiming For

> “This feels like something Tableau should eventually ship natively.”

If you land *that* thought — you’ve optimized for the **Grand Prize**.