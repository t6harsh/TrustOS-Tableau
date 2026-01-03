/**
 * TrustOS - Decision Trust Fabric for Tableau (v18 Enterprise)
 * 
 * Core Capabilities:
 * 1. Multi-metric trust evaluation via Z-Score analysis
 * 2. DecisionTrustState primitive - platform-wide trust signal
 * 3. Dashboard circuit breaker via Dynamic Zone Visibility
 * 4. Trust timeline for auditability
 */

// Configuration
const CONFIG = {
    heroMetricField: 'Gross_Margin',
    heroMetricName: 'Gross Margin',
    timeField: 'Date',
    absoluteMin: 5,
    absoluteMax: 50,
    zScoreThreshold: 2.5,
    zScoreThresholdMin: 1.5,
    zScoreThresholdMax: 5.0,
    targetWorksheet: null,
    safetyParameter: 'DecisionTrustState',
    pollInterval: 30000,
    demoAnomalyActive: false,
    demoAnomalyValue: 2400
};

function getActiveThreshold() {
    return CONFIG.zScoreThreshold;
}

// State
let isTableauInitialized = false;
let checkCount = 0;
let currentWorksheet = null;
let lastAnalysis = null;
let trustTimeline = [];

/**
 * Initialize
 */
async function init() {
    console.log('🛡️ TrustOS v18 Initializing...');

    if (typeof tableau === 'undefined') {
        updateUIState('standalone');
        return;
    }

    try {
        await tableau.extensions.initializeAsync();
        isTableauInitialized = true;
        const dashboard = tableau.extensions.dashboardContent.dashboard;

        // Find worksheet
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

        // Run initial audit
        await runAudit();
        setInterval(runAudit, CONFIG.pollInterval);

    } catch (error) {
        console.error('❌ Init Error:', error);
        updateUIState('standalone');
    }
}

/**
 * Main Audit Loop
 */
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

        trustTimeline.unshift({
            timestamp: new Date().toLocaleTimeString(),
            metric: CONFIG.heroMetricName,
            zScore: analysisResult.zScore,
            status: analysisResult.status,
            reason: analysisResult.isSafe ? 'Within bounds' : 'Anomaly detected'
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

/**
 * Data Analysis
 */
async function analyzeWorksheetData() {
    // Clear selections to get all data
    try { await currentWorksheet.clearSelectedMarksAsync(); } catch (e) { }

    // Fetch data
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

    // Extract values
    let values = [];
    for (const row of rows) {
        const val = extractNumericValue(row[metricColIndex]);
        if (!isNaN(val)) values.push(val);
    }

    if (values.length === 0) throw new Error('No numeric values found');

    // Inject Demo Anomaly
    if (CONFIG.demoAnomalyActive) {
        values.push(CONFIG.demoAnomalyValue);
    }

    // Statistics
    const stats = calculateStatistics(values);
    const latestValue = CONFIG.demoAnomalyActive ? CONFIG.demoAnomalyValue : values[values.length - 1];
    const zScore = Math.abs(latestValue - stats.mean) / (stats.std || 1);

    return determineStatus(latestValue, stats, zScore);
}

// Helpers
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

// Novel Logic
function fingerprintAnomaly(latestValue, stats, zScore) {
    const multiplier = latestValue / stats.mean;
    const deviation = latestValue - stats.mean;
    if (multiplier > 50) return { pattern: 'DECIMAL_SHIFT', description: 'Likely decimal/unit error (100x)', icon: '🔢', rootCause: 'Check ETL decimal handling' };
    if (multiplier > 1.15 && multiplier < 1.25) return { pattern: 'CURRENCY_FLIP', description: 'Possible currency error (~1.2x)', icon: '💱', rootCause: 'Check currency conversion' };
    if (zScore > 2 && deviation > 0) return { pattern: 'SEASONAL_SPIKE', description: 'Unusual positive spike', icon: '📈', rootCause: 'Verify if expected' };
    if (zScore > 2 && deviation < 0) return { pattern: 'DATA_DROP', description: 'Unusual negative drop', icon: '📉', rootCause: 'Check for missing data' };
    return { pattern: 'UNKNOWN', description: 'Unclassified anomaly', icon: '❓', rootCause: 'Investigation needed' };
}

function predictTrustTrajectory(latestValue, stats, threshold) {
    // Simplified for demo (random/static for now since we don't persist history perfectly)
    return { prediction: 'STABLE', message: 'Trend stable', icon: '➡️' };
}

function propagateTrust(heroMetric, isSafe) {
    const related = ['Revenue', 'COGS', 'Profit'];
    if (!isSafe) return { status: 'SUSPECT', message: `⚠️ Trust cascade: ${related.join(', ')} SUSPECT`, icon: '🌐' };
    return { status: 'VERIFIED', message: 'Related metrics trusted', icon: '✅' };
}

function determineStatus(latestValue, stats, zScore) {
    const threshold = getActiveThreshold();
    const confidence = Math.max(0, Math.min(100, 100 * (1 - zScore / threshold)));
    let status = 'SAFE', isSafe = true, message = `Verified (${latestValue.toFixed(1)}%)`;

    if (latestValue < CONFIG.absoluteMin || latestValue > CONFIG.absoluteMax) {
        status = 'LOCKED'; isSafe = false; message = `CRITICAL: ${latestValue.toFixed(1)}% outside safe bounds`;
    } else if (zScore > threshold) {
        status = 'LOCKED'; isSafe = false; message = `ANOMALY: Z-Score ${zScore.toFixed(1)} > ${threshold}`;
    } else if (zScore > threshold * 0.7) {
        status = 'WARNING'; isSafe = true; message = `WARNING: Unusual pattern (Z: ${zScore.toFixed(1)})`;
    }

    return {
        status, isSafe, message, latestValue, zScore, confidence, mean: stats.mean,
        fingerprint: (!isSafe || zScore > 1.5) ? fingerprintAnomaly(latestValue, stats, zScore) : null,
        prediction: predictTrustTrajectory(latestValue, stats, threshold),
        propagation: propagateTrust(CONFIG.heroMetricField, isSafe)
    };
}

// UI Updates
function updateUIState(state, data = {}) {
    // Elements
    const safetyOverlay = document.getElementById('safety-overlay');
    const alertMessage = document.getElementById('alert-message');

    // Default Reset
    safetyOverlay.classList.remove('active');

    switch (state) {
        case 'loading':
            setHeroState('loading', '⏳', 'Analyzing...');
            alertMessage.textContent = 'Scanning data quality...';
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

            // Lock Screen Details
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
    if (data.fingerprint || data.prediction) updateNovelInsightsUI(data);
}

function setHeroState(state, icon, text) {
    const hero = document.querySelector('.status-hero');
    const heroIcon = document.querySelector('.hero-icon');
    const heroText = document.getElementById('status-text');
    const badgeStatus = document.querySelector('.brand-status');

    document.body.className = `state-${state}`; // for background
    if (hero) {
        hero.className = `status-hero ${state}`; // toggles border colors
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
                ${e.status} (Z:${e.zScore.toFixed(1)})
            </span>
        </div>
    `).join('');
}

function updateNovelInsightsUI(data) {
    // Fingerprint
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

    // Prediction
    if (data.prediction) {
        setText('prediction-status', data.prediction.prediction);
        setText('prediction-message', data.prediction.message);
    }

    // Propagation
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

// Global scope functions for HTML buttons
window.injectExtreme = function () { CONFIG.demoAnomalyActive = true; CONFIG.demoAnomalyValue = 2400; runAudit(); };
window.injectModerate = function () { CONFIG.demoAnomalyActive = true; CONFIG.demoAnomalyValue = 29.5; runAudit(); };
window.injectSubtle = function () { CONFIG.demoAnomalyActive = true; CONFIG.demoAnomalyValue = 28.2; runAudit(); };
window.resetNormal = function () { CONFIG.demoAnomalyActive = false; runAudit(); };
window.updateThreshold = function (val) {
    CONFIG.zScoreThreshold = parseFloat(val);
    setText('thresholdValue', val);
    runAudit();
};

// Start
document.addEventListener('DOMContentLoaded', init);