/**
 * TrustOS - Decision Trust Fabric for Tableau
 * 
 * A semantic trust layer that governs humans AND AI agents across analytics.
 * 
 * Core Capabilities:
 * 1. Multi-metric trust evaluation via Z-Score analysis
 * 2. DecisionTrustState primitive - platform-wide trust signal
 * 3. Dashboard circuit breaker via Dynamic Zone Visibility
 * 4. Trust timeline for auditability
 * 
 * Technical Implementation:
 * - Uses getSummaryDataReaderAsync() for real worksheet data access
 * - Calculates Mean/StdDev from ALL data points in the visualization
 * - Composite trust score governs dashboard visibility
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

    // Z-Score threshold (configurable via slider, range: 1.5 - 5.0)
    zScoreThreshold: 2.5,  // Default threshold
    zScoreThresholdMin: 1.5,
    zScoreThresholdMax: 5.0,

    // Which worksheet to monitor (null = auto-detect with metric field)
    targetWorksheet: null,

    // Parameter to control dashboard visibility
    safetyParameter: 'DecisionTrustState',

    // Polling interval (ms)
    pollInterval: 30000,

    // Demo mode - injects anomaly value into the calculation
    // The extension STILL fetches real data, but adds an anomaly point
    demoAnomalyActive: false,
    demoAnomalyValue: 2400
};

// Get current active threshold (from slider)
function getActiveThreshold() {
    return CONFIG.zScoreThreshold;
}

// State
let isTableauInitialized = false;
let checkCount = 0;
let currentWorksheet = null;
let lastAnalysis = null;

// Trust Timeline (audit trail)
let trustTimeline = [];

/**
 * Initialize the extension
 */
async function init() {
    console.log('🛡️ TrustOS Extension Initializing...');
    console.log('📊 Using Tableau Extensions API for REAL data access');

    // Check if tableau object exists
    if (typeof tableau === 'undefined') {
        console.error('❌ ERROR: tableau object is undefined');
        console.error('   The Tableau Extensions API script did not load.');
        updateUIState('standalone');
        return;
    }

    console.log('✅ tableau object found');

    if (typeof tableau.extensions === 'undefined') {
        console.error('❌ ERROR: tableau.extensions is undefined');
        updateUIState('standalone');
        return;
    }

    console.log('✅ tableau.extensions found');

    try {
        console.log('🔄 Calling tableau.extensions.initializeAsync()...');
        await tableau.extensions.initializeAsync();
        isTableauInitialized = true;
        console.log('✅ Tableau Extensions API Initialized SUCCESSFULLY');

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
        console.error('❌ Tableau API initialization FAILED');
        console.error('   Error name:', error.name);
        console.error('   Error message:', error.message);
        console.error('   Full error:', error);
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

        // Add to trust timeline (keep last 5)
        trustTimeline.unshift({
            timestamp: new Date().toLocaleTimeString(),
            metric: CONFIG.heroMetricName,
            zScore: analysisResult.zScore,
            status: analysisResult.status,
            reason: analysisResult.isSafe ? 'Within bounds' : 'Anomaly detected'
        });
        if (trustTimeline.length > 5) trustTimeline.pop();
        updateTimelineUI();

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

    // Clear any mark selections to ensure we get ALL data points
    // (Otherwise Tableau only returns selected marks)
    try {
        await currentWorksheet.clearSelectedMarksAsync();
        console.log('   Cleared mark selections for full dataset');
    } catch (e) {
        // Some worksheets don't support this, continue anyway
    }

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

    // Log available columns for debugging if not found
    if (metricColIndex === -1) {
        const availableCols = columns.map(c => c.fieldName).join(', ');
        console.error(`❌ Hero metric "${CONFIG.heroMetricField}" not found.`);
        console.error(`   Available columns: ${availableCols}`);
        throw new Error(`Hero metric "${CONFIG.heroMetricField}" not found. Available: ${availableCols}`);
    } else {
        console.log(`✅ Found metric column: "${columns[metricColIndex].fieldName}" (matches "${CONFIG.heroMetricField}")`);
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
 * Find column index by name with fuzzy matching
 * Handles: "SUM(Gross Margin)", "Gross_Margin", "AVG(Gross Margin)", etc.
 */
function findColumnIndex(columns, fieldName) {
    // Normalize target: remove special chars, lowercase
    const cleanTarget = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');

    return columns.findIndex(col => {
        // Normalize candidate column name
        const cleanCol = col.fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanCol.includes(cleanTarget);
    });
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

// ============================================================
// NOVEL FEATURES: Innovation that sets TrustOS apart
// ============================================================

/**
 * NOVEL FEATURE 1: Anomaly Fingerprinting
 * Classifies the TYPE of anomaly based on magnitude and pattern
 * Returns: { pattern, description, likelihood, icon }
 */
function fingerprintAnomaly(latestValue, stats, zScore) {
    const deviation = latestValue - stats.mean;
    const multiplier = latestValue / stats.mean;

    // Pattern classification based on characteristics
    if (multiplier > 50) {
        return {
            pattern: 'DECIMAL_SHIFT',
            description: 'Likely decimal/unit conversion error (100x baseline)',
            likelihood: 95,
            icon: '🔢',
            rootCause: 'Check ETL decimal handling or unit conversions'
        };
    } else if (multiplier > 1.15 && multiplier < 1.25) {
        return {
            pattern: 'CURRENCY_FLIP',
            description: 'Possible currency conversion error (~1.2x)',
            likelihood: 75,
            icon: '💱',
            rootCause: 'Check currency conversion logic (EUR/USD swap?)'
        };
    } else if (zScore > 2 && zScore < 4 && deviation > 0) {
        return {
            pattern: 'SEASONAL_SPIKE',
            description: 'Unusual positive spike - verify if expected',
            likelihood: 60,
            icon: '📈',
            rootCause: 'Could be legitimate (Black Friday) or duplicate rows'
        };
    } else if (zScore > 2 && zScore < 4 && deviation < 0) {
        return {
            pattern: 'DATA_DROP',
            description: 'Unusual negative deviation',
            likelihood: 70,
            icon: '📉',
            rootCause: 'Check for missing data or filter errors'
        };
    } else if (multiplier > 1.05 && multiplier < 1.12) {
        return {
            pattern: 'DUPLICATE_INFLATION',
            description: 'Possible duplicate row inflation (~8%)',
            likelihood: 55,
            icon: '📋',
            rootCause: 'Check join logic for duplicate aggregation'
        };
    }

    return {
        pattern: 'UNKNOWN',
        description: 'Anomaly detected - pattern unclassified',
        likelihood: 40,
        icon: '❓',
        rootCause: 'Manual investigation recommended'
    };
}

/**
 * NOVEL FEATURE 2: Predictive Trust
 * Analyzes trend to predict if trust is about to fail
 * Uses last N values to calculate trajectory
 */
let recentValues = [];  // Store last 10 values for trend analysis

function predictTrustTrajectory(latestValue, stats, threshold) {
    // Add to recent values (keep last 10)
    recentValues.push(latestValue);
    if (recentValues.length > 10) recentValues.shift();

    if (recentValues.length < 3) {
        return { prediction: null, message: 'Gathering trend data...' };
    }

    // Calculate trend using linear regression on Z-scores
    const recentZScores = recentValues.map(v =>
        stats.std > 0 ? Math.abs((v - stats.mean) / stats.std) : 0
    );

    // Simple linear regression for trend
    const n = recentZScores.length;
    const xMean = (n - 1) / 2;
    const yMean = recentZScores.reduce((a, b) => a + b, 0) / n;

    let numerator = 0, denominator = 0;
    for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (recentZScores[i] - yMean);
        denominator += (i - xMean) * (i - xMean);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const currentZ = recentZScores[recentZScores.length - 1];

    // Predict steps until threshold breach
    if (slope > 0.1 && currentZ < threshold) {
        const stepsToThreshold = Math.ceil((threshold - currentZ) / slope);
        if (stepsToThreshold <= 5) {
            return {
                prediction: 'APPROACHING_FAILURE',
                stepsRemaining: stepsToThreshold,
                slope: slope.toFixed(2),
                message: `⚠️ PREDICTIVE WARNING: Trust may fail in ${stepsToThreshold} evaluations`,
                icon: '🔮'
            };
        }
    } else if (slope < -0.1 && currentZ > threshold * 0.8) {
        return {
            prediction: 'RECOVERING',
            slope: slope.toFixed(2),
            message: '📈 Trend: Metric recovering toward normal range',
            icon: '↗️'
        };
    }

    return {
        prediction: 'STABLE',
        slope: slope.toFixed(2),
        message: 'Trend stable',
        icon: '➡️'
    };
}

/**
 * NOVEL FEATURE 3: Trust Propagation
 * Identifies related metrics that may be affected
 */
const METRIC_RELATIONSHIPS = {
    'Gross_Margin': ['Revenue', 'COGS', 'Profit', 'Profit_Margin'],
    'Revenue': ['Gross_Margin', 'Units_Sold', 'ASP', 'Total_Sales'],
    'Profit': ['Revenue', 'COGS', 'Gross_Margin', 'Expenses'],
    'default': ['Related metrics may be affected']
};

function propagateTrust(heroMetric, isSafe) {
    const relatedMetrics = METRIC_RELATIONSHIPS[heroMetric] || METRIC_RELATIONSHIPS['default'];

    if (!isSafe) {
        return {
            affected: relatedMetrics,
            status: 'SUSPECT',
            message: `⚠️ Trust cascade: ${relatedMetrics.join(', ')} now SUSPECT`,
            icon: '🌐'
        };
    }

    return {
        affected: relatedMetrics,
        status: 'VERIFIED',
        message: 'Related metrics trusted',
        icon: '✅'
    };
}

/**
 * Determine status based on Z-Score and absolute bounds
 * Now includes: Anomaly Fingerprinting, Predictive Trust, Trust Propagation
 */
function determineStatus(latestValue, stats, zScore) {
    const threshold = getActiveThreshold();
    const confidence = Math.max(0, Math.min(100, 100 * (1 - zScore / threshold)));

    let status, isSafe, message, color;

    // Check absolute bounds first (catches extreme anomalies)
    if (latestValue < CONFIG.absoluteMin || latestValue > CONFIG.absoluteMax) {
        status = 'LOCKED';
        isSafe = false;
        color = '#dc3545';
        message = `CRITICAL: ${CONFIG.heroMetricName} is ${latestValue.toFixed(1)}% - Outside safe bounds (${CONFIG.absoluteMin}-${CONFIG.absoluteMax}%). Dashboard Locked.`;
    }
    // Check Z-Score (statistical anomaly)
    else if (zScore > threshold) {
        status = 'LOCKED';
        isSafe = false;
        color = '#dc3545';
        message = `ANOMALY: ${CONFIG.heroMetricName} is ${latestValue.toFixed(1)}% (Z-Score: ${zScore.toFixed(1)} > ${threshold.toFixed(1)}). Dashboard Locked.`;
    }
    // Warning zone
    else if (zScore > threshold * 0.7) {
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

    // === NOVEL FEATURES ===
    const fingerprint = (!isSafe || zScore > 1.5) ? fingerprintAnomaly(latestValue, stats, zScore) : null;
    const prediction = predictTrustTrajectory(latestValue, stats, threshold);
    const propagation = propagateTrust(CONFIG.heroMetricField, isSafe);

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
        threshold: threshold,
        // Novel features
        fingerprint,
        prediction,
        propagation
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
                document.getElementById('metric-value').textContent = `${data.latestValue}% `;
                document.getElementById('metric-baseline').textContent =
                    `Data range: ${(data.mean - 2 * data.std).toFixed(0)}% - ${(data.mean + 2 * data.std).toFixed(0)}% (n = ${data.dataPoints})`;
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

    // Update Novel Insights panel
    if (data.fingerprint || data.prediction || data.propagation) {
        updateNovelInsightsUI(data);
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
        document.getElementById('stat-baseline').textContent = `${data.mean.toFixed(0)}% `;
    }
    document.getElementById('stat-checks').textContent = checkCount;

    const confidence = data.confidence || 0;
    document.getElementById('confidence-value').textContent = `${confidence.toFixed(0)}% `;

    const meterFill = document.getElementById('meter-fill');
    meterFill.style.width = `${confidence}% `;
    meterFill.classList.remove('high', 'medium', 'low');
    meterFill.classList.add(confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low');
}

/**
 * Set Tableau parameter (the circuit breaker)
 */
async function setTableauParameter(isSafe) {
    if (!isTableauInitialized) {
        console.log('📌 Would set DecisionTrustState to:', isSafe);
        return;
    }

    try {
        const dashboard = tableau.extensions.dashboardContent.dashboard;
        const params = await dashboard.getParametersAsync();
        const safetyParam = params.find(p => p.name === CONFIG.safetyParameter);

        if (safetyParam) {
            await safetyParam.changeValueAsync(isSafe);
            console.log(`🔒 Circuit Breaker: ${isSafe ? 'OPEN (safe)' : 'CLOSED (locked)'} `);
        } else {
            console.warn(`⚠️ Parameter "${CONFIG.safetyParameter}" not found`);
        }
    } catch (error) {
        console.error('❌ Parameter update failed:', error);
    }
}

/**
 * Update the Trust Timeline UI display
 */
function updateTimelineUI() {
    const container = document.getElementById('trust-timeline');
    if (!container) return;

    if (trustTimeline.length === 0) {
        container.innerHTML = '<div class="timeline-empty">No evaluations yet</div>';
        return;
    }

    const html = trustTimeline.map(entry => {
        const statusIcon = entry.status === 'SAFE' ? '✅' :
            entry.status === 'WARNING' ? '⚠️' : '⛔';
        const statusClass = entry.status.toLowerCase();
        return `
            <div class="timeline-entry ${statusClass}">
                <span class="timeline-time">${entry.timestamp}</span>
                <span class="timeline-zscore">Z: ${entry.zScore.toFixed(1)}</span>
                <span class="timeline-icon">${statusIcon}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

/**
 * Update Novel Insights UI with fingerprint, prediction, and propagation
 */
function updateNovelInsightsUI(data) {
    // Fingerprint Panel
    const fingerprintPanel = document.getElementById('fingerprint-panel');
    if (fingerprintPanel && data.fingerprint) {
        fingerprintPanel.classList.remove('hidden');
        fingerprintPanel.classList.toggle('danger', !data.isSafe);
        fingerprintPanel.classList.toggle('warning', data.isSafe && data.zScore > 1.5);
        document.getElementById('fingerprint-icon').textContent = data.fingerprint.icon;
        document.getElementById('fingerprint-pattern').textContent = data.fingerprint.pattern.replace('_', ' ');
        document.getElementById('fingerprint-desc').textContent = data.fingerprint.rootCause;
    } else if (fingerprintPanel) {
        fingerprintPanel.classList.add('hidden');
    }

    // Prediction Panel
    const predictionPanel = document.getElementById('prediction-panel');
    if (predictionPanel && data.prediction) {
        document.getElementById('prediction-icon').textContent = data.prediction.icon || '🔮';
        document.getElementById('prediction-status').textContent = data.prediction.prediction || 'Trend Analysis';
        document.getElementById('prediction-message').textContent = data.prediction.message;
        predictionPanel.classList.toggle('warning', data.prediction.prediction === 'APPROACHING_FAILURE');
    }

    // Propagation Panel
    const propagationPanel = document.getElementById('propagation-panel');
    if (propagationPanel && data.propagation) {
        if (!data.isSafe) {
            propagationPanel.classList.remove('hidden');
            propagationPanel.classList.add('danger');
            document.getElementById('propagation-status').textContent = 'TRUST CASCADE';
            document.getElementById('propagation-message').textContent = data.propagation.message;
        } else {
            propagationPanel.classList.add('hidden');
        }
    }
}

// ============================================================
// SIMULATION FUNCTIONS
// These simulate logic regression scenarios for demonstration
// The extension still uses real data + injects a corrupted value
// ============================================================

/**
 * Inject Extreme Anomaly - decimal shift error (2400%)
 */
function injectExtreme() {
    console.log('💥 SIMULATION: Extreme anomaly - decimal shift error...');
    CONFIG.demoAnomalyActive = true;
    CONFIG.demoAnomalyValue = 2400;
    runAudit();
}

/**
 * Inject Moderate Anomaly - seasonal spike (29.5%)
 */
function injectModerate() {
    console.log('📊 SIMULATION: Moderate anomaly - seasonal spike...');
    CONFIG.demoAnomalyActive = true;
    CONFIG.demoAnomalyValue = 29.5;
    runAudit();
}

/**
 * Inject Subtle Anomaly - currency conversion error (28.2%)
 */
function injectSubtle() {
    console.log('🔍 SIMULATION: Subtle anomaly - currency conversion error...');
    CONFIG.demoAnomalyActive = true;
    CONFIG.demoAnomalyValue = 28.2;
    runAudit();
}

/**
 * Legacy function for backward compatibility
 */
function triggerAnomaly() {
    injectExtreme();
}

/**
 * Restore Clean State - removes simulated regression
 */
function resetNormal() {
    console.log('✅ SIMULATION: Clean state restored...');
    CONFIG.demoAnomalyActive = false;
    runAudit();
}

/**
 * Update threshold from slider
 */
function updateThreshold(value) {
    CONFIG.zScoreThreshold = parseFloat(value);
    console.log(`🎚️ Threshold updated to: ${CONFIG.zScoreThreshold.toFixed(1)}`);

    // Update display
    const display = document.getElementById('thresholdValue');
    if (display) {
        display.textContent = CONFIG.zScoreThreshold.toFixed(1);
    }

    runAudit();
}

// Initialize
document.addEventListener('DOMContentLoaded', init);