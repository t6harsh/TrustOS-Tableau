# Tableau Cloud Setup Guide - TrustOS

> **Complete step-by-step guide to deploy TrustOS in Tableau Cloud**

---

## Prerequisites

### 1. Start the Extension Server (on your computer)

```bash
cd /Users/harsh/Documents/hackathon/Tableau/TrustOS-Tableau/extension
python3 -m http.server 3000
```

Verify: Open `http://localhost:3000` in your browser - you should see the TrustOS UI.

### 2. Tableau Cloud Access
- Log into your Tableau Cloud site (e.g., `https://prod-useast-b.online.tableau.com`)

---

## Part 1: Create Time-Series Data with Gross_Margin

The extension needs a worksheet with **multiple data points** to calculate a real Z-Score.

### Option A: Upload the Sample CSV

1. In Tableau Cloud, click **New** → **Workbook**
2. Click **Files** → **Upload from computer**
3. Select: `/Users/harsh/Documents/hackathon/Tableau/TrustOS-Tableau/assets/sample_data.csv`
4. Click **Connect**

The sample CSV contains:
```csv
Date,Region,Sales,Profit,Gross_Margin
2024-01-01,North,10000,2400,24.0
2024-01-02,South,12000,2880,24.0
...
```

### Option B: Create Data Manually

Create a new Google Sheet or Excel file with these columns:
- `Date` - Sequential dates
- `Gross_Margin` - Values between 20-28%
- At least 10 rows of data

---

## Part 2: Create the Time-Series Chart

### Step 2.1: Build the Margin Trend Chart

This chart provides the data points for Z-Score calculation.

1. In the worksheet (Sheet 1), drag **Date** to **Columns**
2. Drag **Gross_Margin** to **Rows**
3. You should see a line chart showing margin over time
4. Right-click the tab → **Rename** → `Margin Trend`

> **Important:** This chart must show multiple data points, not just an aggregate!

### Step 2.2: Verify Data Points

Click on the chart - you should see individual points for each date. If you only see one bar/point, your data is being aggregated incorrectly.

**Fix if needed:**
- Right-click on the Date pill → **Exact Date** (not Month/Year)
- Or drag **Date** to **Detail** on the Marks card

---

## Part 3: Create the TrustOS Parameter

### Step 3.1: Create Boolean Parameter

1. In the **Data** pane (left side), click the dropdown ▼
2. Select **Create Parameter...**
3. Configure:
   ```
   Name: TrustOS_Status
   Data type: Boolean
   Current value: True ✓ (checked)
   ```
4. Click **OK**

### Step 3.2: Create Inverse Calculated Field

1. Click dropdown ▼ in Data pane
2. Select **Create Calculated Field...**
3. Configure:
   ```
   Name: Is_Unsafe
   Formula: NOT [TrustOS_Status]
   ```
4. Click **OK**

---

## Part 4: Create the Dashboard

### Step 4.1: New Dashboard
1. Click **New Dashboard** icon (bottom, near sheet tabs)

### Step 4.2: Set Dashboard Size
1. In the **Dashboard** pane (left), click **Size**
2. Select **Automatic** or set fixed size (e.g., 1200 x 800)

---

## Part 5: Add Dashboard Containers

### Step 5.1: Container A (Charts)

1. From **Objects** (left panel), drag **Vertical** container onto dashboard
2. Resize to fill most of the dashboard
3. Drag your **Margin Trend** sheet into this container

### Step 5.2: Container B (Lock Screen)

1. Drag another **Vertical** container onto dashboard
2. From **Objects**, drag **Text** into this container
3. In the text editor, enter:
   ```
   ⚠️ SAFETY MODE ACTIVE
   
   DASHBOARD LOCKED
   
   TrustOS detected a critical data anomaly.
   Contact your data team before proceeding.
   ```
4. Format:
   - Font size: 32
   - Alignment: Center
   - Color: Red

**Alternative - Use Image:**
1. Instead of Text, drag **Image** into Container B
2. If images need a URL, host `locked_screen.png` somewhere accessible
3. Or use the Text method above

---

## Part 6: Configure Dynamic Zone Visibility

### Step 6.1: Container A (Show when SAFE)

1. Click anywhere inside Container A (on the chart)
2. Double-click the grey **handle** at the top until the blue border surrounds the ENTIRE container
3. Go to the **Layout** pane (top-left panel, click "Layout" tab)
4. Find **"Control visibility using value"**
5. Check the checkbox ✓
6. In the dropdown, select **TrustOS_Status**

Result: Container A visible when `TrustOS_Status = TRUE`

### Step 6.2: Container B (Show when LOCKED)

1. Click inside Container B (on the Lock Screen text/image)
2. Double-click handle until entire container is selected
3. Go to **Layout** pane
4. Check **"Control visibility using value"**
5. In the dropdown, select **Is_Unsafe**

Result: Container B visible when `TrustOS_Status = FALSE`

---

## Part 7: Make Lock Screen Float and Cover Dashboard

### Step 7.1: Float Container B

1. Select Container B (Lock Screen)
2. Click the small dropdown arrow ▼ on the container
3. Select **Floating**

### Step 7.2: Position and Resize

1. Drag Container B to top-left corner of dashboard (x: 0, y: 0)
2. Resize to cover the ENTIRE dashboard area
3. In **Layout** pane, you can set exact values:
   ```
   x: 0
   y: 0
   w: 1200 (or your dashboard width)
   h: 800 (or your dashboard height)
   ```

### Step 7.3: Set Background Color (Optional)

1. With Container B selected, go to **Layout**
2. Under **Background**, select a red color (#dc3545)
3. This ensures the entire lock screen is red

---

## Part 8: Add TrustOS Extension

### Step 8.1: Enable Extensions in Tableau Cloud

Your site admin may need to enable extensions:
1. Go to **Settings** (gear icon) → **Extensions**
2. Enable **"Let users run extensions"**
3. Add `http://localhost:3000` to allowed URLs

### Step 8.2: Add Extension to Dashboard

1. From **Objects**, drag **Extension** onto your dashboard
2. Place it in a corner (it can be small - about 250x200 pixels)
3. A dialog appears:
   - Click **Access Local Extensions**
   - Enter: `http://localhost:3000/trustos.trex`
   - Or click **My Extensions** and navigate to the `.trex` file

### Step 8.3: Confirm Extension Loads

1. You should see the TrustOS UI with green "✓ Verified" badge
2. If not loading, check:
   - Extension server running on port 3000
   - Browser console for errors (F12)

---

## Part 9: Test the Full Flow

### Step 9.1: Manual Parameter Test

1. Right-click **TrustOS_Status** in Data pane → **Show Parameter**
2. Toggle the parameter:
   - `TRUE` → Charts visible
   - `FALSE` → Lock screen visible
3. Verify both work, then hide the parameter control

### Step 9.2: Extension Test (Real Z-Score)

1. Look at the TrustOS extension panel
2. It should show:
   - **Z-Score**: A number based on your actual data
   - **Baseline**: Mean of your Gross_Margin values
   - **Confidence**: Calculated from Z-Score
3. Status should be "✓ Verified" (green)

### Step 9.3: Test Anomaly Injection

1. Click **"💉 Inject Anomaly"** button
2. The extension:
   - Adds a 2400% value to the real data
   - Recalculates Z-Score (will spike to ~2449)
   - Sets `TrustOS_Status = FALSE`
   - Lock screen should appear!
3. Check the extension shows:
   - Status: "⛔ Locked"
   - Z-Score: Very high number
   - Confidence: 0%

### Step 9.4: Test Recovery

1. Click **"🧹 Remove Anomaly"** button
2. The extension:
   - Removes the injected value
   - Recalculates with clean data
   - Sets `TrustOS_Status = TRUE`
   - Charts return!

---

## Part 10: Publish and Save

1. Click **File** → **Publish** (or it auto-saves in Cloud)
2. Name: `TrustOS_Demo`
3. Your workbook is now saved in Tableau Cloud!

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Extension not loading** | Check server running on port 3000, check browser console |
| **"Extensions not allowed"** | Site admin needs to enable in Settings |
| **Z-Score showing NaN** | Worksheet needs multiple data points, not aggregated |
| **Lock screen not appearing** | Check Is_Unsafe field is selected for Container B visibility |
| **Both containers visible** | Make sure Container B is floating and z-ordered on top |
| **Parameter not found** | Parameter must be named exactly `TrustOS_Status` |

---

## Demo Recording Checklist

When recording your hackathon video:

- [ ] Show the healthy dashboard with green "✓ Verified" badge
- [ ] Point out the Z-Score and baseline values (real calculation!)
- [ ] Click "💉 Inject Anomaly"
- [ ] Watch the lock screen appear (dramatic moment!)
- [ ] Show the Z-Score spike in the extension
- [ ] Click "🧹 Remove Anomaly"
- [ ] Dashboard unlocks - back to normal
- [ ] Explain this uses REAL Tableau Extensions API

---

## Architecture Reminder

```
User's Worksheet (with Date + Gross_Margin)
         │
         ▼
TrustOS Extension (JavaScript)
    │
    ├── getSummaryDataReaderAsync() ─── Fetches ALL data points
    │
    ├── calculateStatistics() ─── mean, std, z-score
    │
    └── setTableauParameter() ─── TrustOS_Status = true/false
         │
         ▼
Dynamic Zone Visibility
    │
    ├── TrustOS_Status = TRUE  →  Show Charts
    │
    └── TrustOS_Status = FALSE →  Show Lock Screen
```

**Everything runs in the browser - no external server required!**
