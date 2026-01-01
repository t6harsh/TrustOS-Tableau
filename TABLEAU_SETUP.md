# Tableau Desktop Setup Guide (Mac)

> **Complete Step-by-Step Guide to Configure TrustOS with Dynamic Zone Visibility**

This guide walks you through setting up TrustOS in Tableau Desktop on Mac, starting from a blank workbook.

---

## Prerequisites

Before starting, ensure both servers are running:

```bash
# Terminal 1 - Start Backend
cd /Users/harsh/Documents/hackathon/Tableau/TrustOS-Tableau/backend
python3 main.py

# Terminal 2 - Start Extension Server  
cd /Users/harsh/Documents/hackathon/Tableau/TrustOS-Tableau/extension
python3 -m http.server 3000
```

Verify they're running:
- Backend: Open `http://localhost:8000` → Should show "TrustOS online"
- Extension: Open `http://localhost:3000` → Should show TrustOS UI

---

## Part 1: Create a New Workbook with Sample Data

### Step 1.1: Open Tableau Desktop
1. Open **Tableau Desktop** on your Mac
2. You'll see the Start Page with "Connect" on the left

### Step 1.2: Create Sample Data (Since No Database)
Since you don't have a database, we'll create a simple Excel/CSV file with sample data.

**Option A: Use Tableau's Built-in Sample Data**
1. Under "Saved Data Sources" on the left, click **Sample - Superstore**
2. This gives you a ready-made dataset with Sales, Profit, etc.

**Option B: Create Your Own CSV (Recommended for Demo)**
1. Create a file called `sample_data.csv` in your project folder:

```csv
Date,Region,Sales,Profit,Gross_Margin
2024-01-01,North,10000,2400,24.0
2024-01-02,South,12000,2880,24.0
2024-01-03,East,8000,2000,25.0
2024-01-04,West,15000,3600,24.0
2024-01-05,North,11000,2530,23.0
2024-01-06,South,9000,2250,25.0
2024-01-07,East,14000,3360,24.0
```

2. In Tableau: **Connect** → **Text file** → Select `sample_data.csv`

### Step 1.3: Go to a Worksheet
1. After connecting to data, click **Sheet 1** at the bottom
2. You now have a blank worksheet with your data fields on the left

---

## Part 2: Create the Dashboard with Sample Charts

### Step 2.1: Create Chart 1 - Sales by Region
1. Drag **Region** to **Columns**
2. Drag **Sales** to **Rows**
3. You'll see a bar chart
4. Right-click the sheet tab at bottom → **Rename** → "Sales Chart"

### Step 2.2: Create Chart 2 - Gross Margin Trend
1. Click the **New Worksheet** icon (next to sheet tabs) or press `⌘ + M`
2. Drag **Date** to **Columns**
3. Drag **Gross_Margin** to **Rows** (or create calculated field: `SUM([Profit])/SUM([Sales])*100`)
4. Right-click tab → **Rename** → "Margin Trend"

### Step 2.3: Create the Dashboard
1. Click the **New Dashboard** icon (bottom, next to worksheets)
2. A blank dashboard canvas appears

---

## Part 3: Create the TrustOS Parameter

### Step 3.1: Create Boolean Parameter
1. In the Dashboard, look at the **Data** pane on the left
2. Click the small dropdown arrow (▼) next to the search box
3. Select **Create Parameter...**
4. Configure:
   - **Name:** `TrustOS_Status`
   - **Data type:** Boolean
   - **Current value:** `True` (checked)
5. Click **OK**

### Step 3.2: Verify Parameter Created
1. You should see **TrustOS_Status** under "Parameters" in the Data pane
2. Right-click it → **Show Parameter** (this shows a toggle for testing)

---

## Part 4: Create the "Is_Unsafe" Calculated Field

Tableau's Dynamic Zone Visibility only shows zones when a field is `True`. We need the inverse for the lock screen.

### Step 4.1: Create Calculated Field
1. In the Data pane, click the dropdown arrow (▼)
2. Select **Create Calculated Field...**
3. Configure:
   - **Name:** `Is_Unsafe`
   - **Formula:** `NOT [TrustOS_Status]`
4. Click **OK**

### Step 4.2: Verify Field Created
1. You should see **Is_Unsafe** in the Data pane under "Dimensions" or at the bottom

---

## Part 5: Build the Dashboard Layers

### Step 5.1: Add Container A (The Charts)
1. From the **Objects** section on the left (below Sheets), drag **Vertical Container** onto the dashboard
2. Make it fill most of the dashboard area
3. From the **Sheets** section, drag **Sales Chart** into this container
4. Drag **Margin Trend** into the same container (below or beside Sales Chart)

### Step 5.2: Add Container B (The Lock Screen)
1. Drag another **Vertical Container** onto the dashboard (place it anywhere for now)
2. From **Objects**, drag **Image** into this container
3. A dialog appears - click **Choose...** and navigate to:
   ```
   /Users/harsh/Documents/hackathon/Tableau/TrustOS-Tableau/assets/locked_screen.png
   ```
4. Select **Fit Image** and click **OK**

---

## Part 6: Configure Dynamic Zone Visibility

### Step 6.1: Configure Container A (Charts - Show when SAFE)
1. Click on any chart inside Container A
2. Look at the grey "grip" handle at the top of the container
3. **Double-click the handle** until the blue selection border surrounds the ENTIRE container (not just one chart)
   - Keep clicking until you see the whole container selected
4. Look at the **Layout** pane (top-left, may need to click "Layout" tab)
5. Find **"Control visibility using value"** checkbox
6. Check it ✓
7. In the dropdown, select **TrustOS_Status** (under Parameters)

> ✅ This container will be VISIBLE when `TrustOS_Status = True`

### Step 6.2: Configure Container B (Lock Screen - Show when LOCKED)
1. Click on the Image inside Container B
2. **Double-click the handle** until the entire container is selected (blue border around whole container)
3. Go to **Layout** pane
4. Check **"Control visibility using value"**
5. In the dropdown, select **Is_Unsafe** (the calculated field you created)

> ✅ This container will be VISIBLE when `TrustOS_Status = False` (unsafe)

---

## Part 7: Make Lock Screen Cover the Dashboard (Floating)

The containers are currently side-by-side. We need the Lock Screen to cover everything when active.

### Step 7.1: Make Container B Floating
1. Select Container B (the one with the red lock screen image)
2. Click the small dropdown arrow (▼) on the container's title bar
3. Select **Floating**
4. The container will now "float" on top

### Step 7.2: Resize to Cover Entire Dashboard
1. Drag the floating container to the top-left corner (position: 0, 0)
2. Drag the edges to make it cover the entire dashboard area
3. **Tip:** In the Layout pane, you can set exact values:
   - **x:** 0
   - **y:** 0
   - **w:** (match dashboard width, e.g., 1000)
   - **h:** (match dashboard height, e.g., 800)

---

## Part 8: Add the TrustOS Extension

### Step 8.1: Add Extension Object
1. From **Objects** on the left, drag **Extension** onto a corner of the dashboard
2. Make it small (e.g., 200x150 pixels) - it just needs to be visible

### Step 8.2: Load TrustOS Extension
1. A dialog appears - click **My Extensions**
2. Navigate to:
   ```
   /Users/harsh/Documents/hackathon/Tableau/TrustOS-Tableau/extension/trustos.trex
   ```
3. Select the file and click **Open**
4. If prompted about permissions, click **Allow**

### Step 8.3: Verify Extension Loaded
1. You should see the TrustOS UI appear in the extension area
2. It should show a green "Verified" badge (if backend is running)

---

## Part 9: Test the Setup

### Step 9.1: Manual Test with Parameter
1. Find the **TrustOS_Status** parameter control on your dashboard (or show it via Data pane)
2. Toggle it:
   - **True** → Charts visible, Lock Screen hidden
   - **False** → Charts hidden, Lock Screen visible (red overlay)

### Step 9.2: Test with TrustOS Extension
1. In the extension area, click **"💥 Trigger Bug"**
2. The Lock Screen should appear, covering the charts
3. Click **"✅ Reset"** or **"Reset to Normal"** in the overlay
4. Charts should reappear

### Step 9.3: Hide Parameter Control (Production)
1. Right-click the parameter control → **Hide Card**
2. Now only the extension controls the visibility

---

## Part 10: Save Your Workbook

1. **File** → **Save As...**
2. Save as `TrustOS_Demo.twbx` (Packaged Workbook includes data)
3. This is your demo-ready workbook!

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Lock screen doesn't appear** | Ensure `Is_Unsafe` calculated field is selected for Container B's visibility |
| **Both containers visible** | Make sure Container B is floating and covers Container A completely |
| **Extension shows "Backend Offline"** | Run `python3 main.py` in the backend folder |
| **Extension not loading** | Check that extension server is running on port 3000 |
| **Parameter not showing** | Right-click TrustOS_Status in Data pane → Show Parameter |
| **"Control visibility" option missing** | Make sure you selected the CONTAINER (double-click handle), not just a sheet |
| **Lock screen image not found** | Use full path: `/Users/harsh/Documents/hackathon/Tableau/TrustOS-Tableau/assets/locked_screen.png` |

---

## Quick Reference: What Controls What

```
┌─────────────────────────────────────────────────────────┐
│                    DASHBOARD                            │
│                                                         │
│  ┌─────────────────────────────────────────────┐       │
│  │           CONTAINER A (Charts)              │       │
│  │    Visibility: TrustOS_Status = TRUE        │       │
│  │  ┌─────────────┐ ┌─────────────────────┐    │       │
│  │  │ Sales Chart │ │ Margin Trend        │    │       │
│  │  └─────────────┘ └─────────────────────┘    │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  ┌─────────────────────────────────────────────┐       │
│  │      CONTAINER B (Lock Screen) - FLOATING   │       │
│  │    Visibility: Is_Unsafe = TRUE             │       │
│  │         (i.e., TrustOS_Status = FALSE)      │       │
│  │                                             │       │
│  │         ⚠️ SAFETY MODE ACTIVE                │       │
│  │           DASHBOARD LOCKED                  │       │
│  │                                             │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  ┌────────────────┐                                    │
│  │ TrustOS Ext.   │ ← Controls TrustOS_Status          │
│  │ (Small Corner) │                                    │
│  └────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Demo Flow Summary

1. **Open saved workbook** → Shows healthy dashboard with green badge
2. **Click "💥 Trigger Bug"** → Simulates 2400% Gross Margin anomaly
3. **Red Lock Screen appears** → Covers all charts
4. **Click "✅ Reset to Normal"** → Dashboard returns to safe state

**You're ready to record your demo video!** 🎬
