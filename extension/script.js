/**
 * TrustOS v22 - Ensemble Detection with Weighted Trust Score
 * 
 * Architecture Upgrade:
 * 1. Ensemble detection with 3 detector categories (STATISTICAL, BUSINESS, TEMPORAL)
 * 2. Weighted voting mechanism (each category has different weight)
 * 3. Aggregate TrustScore (0-100) instead of binary decision
 * 4. Row-level duplicate detection via getSummaryDataAsync
 * 5. Persistence + Consensus still active
 */

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
    // Primary metric candidates (tries in order, uses first found)
    heroMetricCandidates: ['Profit Ratio', 'Profit_Ratio', 'Gross_Margin', 'Gross Margin', 'Margin'],
    heroMetricField: 'Profit Ratio',  // Default for Superstore
    heroMetricName: 'Profit Ratio',
    timeField: 'Date',

    // Business Rule Bounds (adjusted for Superstore's Profit Ratio ~5-20%)
    absoluteMin: -10,    // Profit can go negative
    absoluteMax: 40,     // Very high profit ratio is suspicious

    // Z-Score Settings
    zScoreThreshold: 2.5,
    zScoreThresholdMin: 1.5,
    zScoreThresholdMax: 5.0,

    // Rate of Change Settings
    rocThreshold: 0.15,

    // Duplicate Inflation Detection
    inflationMin: 1.08,
    inflationMax: 1.15,

    // Persistence Settings
    persistenceRequired: 2,
    persistenceWindow: 3,

    // ===========================================
    // ENSEMBLE DETECTION WEIGHTS (v22)
    // ===========================================
    // Total weight should sum to 1.0
    ensembleWeights: {
        STATISTICAL: 0.40,   // Z-Score, High Z-Score
        BUSINESS: 0.35,      // Business Rules, Negative, Decimal Shift
        TEMPORAL: 0.25       // Rate of Change, Duplicate Inflation, Currency Flip
    },

    // Trust Score Thresholds (v22.1 - more responsive)
    trustScoreWarning: 90,   // Below this = WARNING
    trustScoreLock: 65,      // Below this = LOCK

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
let valueHistory = [];
let signalHistory = [];

// ============================================================
// DETECTOR REGISTRY (Ensemble Architecture)
// ============================================================
const DETECTOR_REGISTRY = {
    // STATISTICAL DETECTORS (Weight: 40%)
    Z_SCORE: { category: 'STATISTICAL', basePenalty: 80, criticalPenalty: 100 },
    HIGH_ZSCORE: { category: 'STATISTICAL', basePenalty: 40, criticalPenalty: 60 },

    // BUSINESS DETECTORS (Weight: 35%)
    BUSINESS_RULE: { category: 'BUSINESS', basePenalty: 90, criticalPenalty: 100 },
    NEGATIVE_VALUE: { category: 'BUSINESS', basePenalty: 100, criticalPenalty: 100 },
    DECIMAL_SHIFT: { category: 'BUSINESS', basePenalty: 100, criticalPenalty: 100 },

    // TEMPORAL DETECTORS (Weight: 25%)
    RATE_OF_CHANGE: { category: 'TEMPORAL', basePenalty: 60, criticalPenalty: 80 },
    DUPLICATE_INFLATION: { category: 'TEMPORAL', basePenalty: 50, criticalPenalty: 70 },
    CURRENCY_FLIP: { category: 'TEMPORAL', basePenalty: 50, criticalPenalty: 70 }
};

// ============================================================
// INITIALIZATION
// ============================================================
async function init() {
    console.log('🛡️ TrustOS v22 - Ensemble Detection Engine Initializing...');

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

        trustTimeline.unshift({
            timestamp: new Date().toLocaleTimeString(),
            metric: CONFIG.heroMetricName,
            trustScore: analysisResult.trustScore,
            status: analysisResult.status,
            signals: analysisResult.signalsFired,
            reason: analysisResult.signals.join(', ') || 'All checks passed'
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
// DATA ANALYSIS - ENSEMBLE ENGINE
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

    // Auto-detect metric: try candidates in order
    let metricColIndex = -1;
    let detectedMetric = null;
    for (const candidate of CONFIG.heroMetricCandidates) {
        metricColIndex = findColumnIndex(columns, candidate);
        if (metricColIndex !== -1) {
            detectedMetric = candidate;
            CONFIG.heroMetricField = candidate;
            CONFIG.heroMetricName = candidate;
            console.log(`📊 TrustOS: Using metric "${candidate}"`);
            break;
        }
    }

    // Fallback to original config if no candidate found
    if (metricColIndex === -1) {
        metricColIndex = findColumnIndex(columns, CONFIG.heroMetricField);
    }

    if (metricColIndex === -1) {
        throw new Error(`Metric not found. Tried: ${CONFIG.heroMetricCandidates.join(', ')}`);
    }

    let values = [];
    for (const row of rows) {
        const val = extractNumericValue(row[metricColIndex]);
        if (!isNaN(val)) values.push(val);
    }

    if (values.length === 0) throw new Error('No numeric values found');

    // Baseline stats from clean data
    const stats = calculateStatistics(values);
    const previousValue = values[values.length - 1];

    // Check for duplicate rows (v22 row-level analysis)
    const duplicateInfo = detectDuplicateRows(rows);

    let latestValue;
    if (CONFIG.demoAnomalyActive) {
        latestValue = CONFIG.demoAnomalyValue;
    } else {
        latestValue = values[values.length - 1];
    }

    valueHistory.push(latestValue);
    if (valueHistory.length > 10) valueHistory.shift();

    // ========================================
    // RUN ALL DETECTORS
    // ========================================
    const signals = runAllDetectors(latestValue, previousValue, stats, values, duplicateInfo);

    signalHistory.push(signals.length);
    if (signalHistory.length > CONFIG.persistenceWindow) signalHistory.shift();

    // ========================================
    // CALCULATE ENSEMBLE TRUST SCORE
    // ========================================
    return calculateEnsembleTrustScore(latestValue, stats, signals, duplicateInfo);
}

// ============================================================
// DUPLICATE ROW DETECTION (Row-Level Analysis)
// ============================================================
function detectDuplicateRows(rows) {
    if (!rows || rows.length < 2) return { hasDuplicates: false, duplicateCount: 0, duplicateRatio: 0 };

    const rowHashes = new Set();
    const duplicates = [];

    for (let i = 0; i < rows.length; i++) {
        // Create hash from all cell values
        const hash = rows[i].map(cell => cell?.value ?? cell?.formattedValue ?? '').join('|');
        if (rowHashes.has(hash)) {
            duplicates.push(i);
        } else {
            rowHashes.add(hash);
        }
    }

    const duplicateRatio = duplicates.length / rows.length;

    return {
        hasDuplicates: duplicates.length > 0,
        duplicateCount: duplicates.length,
        duplicateRatio: duplicateRatio,
        totalRows: rows.length,
        uniqueRows: rowHashes.size
    };
}

// ============================================================
// SIGNAL DETECTORS (Ensemble Architecture)
// ============================================================
function runAllDetectors(latestValue, previousValue, stats, allValues, duplicateInfo) {
    const signals = [];
    const zScore = Math.abs(latestValue - stats.mean) / (stats.std || 1);
    const multiplier = latestValue / stats.mean;
    const threshold = getActiveThreshold();

    // ========================================
    // STATISTICAL DETECTORS (40% weight)
    // ========================================

    // Signal 1: Z-Score Anomaly
    if (zScore > threshold) {
        signals.push({
            type: 'Z_SCORE',
            category: 'STATISTICAL',
            severity: zScore > threshold * 1.5 ? 'CRITICAL' : 'HIGH',
            value: zScore,
            message: `Z-Score ${zScore.toFixed(1)} exceeds threshold ${threshold}`,
            icon: '📊'
        });
    }

    // Signal 2: High Z-Score Warning
    const warningZone = threshold * 0.7;
    if (zScore > warningZone && zScore <= threshold) {
        signals.push({
            type: 'HIGH_ZSCORE',
            category: 'STATISTICAL',
            severity: 'LOW',
            value: zScore,
            message: `Z-Score ${zScore.toFixed(1)} approaching threshold`,
            icon: '⚠️'
        });
    }

    // ========================================
    // BUSINESS DETECTORS (35% weight)
    // ========================================

    // Signal 3: Business Rule Violation
    if (latestValue < CONFIG.absoluteMin) {
        signals.push({
            type: 'BUSINESS_RULE',
            category: 'BUSINESS',
            severity: 'CRITICAL',
            value: latestValue,
            message: `Value ${latestValue.toFixed(1)}% below minimum ${CONFIG.absoluteMin}%`,
            icon: '📉'
        });
    }
    if (latestValue > CONFIG.absoluteMax) {
        signals.push({
            type: 'BUSINESS_RULE',
            category: 'BUSINESS',
            severity: 'CRITICAL',
            value: latestValue,
            message: `Value ${latestValue.toFixed(1)}% exceeds maximum ${CONFIG.absoluteMax}%`,
            icon: '🚨'
        });
    }

    // Signal 4: Decimal Shift
    if (multiplier > 50) {
        signals.push({
            type: 'DECIMAL_SHIFT',
            category: 'BUSINESS',
            severity: 'CRITICAL',
            value: multiplier,
            message: `Value is ${multiplier.toFixed(0)}x baseline (decimal/unit error)`,
            icon: '🔢'
        });
    }

    // Signal 5: Negative Value
    if (latestValue < 0) {
        signals.push({
            type: 'NEGATIVE_VALUE',
            category: 'BUSINESS',
            severity: 'CRITICAL',
            value: latestValue,
            message: `Negative value detected: ${latestValue.toFixed(1)}%`,
            icon: '⛔'
        });
    }

    // ========================================
    // TEMPORAL DETECTORS (25% weight)
    // ========================================

    // Signal 6: Rate of Change
    if (previousValue !== 0) {
        const roc = Math.abs((latestValue - previousValue) / previousValue);
        if (roc > CONFIG.rocThreshold) {
            signals.push({
                type: 'RATE_OF_CHANGE',
                category: 'TEMPORAL',
                severity: roc > 0.30 ? 'CRITICAL' : 'HIGH',
                value: roc,
                message: `${(roc * 100).toFixed(0)}% change from previous`,
                icon: '📈'
            });
        }
    }

    // Signal 7: Duplicate Inflation
    if (multiplier >= CONFIG.inflationMin && multiplier <= CONFIG.inflationMax) {
        signals.push({
            type: 'DUPLICATE_INFLATION',
            category: 'TEMPORAL',
            severity: 'MEDIUM',
            value: multiplier,
            message: `Value ${((multiplier - 1) * 100).toFixed(0)}% above mean (possible duplication)`,
            icon: '📋'
        });
    }

    // Signal 8: Currency Flip
    if (multiplier > 1.15 && multiplier <= 1.25) {
        signals.push({
            type: 'CURRENCY_FLIP',
            category: 'TEMPORAL',
            severity: 'MEDIUM',
            value: multiplier,
            message: `Value ${((multiplier - 1) * 100).toFixed(0)}% above mean (currency error?)`,
            icon: '💱'
        });
    }

    // Signal 9: Actual Duplicate Rows Detected (Row-Level)
    if (duplicateInfo.hasDuplicates && duplicateInfo.duplicateRatio > 0.01) {
        signals.push({
            type: 'DUPLICATE_ROWS',
            category: 'TEMPORAL',
            severity: duplicateInfo.duplicateRatio > 0.05 ? 'CRITICAL' : 'MEDIUM',
            value: duplicateInfo.duplicateRatio,
            message: `${duplicateInfo.duplicateCount} duplicate rows (${(duplicateInfo.duplicateRatio * 100).toFixed(1)}%)`,
            icon: '🔄'
        });
    }

    return signals;
}

// ============================================================
// ENSEMBLE TRUST SCORE CALCULATION
// ============================================================
function calculateEnsembleTrustScore(latestValue, stats, signals, duplicateInfo) {
    const zScore = Math.abs(latestValue - stats.mean) / (stats.std || 1);

    // Start with 100 (perfect trust)
    let trustScore = 100;

    // Calculate penalties by category
    const categoryPenalties = {
        STATISTICAL: 0,
        BUSINESS: 0,
        TEMPORAL: 0
    };

    for (const signal of signals) {
        const detector = DETECTOR_REGISTRY[signal.type];
        if (!detector) continue;

        // All severities apply full base penalty, CRITICAL gets bonus
        const penalty = signal.severity === 'CRITICAL'
            ? detector.criticalPenalty
            : detector.basePenalty;  // No reduction for LOW/MEDIUM

        categoryPenalties[detector.category] += penalty;
    }

    // Apply weighted penalties
    const weights = CONFIG.ensembleWeights;
    const weightedPenalty =
        (Math.min(categoryPenalties.STATISTICAL, 100) * weights.STATISTICAL) +
        (Math.min(categoryPenalties.BUSINESS, 100) * weights.BUSINESS) +
        (Math.min(categoryPenalties.TEMPORAL, 100) * weights.TEMPORAL);

    trustScore = Math.max(0, Math.min(100, 100 - weightedPenalty));

    // Check persistence
    const persistentAnomaly = checkPersistence();
    if (persistentAnomaly && signals.length > 0) {
        trustScore = Math.max(0, trustScore - 15);  // Additional penalty for persistence
    }

    // Determine status from trust score
    let status = 'SAFE';
    let isSafe = true;
    let message = `Trust Score: ${trustScore.toFixed(0)}/100`;

    if (trustScore < CONFIG.trustScoreLock) {
        status = 'LOCKED';
        isSafe = false;
        message = `LOW TRUST: ${trustScore.toFixed(0)}/100 - ${signals[0]?.message || 'Multiple issues detected'}`;
    } else if (trustScore < CONFIG.trustScoreWarning) {
        status = 'WARNING';
        isSafe = true;
        message = `CAUTION: Trust Score ${trustScore.toFixed(0)}/100`;
    }

    // Category breakdown for UI
    const categoryBreakdown = {
        statistical: {
            score: Math.max(0, 100 - categoryPenalties.STATISTICAL),
            weight: weights.STATISTICAL
        },
        business: {
            score: Math.max(0, 100 - categoryPenalties.BUSINESS),
            weight: weights.BUSINESS
        },
        temporal: {
            score: Math.max(0, 100 - categoryPenalties.TEMPORAL),
            weight: weights.TEMPORAL
        }
    };

    return {
        status,
        isSafe,
        message,
        latestValue,
        zScore,
        trustScore,
        confidence: trustScore,  // For backward compatibility
        mean: stats.mean,
        signals: signals.map(s => s.type),
        signalsFired: signals.length,
        signalDetails: signals,
        categoryBreakdown,
        duplicateInfo,
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
    const critical = signals.find(s => s.severity === 'CRITICAL');
    const high = signals.find(s => s.severity === 'HIGH');
    const primary = critical || high || signals[0];

    // Voting summary: which detectors voted and how
    const votingSummary = {
        total: signals.length,
        critical: signals.filter(s => s.severity === 'CRITICAL').length,
        high: signals.filter(s => s.severity === 'HIGH').length,
        medium: signals.filter(s => s.severity === 'MEDIUM').length,
        low: signals.filter(s => s.severity === 'LOW').length,
        categories: {
            STATISTICAL: signals.filter(s => s.category === 'STATISTICAL').length,
            BUSINESS: signals.filter(s => s.category === 'BUSINESS').length,
            TEMPORAL: signals.filter(s => s.category === 'TEMPORAL').length
        }
    };

    return {
        pattern: primary.type,
        description: primary.message,
        icon: primary.icon,
        category: primary.category,
        rootCause: getRootCause(primary.type),
        recommendedAction: getRecommendedAction(primary.type),
        votingSummary,
        allSignals: signals.map(s => ({
            type: s.type,
            category: s.category,
            severity: s.severity,
            message: s.message
        }))
    };
}

function getRootCause(signalType) {
    const causes = {
        'Z_SCORE': 'Statistical outlier - investigate data source',
        'HIGH_ZSCORE': 'Value approaching anomaly threshold',
        'BUSINESS_RULE': 'Value outside business-valid range',
        'RATE_OF_CHANGE': 'Sudden change - check recent data loads',
        'DUPLICATE_INFLATION': 'Possible duplicate rows from JOIN issues',
        'CURRENCY_FLIP': 'Possible currency conversion error',
        'DECIMAL_SHIFT': 'Check ETL unit/decimal conversions',
        'NEGATIVE_VALUE': 'Unexpected negative - check calculation logic',
        'DUPLICATE_ROWS': 'Actual duplicate rows detected in data'
    };
    return causes[signalType] || 'Manual investigation required';
}

function getRecommendedAction(signalType) {
    const actions = {
        'Z_SCORE': '🔍 Query raw data, compare to historical baseline',
        'HIGH_ZSCORE': '📊 Monitor closely, consider lowering threshold',
        'BUSINESS_RULE': '📋 Verify data source, check filter conditions',
        'RATE_OF_CHANGE': '🔄 Check recent ETL jobs, verify data refresh timestamp',
        'DUPLICATE_INFLATION': '🔗 Audit JOIN conditions, check for fanout',
        'CURRENCY_FLIP': '💱 Verify currency field mapping in ETL',
        'DECIMAL_SHIFT': '🔢 Check number format and unit conversions',
        'NEGATIVE_VALUE': '➖ Review calculation logic, check for sign flips',
        'DUPLICATE_ROWS': '📋 Run SELECT DISTINCT, check primary keys'
    };
    return actions[signalType] || '🔍 Investigate manually';
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
            alertMessage.textContent = 'Running ensemble detection...';
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

    if (data.trustScore !== undefined) updateStats(data);
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
    setText('confidence-value', `${data.trustScore.toFixed(0)}/100`);

    const meter = document.getElementById('meter-fill');
    if (meter) {
        meter.style.width = `${data.trustScore}%`;
        meter.style.background = data.trustScore >= 80 ? 'var(--c-safe)' : data.trustScore >= 50 ? 'var(--c-warn)' : 'var(--c-danger)';
    }
}

function updateTimelineUI() {
    const container = document.getElementById('trust-timeline');
    if (!container) return;

    container.innerHTML = trustTimeline.map(e => `
        <div class="timeline-entry">
            <span class="t-time">${e.timestamp}</span>
            <span class="t-status" style="color:${e.status === 'SAFE' ? 'var(--c-safe)' : e.status === 'LOCKED' ? 'var(--c-danger)' : 'var(--c-warn)'}">
                Score: ${e.trustScore?.toFixed(0) || '?'}/100 (${e.signals || 0} signals)
            </span>
        </div>
    `).join('');
}

function updateNovelInsightsUI(data) {
    const fpPanel = document.getElementById('fingerprint-panel');
    if (fpPanel) {
        if (data.fingerprint) {
            fpPanel.classList.remove('hidden');
            // Show pattern with voting summary
            const fp = data.fingerprint;
            const vs = fp.votingSummary;
            const votingText = vs ? `${vs.total} votes: ${vs.critical}C/${vs.high}H/${vs.medium}M/${vs.low}L` : '';
            setText('fingerprint-pattern', `${fp.pattern} [${fp.category}]`);
            setText('fingerprint-desc', fp.recommendedAction || fp.description);
        } else {
            fpPanel.classList.add('hidden');
        }
    }

    // Show category breakdown and voting details
    if (data.categoryBreakdown) {
        const cb = data.categoryBreakdown;
        setText('prediction-status', `Ensemble Score`);

        // Show category scores with vote counts
        let voteInfo = '';
        if (data.fingerprint && data.fingerprint.votingSummary) {
            const vs = data.fingerprint.votingSummary.categories;
            voteInfo = ` | Votes: S:${vs.STATISTICAL} B:${vs.BUSINESS} T:${vs.TEMPORAL}`;
        }
        setText('prediction-message',
            `STAT: ${cb.statistical.score.toFixed(0)} | BIZ: ${cb.business.score.toFixed(0)} | TEMP: ${cb.temporal.score.toFixed(0)}${voteInfo}`
        );
    } else if (data.signalDetails && data.signalDetails.length > 0) {
        setText('prediction-status', `${data.signalDetails.length} Signals Fired`);
        setText('prediction-message', data.signalDetails.map(s => `${s.type}`).join(', '));
    } else {
        setText('prediction-status', 'All Clear');
        setText('prediction-message', 'No anomalies detected');
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
// DEMO CONTROLS (Calibrated for Superstore Profit Ratio ~12%)
// ============================================================
window.injectExtreme = function () {
    CONFIG.demoAnomalyActive = true;
    CONFIG.demoAnomalyValue = 2.0;  // 200% profit ratio = extreme
    runAudit();
};
window.injectModerate = function () {
    CONFIG.demoAnomalyActive = true;
    CONFIG.demoAnomalyValue = 0.18;  // 18% profit ratio = moderate spike
    runAudit();
};
window.injectSubtle = function () {
    CONFIG.demoAnomalyActive = true;
    CONFIG.demoAnomalyValue = 0.14;  // 14% profit ratio = subtle
    runAudit();
};
window.injectDuplicate = function () {
    CONFIG.demoAnomalyActive = true;
    CONFIG.demoAnomalyValue = 0.13;  // 13% profit ratio = duplicate inflation
    runAudit();
};
window.resetNormal = function () {
    CONFIG.demoAnomalyActive = false;
    signalHistory = [];
    runAudit();
};
window.updateThreshold = function (val) {
    CONFIG.zScoreThreshold = parseFloat(val);
    setText('thresholdValue', val);
    runAudit();
};

// Start
document.addEventListener('DOMContentLoaded', init);