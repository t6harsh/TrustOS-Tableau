/**
 * TrustOS v21 - Enhanced Multi-Signal Detection Engine
 * 
 * Core Capabilities:
 * 1. Multi-signal anomaly detection (not just Z-Score)
 * 2. Rate-of-change detection (DoD comparison)
 * 3. Business-rule constraints (margins > 60%, negative values)
 * 4. Persistence confirmation (2/3 evaluations before lock)
 * 5. Consensus-based decision making
 */

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
    heroMetricField: 'Gross_Margin',
    heroMetricName: 'Gross Margin',
    timeField: 'Date',

    // Business Rule Bounds
    absoluteMin: 5,      // Below this is always suspicious
    absoluteMax: 60,     // Margins > 60% are suspicious for most businesses

    // Z-Score Settings
    zScoreThreshold: 2.5,
    zScoreThresholdMin: 1.5,
    zScoreThresholdMax: 5.0,

    // Rate of Change Settings
    rocThreshold: 0.15,  // 15% change day-over-day is suspicious

    // Duplicate Inflation Detection
    inflationMin: 1.08,  // 8% inflation
    inflationMax: 1.15,  // 15% inflation

    // Persistence Settings
    persistenceRequired: 2,    // Need 2 out of 3 evaluations to confirm lock
    persistenceWindow: 3,      // Look at last 3 evaluations

    // Consensus Settings
    signalsForWarning: 1,     // 1 signal = warning
    signalsForLock: 2,         // 2+ signals = lock

    targetWorksheet: null,
    safetyParameter: 'DecisionTrustState',
    pollInterval: 30000,
    demoAnomalyActive: false,
    demoAnomalyValue: 2400
};

function getActiveThreshold() {
    return CONFIG.zScoreThreshold;
}

// ============================================================
// STATE
// ============================================================
let isTableauInitialized = false;
let checkCount = 0;
let currentWorksheet = null;
let lastAnalysis = null;
let trustTimeline = [];

// Historical data for rate-of-change and persistence
let valueHistory = [];       // Last N values for DoD/WoW
let signalHistory = [];      // Last N signal counts for persistence

// ============================================================
// INITIALIZATION
// ============================================================
async function init() {
    console.log('🛡️ TrustOS v21 - Enhanced Detection Engine Initializing...');

    if (typeof tableau === 'undefined') {
        updateUIState('standalone');
        return;
    }

    try {
        await tableau.extensions.initializeAsync();
        isTableauInitialized = true;
        const dashboard = tableau.extensions.dashboardContent.dashboard;

        const worksheets = dashboard.worksheets;
        if (worksheets.length > 0) {
            currentWorksheet = CONFIG.targetWorksheet
                ? worksheets.find(ws => ws.name === CONFIG.targetWorksheet)
                : worksheets[0];

            if (currentWorksheet) {
                currentWorksheet.addEventListener(
                    tableau.TableauEventType.FilterChanged,
                    () => runAudit()
                );
            }
        }

        await runAudit();
        setInterval(runAudit, CONFIG.pollInterval);

    } catch (error) {
        console.error('❌ Init Error:', error);
        updateUIState('standalone');
    }
}

// ============================================================
// MAIN AUDIT LOOP
// ============================================================
async function runAudit() {
    updateUIState('loading');

    try {
        let analysisResult;

        if (isTableauInitialized && currentWorksheet) {
            analysisResult = await analyzeWorksheetData();
        } else {
            updateUIState('standalone');
            return;
        }

        checkCount++;
        lastAnalysis = analysisResult;

        // Add to timeline
        trustTimeline.unshift({
            timestamp: new Date().toLocaleTimeString(),
            metric: CONFIG.heroMetricName,
            zScore: analysisResult.zScore,
            status: analysisResult.status,
            signals: analysisResult.signalsFired,
            reason: analysisResult.signals.join(', ') || 'Within bounds'
        });
        if (trustTimeline.length > 5) trustTimeline.pop();
        updateTimelineUI();

        updateUIState(analysisResult.status.toLowerCase(), analysisResult);
        await setTableauParameter(analysisResult.isSafe);

    } catch (error) {
        console.error('❌ Audit Error:', error);
        updateUIState('error', { message: error.message });
    }
}

// ============================================================
// DATA ANALYSIS - MULTI-SIGNAL ENGINE
// ============================================================
async function analyzeWorksheetData() {
    try { await currentWorksheet.clearSelectedMarksAsync(); } catch (e) { }

    let dataTable;
    if (typeof currentWorksheet.getSummaryDataReaderAsync === 'function') {
        const reader = await currentWorksheet.getSummaryDataReaderAsync();
        dataTable = await reader.getAllPagesAsync();
        await reader.releaseAsync();
    } else {
        dataTable = await currentWorksheet.getSummaryDataAsync();
    }

    const rows = dataTable.data;
    const columns = dataTable.columns;
    const metricColIndex = findColumnIndex(columns, CONFIG.heroMetricField);

    if (metricColIndex === -1) throw new Error(`Metric "${CONFIG.heroMetricField}" not found.`);

    let values = [];
    for (const row of rows) {
        const val = extractNumericValue(row[metricColIndex]);
        if (!isNaN(val)) values.push(val);
    }

    if (values.length === 0) throw new Error('No numeric values found');

    // Demo anomaly injection
    if (CONFIG.demoAnomalyActive) {
        values.push(CONFIG.demoAnomalyValue);
    }

    const stats = calculateStatistics(values);
    const latestValue = CONFIG.demoAnomalyActive ? CONFIG.demoAnomalyValue : values[values.length - 1];
    const previousValue = values.length > 1 ? values[values.length - 2] : latestValue;

    // Store in history for persistence checking
    valueHistory.push(latestValue);
    if (valueHistory.length > 10) valueHistory.shift();

    // ========================================
    // MULTI-SIGNAL DETECTION
    // ========================================
    const signals = runAllDetectors(latestValue, previousValue, stats, values);

    // Store signal count for persistence
    signalHistory.push(signals.length);
    if (signalHistory.length > CONFIG.persistenceWindow) signalHistory.shift();

    // Determine final status using consensus + persistence
    return determineStatusMultiSignal(latestValue, stats, signals);
}

// ============================================================
// SIGNAL DETECTORS
// ============================================================
function runAllDetectors(latestValue, previousValue, stats, allValues) {
    const signals = [];
    const zScore = Math.abs(latestValue - stats.mean) / (stats.std || 1);

    // Signal 1: Z-Score Anomaly
    if (zScore > getActiveThreshold()) {
        signals.push({
            type: 'Z_SCORE',
            severity: zScore > getActiveThreshold() * 1.5 ? 'CRITICAL' : 'HIGH',
            message: `Z-Score ${zScore.toFixed(1)} exceeds threshold ${getActiveThreshold()}`,
            icon: '📊'
        });
    }

    // Signal 2: Business Rule Violation (Absolute Bounds)
    if (latestValue < CONFIG.absoluteMin) {
        signals.push({
            type: 'BUSINESS_RULE',
            severity: 'CRITICAL',
            message: `Value ${latestValue.toFixed(1)}% below minimum ${CONFIG.absoluteMin}%`,
            icon: '📉'
        });
    }
    if (latestValue > CONFIG.absoluteMax) {
        signals.push({
            type: 'BUSINESS_RULE',
            severity: 'CRITICAL',
            message: `Value ${latestValue.toFixed(1)}% exceeds maximum ${CONFIG.absoluteMax}% (suspicious for margins)`,
            icon: '🚨'
        });
    }

    // Signal 3: Rate of Change (DoD)
    if (previousValue !== 0) {
        const roc = Math.abs((latestValue - previousValue) / previousValue);
        if (roc > CONFIG.rocThreshold) {
            signals.push({
                type: 'RATE_OF_CHANGE',
                severity: roc > 0.30 ? 'CRITICAL' : 'HIGH',
                message: `${(roc * 100).toFixed(0)}% change from previous (threshold: ${CONFIG.rocThreshold * 100}%)`,
                icon: '📈'
            });
        }
    }

    // Signal 4: Duplicate Inflation Detection (8-15% above expected)
    const multiplier = latestValue / stats.mean;
    if (multiplier >= CONFIG.inflationMin && multiplier <= CONFIG.inflationMax) {
        signals.push({
            type: 'DUPLICATE_INFLATION',
            severity: 'MEDIUM',
            message: `Value is ${((multiplier - 1) * 100).toFixed(0)}% above mean (possible row duplication)`,
            icon: '📋'
        });
    }

    // Signal 5: Decimal Shift (extreme multiplier)
    if (multiplier > 50) {
        signals.push({
            type: 'DECIMAL_SHIFT',
            severity: 'CRITICAL',
            message: `Value is ${multiplier.toFixed(0)}x baseline (likely decimal/unit error)`,
            icon: '🔢'
        });
    }

    // Signal 6: Negative Value (for metrics that shouldn't be negative)
    if (latestValue < 0) {
        signals.push({
            type: 'NEGATIVE_VALUE',
            severity: 'CRITICAL',
            message: `Negative value detected: ${latestValue.toFixed(1)}%`,
            icon: '⛔'
        });
    }

    return signals;
}

// ============================================================
// CONSENSUS-BASED DECISION WITH PERSISTENCE
// ============================================================
function determineStatusMultiSignal(latestValue, stats, signals) {
    const zScore = Math.abs(latestValue - stats.mean) / (stats.std || 1);
    const signalCount = signals.length;
    const criticalSignals = signals.filter(s => s.severity === 'CRITICAL').length;

    // Check persistence: Did anomaly persist across evaluations?
    const persistentAnomaly = checkPersistence();

    let status = 'SAFE';
    let isSafe = true;
    let message = `Verified (${latestValue.toFixed(1)}%)`;

    // LOCK CONDITIONS (any of these):
    // 1. Any CRITICAL signal (immediate lock)
    // 2. 2+ non-critical signals (consensus)
    // 3. Persistent anomaly (2/3 evaluations had signals)

    if (criticalSignals > 0) {
        status = 'LOCKED';
        isSafe = false;
        message = `CRITICAL: ${signals.find(s => s.severity === 'CRITICAL').message}`;
    } else if (signalCount >= CONFIG.signalsForLock) {
        status = 'LOCKED';
        isSafe = false;
        message = `CONSENSUS LOCK: ${signalCount} signals detected`;
    } else if (persistentAnomaly && signalCount > 0) {
        status = 'LOCKED';
        isSafe = false;
        message = `PERSISTENT ANOMALY: Issue detected in ${CONFIG.persistenceRequired}/${CONFIG.persistenceWindow} evaluations`;
    } else if (signalCount >= CONFIG.signalsForWarning) {
        status = 'WARNING';
        isSafe = true;
        message = `WARNING: ${signals[0].message}`;
    }

    const confidence = Math.max(0, Math.min(100, 100 * (1 - (signalCount / 5))));

    return {
        status,
        isSafe,
        message,
        latestValue,
        zScore,
        confidence,
        mean: stats.mean,
        signals: signals.map(s => s.type),
        signalsFired: signalCount,
        signalDetails: signals,
        fingerprint: signals.length > 0 ? generateFingerprint(signals) : null,
        propagation: propagateTrust(CONFIG.heroMetricField, isSafe),
        persistentAnomaly
    };
}

function checkPersistence() {
    if (signalHistory.length < CONFIG.persistenceWindow) return false;

    const recentSignals = signalHistory.slice(-CONFIG.persistenceWindow);
    const anomalyCount = recentSignals.filter(count => count > 0).length;

    return anomalyCount >= CONFIG.persistenceRequired;
}

function generateFingerprint(signals) {
    // Pick the most severe signal as the fingerprint
    const critical = signals.find(s => s.severity === 'CRITICAL');
    const high = signals.find(s => s.severity === 'HIGH');
    const primary = critical || high || signals[0];

    return {
        pattern: primary.type,
        description: primary.message,
        icon: primary.icon,
        rootCause: getRootCause(primary.type),
        allSignals: signals.map(s => s.type)
    };
}

function getRootCause(signalType) {
    const causes = {
        'Z_SCORE': 'Statistical outlier - investigate data source',
        'BUSINESS_RULE': 'Value outside business-valid range',
        'RATE_OF_CHANGE': 'Sudden change - check recent data loads',
        'DUPLICATE_INFLATION': 'Possible duplicate rows from JOIN issues',
        'DECIMAL_SHIFT': 'Check ETL unit/decimal conversions',
        'NEGATIVE_VALUE': 'Unexpected negative - check calculation logic'
    };
    return causes[signalType] || 'Manual investigation required';
}

function propagateTrust(heroMetric, isSafe) {
    const related = ['Revenue', 'COGS', 'Profit'];
    if (!isSafe) return { status: 'SUSPECT', message: `⚠️ Trust cascade: ${related.join(', ')} SUSPECT`, icon: '🌐' };
    return { status: 'VERIFIED', message: 'Related metrics trusted', icon: '✅' };
}

// ============================================================
// HELPERS
// ============================================================
function findColumnIndex(columns, fieldName) {
    const cleanTarget = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return columns.findIndex(col => col.fieldName.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanTarget));
}

function extractNumericValue(cell) {
    if (!cell) return NaN;
    if (typeof cell.value === 'number') return cell.value;
    if (typeof cell.value === 'string') return parseFloat(cell.value.replace(/[%$,]/g, ''));
    if (typeof cell.formattedValue === 'string') return parseFloat(cell.formattedValue.replace(/[%$,]/g, ''));
    return NaN;
}

function calculateStatistics(values) {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / n;
    return { mean, std: Math.sqrt(variance), count: n };
}

// ============================================================
// UI UPDATES
// ============================================================
function updateUIState(state, data = {}) {
    const safetyOverlay = document.getElementById('safety-overlay');
    const alertMessage = document.getElementById('alert-message');

    safetyOverlay.classList.remove('active');

    switch (state) {
        case 'loading':
            setHeroState('loading', '⏳', 'Analyzing...');
            alertMessage.textContent = 'Running multi-signal detection...';
            break;
        case 'safe':
            setHeroState('safe', '✓', 'System Trusted');
            alertMessage.textContent = data.message;
            break;
        case 'warning':
            setHeroState('warning', '!', 'Warning Detected');
            alertMessage.textContent = data.message;
            break;
        case 'locked':
            setHeroState('locked', '⛔', 'Security Lock');
            alertMessage.textContent = data.message;
            safetyOverlay.classList.add('active');

            document.getElementById('safety-message').textContent = data.message;
            if (data.fingerprint && data.fingerprint.description) {
                document.getElementById('safety-fingerprint-desc').textContent = data.fingerprint.description;
            }
            if (data.propagation && data.propagation.message) {
                document.getElementById('safety-propagation-msg').textContent = data.propagation.message;
            }
            break;
        case 'standalone':
            setHeroState('loading', '🖥️', 'Standalone Mode');
            alertMessage.textContent = 'Use demo controls to simulate states.';
            break;
        case 'error':
            setHeroState('loading', '❌', 'System Error');
            alertMessage.textContent = data.message;
            break;
    }

    if (data.zScore !== undefined) updateStats(data);
    if (data.fingerprint || data.signalDetails) updateNovelInsightsUI(data);
}

function setHeroState(state, icon, text) {
    const hero = document.querySelector('.status-hero');
    const heroIcon = document.querySelector('.hero-icon');
    const heroText = document.getElementById('status-text');
    const badgeStatus = document.querySelector('.brand-status');

    document.body.className = `state-${state}`;
    if (hero) {
        hero.className = `status-hero ${state}`;
        if (heroIcon) heroIcon.textContent = icon;
        if (heroText) heroText.textContent = text;
    }

    if (badgeStatus) {
        badgeStatus.textContent = state === 'safe' ? 'System Active' : state === 'locked' ? 'Security Lock' : 'Warning';
        badgeStatus.style.color = state === 'safe' ? 'var(--c-safe)' : state === 'locked' ? 'var(--c-danger)' : 'var(--c-warn)';
    }
}

function updateStats(data) {
    setText('stat-zscore', data.zScore.toFixed(1));
    setText('stat-baseline', `${data.mean.toFixed(0)}%`);
    setText('confidence-value', `${data.confidence.toFixed(0)}%`);

    const meter = document.getElementById('meter-fill');
    if (meter) {
        meter.style.width = `${data.confidence}%`;
        meter.style.background = data.confidence >= 80 ? 'var(--c-safe)' : data.confidence >= 50 ? 'var(--c-warn)' : 'var(--c-danger)';
    }
}

function updateTimelineUI() {
    const container = document.getElementById('trust-timeline');
    if (!container) return;

    container.innerHTML = trustTimeline.map(e => `
        <div class="timeline-entry">
            <span class="t-time">${e.timestamp}</span>
            <span class="t-status" style="color:${e.status === 'SAFE' ? 'var(--c-safe)' : e.status === 'LOCKED' ? 'var(--c-danger)' : 'var(--c-warn)'}">
                ${e.status} (${e.signals || 0} signals)
            </span>
        </div>
    `).join('');
}

function updateNovelInsightsUI(data) {
    const fpPanel = document.getElementById('fingerprint-panel');
    if (fpPanel) {
        if (data.fingerprint) {
            fpPanel.classList.remove('hidden');
            setText('fingerprint-pattern', data.fingerprint.pattern);
            setText('fingerprint-desc', data.fingerprint.description);
        } else {
            fpPanel.classList.add('hidden');
        }
    }

    // Show all fired signals
    if (data.signalDetails && data.signalDetails.length > 0) {
        setText('prediction-status', `${data.signalDetails.length} Signals`);
        setText('prediction-message', data.signalDetails.map(s => s.type).join(', '));
    } else {
        setText('prediction-status', 'No Signals');
        setText('prediction-message', 'All checks passed');
    }

    const propPanel = document.getElementById('propagation-panel');
    if (propPanel) {
        if (data.propagation && !data.isSafe) {
            propPanel.classList.remove('hidden');
            setText('propagation-message', data.propagation.message);
        } else {
            propPanel.classList.add('hidden');
        }
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

async function setTableauParameter(isSafe) {
    if (!isTableauInitialized) return;
    try {
        const dashboard = tableau.extensions.dashboardContent.dashboard;
        const params = await dashboard.getParametersAsync();
        const p = params.find(param => param.name === CONFIG.safetyParameter);
        if (p) await p.changeValueAsync(isSafe);
    } catch (e) { console.error('Param update failed', e); }
}

// ============================================================
// DEMO CONTROLS
// ============================================================
window.injectExtreme = function () {
    CONFIG.demoAnomalyActive = true;
    CONFIG.demoAnomalyValue = 2400;
    runAudit();
};
window.injectModerate = function () {
    CONFIG.demoAnomalyActive = true;
    CONFIG.demoAnomalyValue = 29.5;
    runAudit();
};
window.injectSubtle = function () {
    CONFIG.demoAnomalyActive = true;
    CONFIG.demoAnomalyValue = 28.2;
    runAudit();
};
window.injectDuplicate = function () {
    // Inject a value that's 10% above mean to trigger duplicate inflation
    CONFIG.demoAnomalyActive = true;
    CONFIG.demoAnomalyValue = 25.9;  // ~10% above typical 23.5 mean
    runAudit();
};
window.resetNormal = function () {
    CONFIG.demoAnomalyActive = false;
    signalHistory = [];  // Reset persistence
    runAudit();
};
window.updateThreshold = function (val) {
    CONFIG.zScoreThreshold = parseFloat(val);
    setText('thresholdValue', val);
    runAudit();
};

// Start
document.addEventListener('DOMContentLoaded', init);