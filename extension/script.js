/**
 * TrustOS Extension - Tableau Extensions API Integration
 * 
 * This extension uses the Tableau Extensions API to:
 * 1. Fetch REAL data directly from Tableau worksheets
 * 2. Calculate REAL Z-Score from visible time-series data in the chart
 * 3. Control dashboard visibility via parameters
 * 
 * Technical Details:
 * - Uses getSummaryDataReaderAsync() to access worksheet data
 * - Calculates Mean and Standard Deviation from ALL data points in the visualization
 * - Compares latest value against historical values IN THE SHEET
 */

// Configuration
const CONFIG = {
    // The metric we're monitoring (must match a column in your worksheet)
    heroMetricField: 'Gross_Margin',
    heroMetricName: 'Gross Margin',

    // Date/Time field for time-series detection
    timeField: 'Date',

    // Absolute safety bounds (catches extreme anomalies even without history)
    absoluteMin: 5,   // Below this is always an error
    absoluteMax: 50,  // Above this is always an error

    // Z-Score threshold (standard deviations from mean)
    zScoreThreshold: 2.5,

    // Which worksheet to monitor (null = auto-detect with metric field)
    targetWorksheet: null,

    // Parameter to control dashboard visibility
    safetyParameter: 'TrustOS_Status',

    // Polling interval (ms)
    pollInterval: 30000,

    // Demo mode - injects anomaly value into the calculation
    // The extension STILL fetches real data, but adds an anomaly point
    demoAnomalyActive: false,
    demoAnomalyValue: 2400
};

// State
let isTableauInitialized = false;
let checkCount = 0;
let currentWorksheet = null;
let lastAnalysis = null;

/**
 * Initialize the extension
 */
async function init() {
    console.log('🛡️ TrustOS Extension Initializing...');
    console.log('📊 Using Tableau Extensions API for REAL data access');

    try {
        await tableau.extensions.initializeAsync();
        isTableauInitialized = true;
        console.log('✅ Tableau Extensions API Initialized');

        const dashboard = tableau.extensions.dashboardContent.dashboard;
        console.log(`📋 Dashboard: ${dashboard.name}`);

        // Find worksheets
        const worksheets = dashboard.worksheets;
        console.log(`📈 Found ${worksheets.length} worksheet(s)`);
        worksheets.forEach(ws => console.log(`   - ${ws.name}`));

        // Select worksheet to monitor
        if (worksheets.length > 0) {
            currentWorksheet = CONFIG.targetWorksheet
                ? worksheets.find(ws => ws.name === CONFIG.targetWorksheet)
                : worksheets[0];

            if (currentWorksheet) {
                console.log(`🎯 Monitoring: ${currentWorksheet.name}`);

                // Listen for data changes
                currentWorksheet.addEventListener(
                    tableau.TableauEventType.FilterChanged,
                    () => {
                        console.log('📢 Filter changed - re-auditing...');
                        runAudit();
                    }
                );
            }
        }

        // Run initial audit
        await runAudit();

        // Periodic checks
        setInterval(runAudit, CONFIG.pollInterval);

    } catch (error) {
        console.warn('⚠️ Running in standalone mode (outside Tableau)');
        isTableauInitialized = false;
        updateUIState('standalone');
    }
}

/**
 * Main audit function - fetches REAL data and calculates REAL Z-Score
 */
async function runAudit() {
    console.log('\n🔍 Running TrustOS Audit...');
    updateUIState('loading');

    try {
        let analysisResult;

        if (isTableauInitialized && currentWorksheet) {
            // REAL MODE: Fetch and analyze actual worksheet data
            analysisResult = await analyzeWorksheetData();
        } else {
            // Standalone mode
            updateUIState('standalone');
            return;
        }

        checkCount++;
        lastAnalysis = analysisResult;

        console.log('📋 Analysis Result:', analysisResult);

        // Update UI based on result
        updateUIState(analysisResult.status.toLowerCase(), analysisResult);

        // Update Tableau parameter (the circuit breaker)
        await setTableauParameter(analysisResult.isSafe);

    } catch (error) {
        console.error('❌ Audit Error:', error);
        updateUIState('error', { message: error.message });
    }
}

/**
 * Fetch worksheet data and perform REAL statistical analysis
 * 
 * This function:
 * 1. Gets ALL data points visible in the worksheet
 * 2. Calculates mean and standard deviation from the data
 * 3. Identifies the "latest" value (most recent time point)
 * 4. Computes Z-Score of latest vs historical values
 */
async function analyzeWorksheetData() {
    console.log(`📥 Fetching data from: ${currentWorksheet.name}`);

    // Fetch real data using Extensions API
    let dataTable;

    if (typeof currentWorksheet.getSummaryDataReaderAsync === 'function') {
        console.log('   Using getSummaryDataReaderAsync');
        const reader = await currentWorksheet.getSummaryDataReaderAsync();
        dataTable = await reader.getAllPagesAsync();
        await reader.releaseAsync();
    } else {
        console.log('   Using getSummaryDataAsync');
        dataTable = await currentWorksheet.getSummaryDataAsync();
    }

    const rows = dataTable.data;
    const columns = dataTable.columns;

    console.log(`   Rows: ${rows.length}, Columns: ${columns.length}`);
    console.log(`   Columns: ${columns.map(c => c.fieldName).join(', ')}`);

    // Find the hero metric column
    const metricColIndex = findColumnIndex(columns, CONFIG.heroMetricField);
    if (metricColIndex === -1) {
        throw new Error(`Hero metric "${CONFIG.heroMetricField}" not found. Available: ${columns.map(c => c.fieldName).join(', ')}`);
    }

    // Find time column (optional, for determining "latest")
    const timeColIndex = findColumnIndex(columns, CONFIG.timeField);

    // Extract all metric values from the worksheet
    let values = [];
    let timeValuePairs = [];

    for (const row of rows) {
        const metricCell = row[metricColIndex];
        const value = extractNumericValue(metricCell);

        if (!isNaN(value)) {
            values.push(value);

            if (timeColIndex !== -1) {
                const timeCell = row[timeColIndex];
                timeValuePairs.push({
                    time: timeCell.value || timeCell.formattedValue,
                    value: value
                });
            }
        }
    }

    if (values.length === 0) {
        throw new Error('No valid numeric values found in worksheet');
    }

    console.log(`   Extracted ${values.length} values`);

    // If demo mode is active, inject an anomaly value
    if (CONFIG.demoAnomalyActive) {
        console.log(`   🎬 DEMO: Injecting anomaly value ${CONFIG.demoAnomalyValue}`);
        values.push(CONFIG.demoAnomalyValue);
        timeValuePairs.push({ time: 'DEMO_ANOMALY', value: CONFIG.demoAnomalyValue });
    }

    // REAL Z-SCORE CALCULATION
    // Calculate from ALL the data points in the worksheet
    const stats = calculateStatistics(values);

    // Determine the "latest" value
    // (last in time-series, or last row, or the injected demo value)
    let latestValue;
    if (CONFIG.demoAnomalyActive) {
        latestValue = CONFIG.demoAnomalyValue;
    } else if (timeValuePairs.length > 0) {
        // Sort by time and get last
        timeValuePairs.sort((a, b) => new Date(a.time) - new Date(b.time));
        latestValue = timeValuePairs[timeValuePairs.length - 1].value;
    } else {
        // Use the last value in the data
        latestValue = values[values.length - 1];
    }

    console.log(`   Latest value: ${latestValue}`);
    console.log(`   Mean: ${stats.mean.toFixed(2)}, Std: ${stats.std.toFixed(2)}`);

    // Calculate Z-Score of latest value
    const zScore = Math.abs(latestValue - stats.mean) / (stats.std || 1);
    console.log(`   Z-Score: ${zScore.toFixed(2)}`);

    // Determine status
    return determineStatus(latestValue, stats, zScore);
}

/**
 * Find column index by name (case-insensitive, partial match)
 */
function findColumnIndex(columns, fieldName) {
    const lower = fieldName.toLowerCase();
    return columns.findIndex(col =>
        col.fieldName.toLowerCase().includes(lower)
    );
}

/**
 * Extract numeric value from a cell
 */
function extractNumericValue(cell) {
    if (cell === null || cell === undefined) return NaN;

    if (typeof cell.value === 'number') return cell.value;
    if (typeof cell.value === 'string') {
        return parseFloat(cell.value.replace(/[%$,]/g, ''));
    }
    if (typeof cell.formattedValue === 'string') {
        return parseFloat(cell.formattedValue.replace(/[%$,]/g, ''));
    }
    return NaN;
}

/**
 * Calculate mean and standard deviation from data
 */
function calculateStatistics(values) {
    const n = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / n;

    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / n;
    const std = Math.sqrt(variance);

    const min = Math.min(...values);
    const max = Math.max(...values);

    return { mean, std, min, max, count: n };
}

/**
 * Determine status based on Z-Score and absolute bounds
 */
function determineStatus(latestValue, stats, zScore) {
    const confidence = Math.max(0, Math.min(100, 100 * (1 - zScore / CONFIG.zScoreThreshold)));

    let status, isSafe, message, color;

    // Check absolute bounds first (catches extreme anomalies)
    if (latestValue < CONFIG.absoluteMin || latestValue > CONFIG.absoluteMax) {
        status = 'LOCKED';
        isSafe = false;
        color = '#dc3545';
        message = `CRITICAL: ${CONFIG.heroMetricName} is ${latestValue.toFixed(1)}% - Outside safe bounds (${CONFIG.absoluteMin}-${CONFIG.absoluteMax}%). Dashboard Locked.`;
    }
    // Check Z-Score (statistical anomaly)
    else if (zScore > CONFIG.zScoreThreshold) {
        status = 'LOCKED';
        isSafe = false;
        color = '#dc3545';
        message = `ANOMALY: ${CONFIG.heroMetricName} is ${latestValue.toFixed(1)}% (Z-Score: ${zScore.toFixed(1)} > ${CONFIG.zScoreThreshold}). Dashboard Locked.`;
    }
    // Warning zone
    else if (zScore > CONFIG.zScoreThreshold * 0.7) {
        status = 'WARNING';
        isSafe = true;
        color = '#ffc107';
        message = `WARNING: ${CONFIG.heroMetricName} at ${latestValue.toFixed(1)}% - Slightly unusual (Z-Score: ${zScore.toFixed(1)}).`;
    }
    // Safe
    else {
        status = 'SAFE';
        isSafe = true;
        color = '#28a745';
        message = `TrustOS Verified: ${CONFIG.heroMetricName} is ${latestValue.toFixed(1)}% - Normal (Z-Score: ${zScore.toFixed(1)}).`;
    }

    return {
        status,
        isSafe,
        message,
        color,
        latestValue: parseFloat(latestValue.toFixed(2)),
        mean: parseFloat(stats.mean.toFixed(2)),
        std: parseFloat(stats.std.toFixed(2)),
        zScore: parseFloat(zScore.toFixed(2)),
        confidence: parseFloat(confidence.toFixed(1)),
        dataPoints: stats.count,
        threshold: CONFIG.zScoreThreshold
    };
}

/**
 * Update UI based on validation state
 */
function updateUIState(state, data = {}) {
    const body = document.body;
    const badge = document.getElementById('status-badge');
    const alertMessage = document.getElementById('alert-message');
    const metricDisplay = document.getElementById('metric-display');
    const safetyOverlay = document.getElementById('safety-overlay');

    // Reset classes
    body.className = '';
    badge.className = 'status-badge';
    metricDisplay.classList.remove('visible');
    safetyOverlay.classList.remove('active');

    switch (state) {
        case 'loading':
            body.classList.add('state-loading');
            badge.classList.add('loading');
            badge.innerHTML = '<span class="status-icon"><span class="loading-spinner"></span></span><span>Analyzing</span>';
            alertMessage.textContent = 'Fetching worksheet data...';
            break;

        case 'safe':
            body.classList.add('state-safe');
            badge.classList.add('safe');
            badge.innerHTML = '<span class="status-icon">✓</span><span>Verified</span>';
            alertMessage.textContent = data.message || 'All metrics within normal range.';
            updateStats(data);
            break;

        case 'warning':
            body.classList.add('state-warning');
            badge.classList.add('warning');
            badge.innerHTML = '<span class="status-icon">⚠</span><span>Warning</span>';
            alertMessage.textContent = data.message || 'Unusual pattern detected.';
            updateStats(data);
            break;

        case 'locked':
            body.classList.add('state-locked');
            badge.classList.add('locked');
            badge.innerHTML = '<span class="status-icon">⛔</span><span>Locked</span>';
            alertMessage.textContent = data.message || 'Anomaly detected.';

            if (data.latestValue !== undefined) {
                document.getElementById('metric-value').textContent = `${data.latestValue}%`;
                document.getElementById('metric-baseline').textContent =
                    `Data range: ${(data.mean - 2 * data.std).toFixed(0)}% - ${(data.mean + 2 * data.std).toFixed(0)}% (n=${data.dataPoints})`;
                metricDisplay.classList.add('visible');
            }

            safetyOverlay.classList.add('active');
            document.getElementById('safety-message').textContent = data.message;
            updateStats(data);
            break;

        case 'standalone':
            body.classList.add('state-loading');
            badge.classList.add('loading');
            badge.innerHTML = '<span class="status-icon">🖥️</span><span>Standalone</span>';
            alertMessage.textContent = 'Running outside Tableau. Use demo buttons to test UI.';
            break;

        case 'error':
            body.classList.add('state-loading');
            badge.innerHTML = '<span class="status-icon">⚠</span><span>Error</span>';
            alertMessage.textContent = data.message || 'Analysis failed.';
            break;
    }

    document.getElementById('last-checked').textContent = new Date().toLocaleTimeString();
}

/**
 * Update stats display
 */
function updateStats(data) {
    if (data.zScore !== undefined) {
        document.getElementById('stat-zscore').textContent = data.zScore.toFixed(1);
    }
    if (data.mean !== undefined) {
        document.getElementById('stat-baseline').textContent = `${data.mean.toFixed(0)}%`;
    }
    document.getElementById('stat-checks').textContent = checkCount;

    const confidence = data.confidence || 0;
    document.getElementById('confidence-value').textContent = `${confidence.toFixed(0)}%`;

    const meterFill = document.getElementById('meter-fill');
    meterFill.style.width = `${confidence}%`;
    meterFill.classList.remove('high', 'medium', 'low');
    meterFill.classList.add(confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low');
}

/**
 * Set Tableau parameter (the circuit breaker)
 */
async function setTableauParameter(isSafe) {
    if (!isTableauInitialized) {
        console.log('📌 Would set TrustOS_Status to:', isSafe);
        return;
    }

    try {
        const dashboard = tableau.extensions.dashboardContent.dashboard;
        const params = await dashboard.getParametersAsync();
        const safetyParam = params.find(p => p.name === CONFIG.safetyParameter);

        if (safetyParam) {
            await safetyParam.changeValueAsync(isSafe);
            console.log(`🔒 Circuit Breaker: ${isSafe ? 'OPEN (safe)' : 'CLOSED (locked)'}`);
        } else {
            console.warn(`⚠️ Parameter "${CONFIG.safetyParameter}" not found`);
        }
    } catch (error) {
        console.error('❌ Parameter update failed:', error);
    }
}

// ============================================================
// DEMO FUNCTIONS
// These inject an anomaly value into the REAL data analysis
// The extension still fetches real data, but adds a fake point
// ============================================================

/**
 * DEMO: Inject anomaly - adds a bad data point to real analysis
 * 
 * This does NOT fake the detection. It injects a value (like a data
 * corruption would), and the real statistical analysis detects it.
 */
function triggerAnomaly() {
    console.log('💥 DEMO: Injecting anomaly into data analysis...');
    CONFIG.demoAnomalyActive = true;
    CONFIG.demoAnomalyValue = 2400;  // Ridiculous value
    runAudit();  // Re-run with injected value
}

/**
 * DEMO: Remove injected anomaly, return to pure real data
 */
function resetNormal() {
    console.log('✅ DEMO: Removing injected anomaly...');
    CONFIG.demoAnomalyActive = false;
    runAudit();  // Re-run with only real data
}

// Initialize
document.addEventListener('DOMContentLoaded', init);