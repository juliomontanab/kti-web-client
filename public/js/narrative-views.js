// ========== NARRATIVE ENGINE VIEWS ==========
// Three-layer rendering system for instrument analysis

import { formatNumber, formatPercent, formatRelativeTime } from './utils/formatters.js';

export function renderExecutiveView(detail) {
    const executive = detail.executive || {};
    const price = detail.technical?.price || detail.price || {};

    if (!executive.headline) {
        return '<div class="empty-state"><p>Vista ejecutiva no disponible</p></div>';
    }

    return `
        <div class="executive-view">
            <!-- Headline & Sentiment -->
            <div class="exec-headline-section">
                <h3 class="exec-headline">${executive.headline}</h3>
                ${executive.sentiment ? `<span class="exec-sentiment sentiment-${executive.sentiment.toLowerCase()}">${executive.sentiment}</span>` : ''}
            </div>

            <!-- Signal Badge -->
            ${executive.signal ? `
            <div class="exec-signal-badge signal-${executive.signal.color}">
                <span class="signal-icon">${executive.signal.icon || ''}</span>
                <span class="signal-action">${executive.signal.action}</span>
            </div>
            ` : ''}

            <!-- Risk/Reward Bar -->
            ${renderRiskRewardBar(detail)}

            <!-- Guidance -->
            ${executive.guidance ? `
            <div class="exec-guidance">
                <p>${executive.guidance}</p>
            </div>
            ` : ''}

            <!-- Actions by Position -->
            ${executive.actions ? `
            <div class="exec-actions">
                <h5>¿Qué hacer?</h5>

                ${executive.actions.noPosition ? `
                <div class="action-card">
                    <div class="action-header">
                        <span class="action-icon">📍</span>
                        <span class="action-title">Sin Posición</span>
                    </div>
                    <div class="action-content">
                        <div class="action-do">${executive.actions.noPosition.do}</div>
                        ${executive.actions.noPosition.entry ? `<div class="action-detail"><strong>Entrada:</strong> ${executive.actions.noPosition.entry}</div>` : ''}
                        ${executive.actions.noPosition.stop ? `<div class="action-detail"><strong>Stop:</strong> ${executive.actions.noPosition.stop}</div>` : ''}
                        ${executive.actions.noPosition.target ? `<div class="action-detail"><strong>Objetivo:</strong> ${executive.actions.noPosition.target}</div>` : ''}
                        ${executive.actions.noPosition.size ? `<div class="action-detail"><strong>Tamaño:</strong> ${executive.actions.noPosition.size}</div>` : ''}
                    </div>
                </div>
                ` : ''}

                ${executive.actions.longPosition ? `
                <div class="action-card">
                    <div class="action-header">
                        <span class="action-icon">📈</span>
                        <span class="action-title">Con Posición Larga</span>
                    </div>
                    <div class="action-content">
                        <div class="action-do">${executive.actions.longPosition.do}</div>
                        ${executive.actions.longPosition.detail ? `<div class="action-detail">${executive.actions.longPosition.detail}</div>` : ''}
                    </div>
                </div>
                ` : ''}

                ${executive.actions.shortPosition ? `
                <div class="action-card">
                    <div class="action-header">
                        <span class="action-icon">📉</span>
                        <span class="action-title">Con Posición Corta</span>
                    </div>
                    <div class="action-content">
                        <div class="action-do">${executive.actions.shortPosition.do}</div>
                        ${executive.actions.shortPosition.detail ? `<div class="action-detail">${executive.actions.shortPosition.detail}</div>` : ''}
                    </div>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Watching -->
            ${executive.watching && executive.watching.length > 0 ? `
            <div class="exec-watching">
                <h5>Estoy mirando:</h5>
                <ul class="watching-list">
                    ${executive.watching.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <!-- Conviction -->
            ${executive.conviction ? `
            <div class="exec-conviction">
                <div class="conviction-header">
                    <span>Nivel de Convicción</span>
                    <span class="conviction-level level-${executive.conviction.level?.toLowerCase().replace('_', '-')}">${executive.conviction.level?.replace('_', ' ')}</span>
                </div>
                <div class="conviction-bar">
                    <div class="conviction-fill" style="width: ${executive.conviction.score || 0}%"></div>
                </div>
                <div class="conviction-score">${executive.conviction.score}%</div>
                ${executive.conviction.brief ? `<p class="conviction-brief">${executive.conviction.brief}</p>` : ''}
            </div>
            ` : ''}

            <!-- Context -->
            ${executive.context ? `
            <div class="exec-context">
                <h5>Contexto</h5>
                <p>${executive.context}</p>
            </div>
            ` : ''}

            <!-- Continuity -->
            ${executive.continuity?.narrativeThread ? `
            <div class="exec-continuity">
                <div class="continuity-icon">🔗</div>
                <p>${executive.continuity.narrativeThread}</p>
                ${executive.continuity.daysSinceScenarioStart ? `<small>Día ${executive.continuity.daysSinceScenarioStart} del escenario</small>` : ''}
            </div>
            ` : ''}
        </div>
    `;
}

export function renderInvestmentCardView(detail) {
    const investmentCard = detail.investmentCard || {};

    if (!investmentCard.direction) {
        return '<div class="empty-state"><p>Ficha de inversión no disponible</p></div>';
    }

    return `
        <div class="investment-card-view">
            <!-- Direction & Confidence -->
            <div class="ic-direction-section">
                <div class="ic-bias-row">
                    <span class="ic-label">Sesgo:</span>
                    <span class="ic-bias bias-${investmentCard.direction.bias?.toLowerCase()}">${investmentCard.direction.bias}</span>
                </div>
                <div class="ic-confidence-row">
                    <span class="ic-label">Confianza:</span>
                    <div class="ic-confidence-bar">
                        <div class="ic-confidence-fill" style="width: ${investmentCard.direction.confidence || 0}%"></div>
                    </div>
                    <span class="ic-confidence-value">${investmentCard.direction.confidence}%</span>
                </div>
                ${investmentCard.direction.convictionLevel ? `
                <div class="ic-conviction-level">${investmentCard.direction.convictionLevel}</div>
                ` : ''}
                ${investmentCard.direction.narrative ? `
                <p class="ic-narrative">${investmentCard.direction.narrative}</p>
                ` : ''}
            </div>

            <!-- Risk/Reward Bar -->
            ${renderRiskRewardBar(detail)}

            <!-- Potential (Targets & Stop Loss) -->
            ${investmentCard.potential ? `
            <div class="ic-potential-section">
                <h5>Potencial</h5>
                <div class="ic-rr-badge">R:R ${investmentCard.potential.riskReward}</div>

                ${investmentCard.potential.targets && investmentCard.potential.targets.length > 0 ? `
                <div class="ic-targets">
                    <span class="ic-targets-label">Objetivos</span>
                    ${investmentCard.potential.targets.map((t, i) => `
                        <div class="ic-target-row target-${i + 1}">
                            <span class="target-label">T${i + 1}</span>
                            <span class="target-level">${formatNumber(t.level, 2)}</span>
                            <span class="target-percent">${t.percent}%</span>
                            <span class="target-prob prob-${t.probability}">${t.probability}</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                ${investmentCard.potential.stopLoss ? `
                <div class="ic-stop-loss">
                    <span class="sl-label">Stop Loss</span>
                    <span class="sl-level">${formatNumber(investmentCard.potential.stopLoss.level, 2)}</span>
                    <span class="sl-percent">${investmentCard.potential.stopLoss.percent}%</span>
                    ${investmentCard.potential.stopLoss.reason ? `<span class="sl-reason">${investmentCard.potential.stopLoss.reason}</span>` : ''}
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Timing -->
            ${investmentCard.timing ? `
            <div class="ic-timing-section">
                <h5>Momento del Swing</h5>
                <div class="ic-timing-badges">
                    <span class="timing-phase phase-${investmentCard.timing.phase?.toLowerCase().replace('_', '-')}">${investmentCard.timing.phase?.replace('_', ' ')}</span>
                    <span class="timing-quality quality-${investmentCard.timing.quality?.toLowerCase()}">${investmentCard.timing.quality}</span>
                </div>
                ${investmentCard.timing.narrative ? `<p class="timing-narrative">${investmentCard.timing.narrative}</p>` : ''}
                <div class="ic-swing-position">
                    <div class="swing-bar">
                        <div class="swing-marker" style="left: ${investmentCard.timing.percentFromLow || 0}%"></div>
                    </div>
                    <div class="swing-labels">
                        <span>Low</span>
                        <span>${investmentCard.timing.percentFromLow}% recorrido</span>
                        <span>High</span>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Market Context -->
            ${investmentCard.marketContext ? `
            <div class="ic-market-context">
                <h5>Contexto de Mercado</h5>

                ${investmentCard.marketContext.fearGreed ? `
                <div class="ic-context-card">
                    <div class="context-header">Fear & Greed</div>
                    <div class="fg-row">
                        ${investmentCard.marketContext.fearGreed.crypto ? `
                        <div class="fg-item">
                            <span class="fg-label">Crypto</span>
                            <span class="fg-value fg-${getFearGreedClass(investmentCard.marketContext.fearGreed.crypto.value)}">${investmentCard.marketContext.fearGreed.crypto.value}</span>
                            <span class="fg-status">${investmentCard.marketContext.fearGreed.crypto.label}</span>
                            <span class="fg-impact impact-${investmentCard.marketContext.fearGreed.crypto.impact?.toLowerCase()}">${investmentCard.marketContext.fearGreed.crypto.impact}</span>
                        </div>
                        ` : ''}
                        ${investmentCard.marketContext.fearGreed.stocks ? `
                        <div class="fg-item">
                            <span class="fg-label">Stocks</span>
                            <span class="fg-value fg-${getFearGreedClass(investmentCard.marketContext.fearGreed.stocks.value)}">${investmentCard.marketContext.fearGreed.stocks.value}</span>
                            <span class="fg-status">${investmentCard.marketContext.fearGreed.stocks.label}</span>
                            <span class="fg-impact impact-${investmentCard.marketContext.fearGreed.stocks.impact?.toLowerCase()}">${investmentCard.marketContext.fearGreed.stocks.impact}</span>
                        </div>
                        ` : ''}
                    </div>
                    ${investmentCard.marketContext.fearGreed.divergenceDetected ? `
                    <div class="fg-divergence">
                        <span class="divergence-icon">⚠️</span>
                        <span>${investmentCard.marketContext.fearGreed.divergenceDescription}</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                ${investmentCard.marketContext.geopolitical ? `
                <div class="ic-context-card">
                    <div class="context-header">Geopolítico</div>
                    <div class="defcon-display defcon-${investmentCard.marketContext.geopolitical.defcon}">
                        <span class="defcon-level">DEFCON ${investmentCard.marketContext.geopolitical.defcon}</span>
                        <span class="defcon-label">${investmentCard.marketContext.geopolitical.label}</span>
                    </div>
                    ${investmentCard.marketContext.geopolitical.riskAssessment ? `<p class="geo-assessment">${investmentCard.marketContext.geopolitical.riskAssessment}</p>` : ''}
                </div>
                ` : ''}

                ${investmentCard.marketContext.correlations ? `
                <div class="ic-correlations">
                    ${investmentCard.marketContext.correlations.dxy ? `
                    <div class="corr-item">
                        <span class="corr-name">DXY</span>
                        <span class="corr-value">${investmentCard.marketContext.correlations.dxy.value}</span>
                        <span class="corr-trend">${investmentCard.marketContext.correlations.dxy.trend}</span>
                        <span class="corr-impact impact-${investmentCard.marketContext.correlations.dxy.impact?.toLowerCase()}">${investmentCard.marketContext.correlations.dxy.impact}</span>
                    </div>
                    ` : ''}
                    ${investmentCard.marketContext.correlations.vix ? `
                    <div class="corr-item">
                        <span class="corr-name">VIX</span>
                        <span class="corr-value">${investmentCard.marketContext.correlations.vix.value}</span>
                        <span class="corr-trend">${investmentCard.marketContext.correlations.vix.trend}</span>
                        <span class="corr-impact impact-${investmentCard.marketContext.correlations.vix.impact?.toLowerCase()}">${investmentCard.marketContext.correlations.vix.impact}</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Scenarios -->
            ${investmentCard.scenarios ? `
            <div class="ic-scenarios-section">
                <h5>Escenarios</h5>

                ${investmentCard.scenarios.main ? `
                <div class="ic-scenario-card main-scenario">
                    <div class="scenario-header">
                        <span class="scenario-title">Principal</span>
                        <span class="scenario-direction dir-${investmentCard.scenarios.main.direction?.toLowerCase()}">${investmentCard.scenarios.main.direction}</span>
                        <span class="scenario-prob">${investmentCard.scenarios.main.probability}%</span>
                    </div>
                    ${investmentCard.scenarios.main.reasoning ? `<p class="scenario-reasoning">${investmentCard.scenarios.main.reasoning}</p>` : ''}
                    <div class="scenario-levels">
                        <div class="level-item"><span>Entrada:</span> <span>${formatNumber(investmentCard.scenarios.main.entry, 2)}</span></div>
                        <div class="level-item stop"><span>Stop Loss:</span> <span>${formatNumber(investmentCard.scenarios.main.stopLoss, 2)}</span></div>
                        ${investmentCard.scenarios.main.targets?.map(t => `
                            <div class="level-item target"><span>${t.description}:</span> <span>${formatNumber(t.level, 2)} (${t.rr})</span></div>
                        `).join('') || ''}
                    </div>
                </div>
                ` : ''}

                ${investmentCard.scenarios.alternative ? `
                <div class="ic-scenario-card alt-scenario">
                    <div class="scenario-header">
                        <span class="scenario-title">Alternativo</span>
                        <span class="scenario-direction dir-${investmentCard.scenarios.alternative.direction?.toLowerCase()}">${investmentCard.scenarios.alternative.direction}</span>
                        <span class="scenario-prob">${investmentCard.scenarios.alternative.probability}%</span>
                    </div>
                    ${investmentCard.scenarios.alternative.condition ? `<p class="scenario-condition"><strong>Condición:</strong> ${investmentCard.scenarios.alternative.condition}</p>` : ''}
                    <div class="scenario-levels">
                        <div class="level-item"><span>Entrada:</span> <span>${formatNumber(investmentCard.scenarios.alternative.entry, 2)}</span></div>
                        <div class="level-item stop"><span>Stop Loss:</span> <span>${formatNumber(investmentCard.scenarios.alternative.stopLoss, 2)}</span></div>
                        ${investmentCard.scenarios.alternative.targets?.map(t => `
                            <div class="level-item target"><span>${t.description}:</span> <span>${formatNumber(t.level, 2)} (${t.rr})</span></div>
                        `).join('') || ''}
                    </div>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Risk Management -->
            ${investmentCard.riskManagement ? `
            <div class="ic-risk-section">
                <h5>Gestión de Riesgo</h5>
                ${investmentCard.riskManagement.positionSize ? `<div class="risk-item"><strong>Tamaño:</strong> ${investmentCard.riskManagement.positionSize}</div>` : ''}
                ${investmentCard.riskManagement.reason ? `<div class="risk-item"><strong>Razón:</strong> ${investmentCard.riskManagement.reason}</div>` : ''}
                ${investmentCard.riskManagement.invalidationLong ? `<div class="risk-item invalidation"><strong>Invalidación Long:</strong> ${investmentCard.riskManagement.invalidationLong}</div>` : ''}
                ${investmentCard.riskManagement.invalidationShort ? `<div class="risk-item invalidation"><strong>Invalidación Short:</strong> ${investmentCard.riskManagement.invalidationShort}</div>` : ''}
                ${investmentCard.riskManagement.specialRisks && investmentCard.riskManagement.specialRisks.length > 0 ? `
                <div class="special-risks">
                    <strong>Riesgos especiales:</strong>
                    <ul>
                        ${investmentCard.riskManagement.specialRisks.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
            ` : ''}
        </div>
    `;
}

export function renderTechnicalView(detail) {
    const technical = detail.technical || {};
    const signal = detail.analysis?.mainScenario || detail.investmentCard?.scenarios?.main;
    const altSignal = detail.analysis?.alternativeScenario || detail.investmentCard?.scenarios?.alternative;
    const price = technical.price || detail.price;
    const trend = technical.trend || detail.trend;
    const indicators = technical.indicators || detail.indicators;
    const levels = technical.levels || detail.levels;
    const patterns = technical.patterns || detail.patterns;
    const correlations = technical.correlations || detail.correlations;
    const swing = technical.swingAnalysis || detail.swingAnalysis;
    const fearGreed = detail.fearGreedContext;
    const geopolitical = detail.geopoliticalContext;
    const risk = detail.investmentCard?.riskManagement || detail.riskManagement;

    return `
        <div class="technical-view">

            <!-- Swing Analysis -->
            ${swing ? `
            <div class="detail-section">
                <h5>Análisis de Swing</h5>
                <div class="swing-header">
                    <span class="swing-phase phase-${swing.phase?.toLowerCase().replace('_', '-')}">${swing.phase?.replace('_', ' ')}</span>
                    <span class="entry-quality quality-${swing.entryQuality?.toLowerCase()}">${swing.entryQuality}</span>
                </div>
                ${swing.swingMetrics ? `
                <div class="swing-metrics">
                    <div class="metric-item">
                        <span class="metric-label">Desde Swing Low</span>
                        <span class="metric-value">${swing.swingMetrics.percentFromSwingLow}%</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Desde Swing High</span>
                        <span class="metric-value">${swing.swingMetrics.percentFromSwingHigh}%</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Rango Swing</span>
                        <span class="metric-value">${swing.swingMetrics.swingRange || '--'}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Posición</span>
                        <span class="metric-value">${swing.swingMetrics.currentPositionInSwing}</span>
                    </div>
                </div>
                ` : ''}
                ${swing.phaseIndicators ? `
                <div class="phase-indicators">
                    <div class="phase-ind-item">
                        <span class="phase-ind-label">Volumen</span>
                        <span class="phase-ind-value trend-${swing.phaseIndicators.volumeTrend?.toLowerCase()}">${swing.phaseIndicators.volumeTrend}</span>
                    </div>
                    <div class="phase-ind-item">
                        <span class="phase-ind-label">Momentum</span>
                        <span class="phase-ind-value">${swing.phaseIndicators.momentumStrength}</span>
                    </div>
                    <div class="phase-ind-item">
                        <span class="phase-ind-label">Estructura</span>
                        <span class="phase-ind-value">${swing.phaseIndicators.priceStructure}</span>
                    </div>
                    ${swing.phaseIndicators.divergencePresent ? `
                    <div class="phase-ind-item divergence-alert">
                        <span class="phase-ind-label">Divergencia</span>
                        <span class="phase-ind-value">Detectada</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                ${swing.entryRecommendation ? `
                <div class="swing-recommendation">
                    <span class="action-badge action-${swing.entryRecommendation.action?.toLowerCase().replace('_', '-')}">${swing.entryRecommendation.action?.replace('_', ' ')}</span>
                    <p>${swing.entryRecommendation.reasoning}</p>
                    ${swing.entryRecommendation.idealEntry || swing.entryRecommendation.stopLoss || swing.entryRecommendation.takeProfit ? `
                    <div class="swing-entry-levels">
                        ${swing.entryRecommendation.idealEntry ? `<div class="entry-level"><span>Entrada Ideal:</span> ${formatNumber(swing.entryRecommendation.idealEntry, 2)}</div>` : ''}
                        ${swing.entryRecommendation.stopLoss ? `<div class="entry-level stop"><span>Stop Loss:</span> ${formatNumber(swing.entryRecommendation.stopLoss, 2)}</div>` : ''}
                        ${swing.entryRecommendation.takeProfit ? `<div class="entry-level target"><span>Take Profit:</span> ${formatNumber(swing.entryRecommendation.takeProfit, 2)}</div>` : ''}
                        ${swing.entryRecommendation.riskRewardRatio ? `<div class="entry-level rr"><span>R:R Ratio:</span> ${swing.entryRecommendation.riskRewardRatio}</div>` : ''}
                    </div>
                    ` : ''}
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Trend -->
            ${trend ? `
            <div class="detail-section">
                <h5>Tendencia</h5>
                ${trend.multiTimeframe ? `
                <div class="mtf-grid">
                    <div class="mtf-item">
                        <span class="mtf-label">Superior</span>
                        <span class="mtf-value trend-${trend.multiTimeframe.superior?.toLowerCase()}">${trend.multiTimeframe.superior}</span>
                    </div>
                    <div class="mtf-item">
                        <span class="mtf-label">Actual</span>
                        <span class="mtf-value trend-${trend.multiTimeframe.actual?.toLowerCase()}">${trend.multiTimeframe.actual}</span>
                    </div>
                    <div class="mtf-item">
                        <span class="mtf-label">Inferior</span>
                        <span class="mtf-value trend-${trend.multiTimeframe.inferior?.toLowerCase()}">${trend.multiTimeframe.inferior}</span>
                    </div>
                </div>
                <p class="confluence-text">${trend.multiTimeframe.confluence}</p>
                ` : ''}
                ${trend.emas ? `
                <div class="emas-grid">
                    <div class="ema-item"><span>EMA9</span><span>${formatNumber(trend.emas.ema9?.value, 2)}</span><small>${trend.emas.ema9?.distance}%</small></div>
                    <div class="ema-item"><span>EMA21</span><span>${formatNumber(trend.emas.ema21?.value, 2)}</span><small>${trend.emas.ema21?.distance}%</small></div>
                    <div class="ema-item"><span>EMA50</span><span>${formatNumber(trend.emas.ema50?.value, 2)}</span><small>${trend.emas.ema50?.distance}%</small></div>
                    <div class="ema-item"><span>EMA200</span><span>${formatNumber(trend.emas.ema200?.value, 2)}</span><small>${trend.emas.ema200?.distance}%</small></div>
                </div>
                <p class="ema-alignment">${trend.emas.alignment} - ${trend.emas.pricePosition}</p>
                ` : ''}
            </div>
            ` : ''}

            <!-- Indicators -->
            ${indicators ? `
            <div class="detail-section">
                <h5>Indicadores</h5>
                <div class="indicators-full-grid">
                    ${indicators.momentum ? `
                    <div class="indicator-card">
                        <span class="ind-title">Momentum</span>
                        <div class="ind-row"><span>RSI</span><span class="${getRsiClass(indicators.momentum.rsi)}">${formatNumber(indicators.momentum.rsi, 1)}</span></div>
                        <div class="ind-row"><span>ADX</span><span>${formatNumber(indicators.momentum.adx, 1)}</span></div>
                        <div class="ind-row"><span>ATR</span><span>${formatNumber(indicators.momentum.atr, 2)} (${indicators.momentum.atrPercent}%)</span></div>
                        <div class="ind-row"><span>Fuerza</span><span>${indicators.momentum.trendStrength}</span></div>
                    </div>
                    ` : ''}
                    ${indicators.macd ? `
                    <div class="indicator-card">
                        <span class="ind-title">MACD</span>
                        <div class="ind-row"><span>Línea</span><span>${formatNumber(indicators.macd.line, 2)}</span></div>
                        <div class="ind-row"><span>Señal</span><span>${formatNumber(indicators.macd.signal, 2)}</span></div>
                        <div class="ind-row"><span>Histograma</span><span class="${indicators.macd.histogram >= 0 ? 'bullish' : 'bearish'}">${formatNumber(indicators.macd.histogram, 2)}</span></div>
                        <div class="ind-row"><span>Tendencia</span><span>${indicators.macd.trend}</span></div>
                    </div>
                    ` : ''}
                    ${indicators.bollingerBands ? `
                    <div class="indicator-card">
                        <span class="ind-title">Bollinger Bands</span>
                        <div class="ind-row"><span>Superior</span><span>${formatNumber(indicators.bollingerBands.upper, 2)}</span></div>
                        <div class="ind-row"><span>Media</span><span>${formatNumber(indicators.bollingerBands.middle, 2)}</span></div>
                        <div class="ind-row"><span>Inferior</span><span>${formatNumber(indicators.bollingerBands.lower, 2)}</span></div>
                        <div class="ind-row"><span>Posición</span><span>${indicators.bollingerBands.position}%</span></div>
                        ${indicators.bollingerBands.signal ? `<div class="ind-row"><span>Señal</span><span>${indicators.bollingerBands.signal}</span></div>` : ''}
                    </div>
                    ` : ''}
                    ${indicators.stochasticRsi || indicators.srsi ? `
                    <div class="indicator-card">
                        <span class="ind-title">Stochastic RSI</span>
                        <div class="ind-row"><span>%K</span><span>${formatNumber((indicators.stochasticRsi || indicators.srsi).k, 1)}</span></div>
                        <div class="ind-row"><span>%D</span><span>${formatNumber((indicators.stochasticRsi || indicators.srsi).d, 1)}</span></div>
                        <div class="ind-row"><span>RSI Base</span><span>${formatNumber((indicators.stochasticRsi || indicators.srsi).rsiBase, 1)}</span></div>
                        <div class="ind-row"><span>Señal</span><span>${(indicators.stochasticRsi || indicators.srsi).signal}</span></div>
                    </div>
                    ` : ''}
                    ${indicators.volume ? `
                    <div class="indicator-card">
                        <span class="ind-title">Volumen</span>
                        <div class="ind-row"><span>Actual</span><span>${formatVolume(indicators.volume.current)}</span></div>
                        <div class="ind-row"><span>Promedio</span><span>${formatVolume(indicators.volume.average)}</span></div>
                        <div class="ind-row"><span>Ratio</span><span>${indicators.volume.ratio}x</span></div>
                        ${indicators.volume.obv ? `<div class="ind-row"><span>OBV</span><span>${formatVolume(indicators.volume.obv)}</span></div>` : ''}
                        <div class="ind-row"><span>Señal</span><span>${indicators.volume.signal}</span></div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <!-- Levels -->
            ${levels ? `
            <div class="detail-section">
                <h5>Niveles Clave</h5>
                <div class="levels-grid">
                    <div class="levels-column">
                        <span class="levels-title resistances">Resistencias</span>
                        ${levels.resistances?.map(r => `
                            <div class="level-item resistance">
                                <span class="level-price">${formatNumber(r.level, 2)}</span>
                                <span class="level-type">${r.type}</span>
                                <span class="level-strength strength-${r.strength?.toLowerCase()}">${r.strength}</span>
                            </div>
                        `).join('') || '<p class="no-levels">Sin resistencias</p>'}
                    </div>
                    <div class="levels-column">
                        <span class="levels-title supports">Soportes</span>
                        ${levels.supports?.map(s => `
                            <div class="level-item support">
                                <span class="level-price">${formatNumber(s.level, 2)}</span>
                                <span class="level-type">${s.type}</span>
                                <span class="level-strength strength-${s.strength?.toLowerCase()}">${s.strength}</span>
                            </div>
                        `).join('') || '<p class="no-levels">Sin soportes</p>'}
                    </div>
                </div>
                ${levels.pivots ? `
                <div class="pivots-row">
                    <span>S2: ${formatNumber(levels.pivots.s2, 2)}</span>
                    <span>S1: ${formatNumber(levels.pivots.s1, 2)}</span>
                    <span class="pivot-main">P: ${formatNumber(levels.pivots.pivot || levels.pivots.p, 2)}</span>
                    <span>R1: ${formatNumber(levels.pivots.r1, 2)}</span>
                    <span>R2: ${formatNumber(levels.pivots.r2, 2)}</span>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Patterns -->
            ${patterns ? `
            <div class="detail-section">
                <h5>Patrones</h5>
                ${patterns.candlePattern || patterns.candle ? `<div class="pattern-item"><span class="pattern-label">Vela:</span> ${patterns.candlePattern || patterns.candle}</div>` : ''}
                ${patterns.chartPatterns?.length || patterns.chart?.length ? `
                <div class="pattern-list">
                    <span class="pattern-label">Chart:</span>
                    ${(patterns.chartPatterns || patterns.chart).map(p => `<span class="pattern-tag">${p}</span>`).join('')}
                </div>
                ` : ''}
                ${patterns.keyObservations?.length || patterns.observations?.length ? `
                <div class="observations-list">
                    <span class="pattern-label">Observaciones:</span>
                    <ul>
                        ${(patterns.keyObservations || patterns.observations).map(o => `<li>${o}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Correlations -->
            ${correlations ? `
            <div class="detail-section">
                <h5>Correlaciones</h5>
                <div class="correlations-grid">
                    ${correlations.dxy ? `
                    <div class="corr-item">
                        <span class="corr-name">DXY</span>
                        <span class="corr-value">${correlations.dxy.value}</span>
                        <span class="corr-trend trend-${correlations.dxy.trend?.toLowerCase()}">${correlations.dxy.trend}</span>
                        <span class="corr-impact impact-${correlations.dxy.impact?.toLowerCase()}">${correlations.dxy.impact}</span>
                    </div>
                    ` : ''}
                    ${correlations.yields10y ? `
                    <div class="corr-item">
                        <span class="corr-name">10Y Yields</span>
                        <span class="corr-value">${correlations.yields10y.value}%</span>
                        <span class="corr-trend trend-${correlations.yields10y.trend?.toLowerCase()}">${correlations.yields10y.trend}</span>
                        <span class="corr-impact impact-${correlations.yields10y.impact?.toLowerCase()}">${correlations.yields10y.impact}</span>
                    </div>
                    ` : ''}
                    ${correlations.vix ? `
                    <div class="corr-item">
                        <span class="corr-name">VIX</span>
                        <span class="corr-value">${correlations.vix.value}</span>
                        <span class="corr-trend trend-${correlations.vix.trend?.toLowerCase()}">${correlations.vix.trend}</span>
                        <span class="corr-impact impact-${correlations.vix.impact?.toLowerCase()}">${correlations.vix.impact}</span>
                    </div>
                    ` : ''}
                    ${correlations.other ? `
                    <div class="corr-item">
                        <span class="corr-name">${correlations.other.name}</span>
                        <span class="corr-value">${correlations.other.value}</span>
                        <span class="corr-trend trend-${correlations.other.trend?.toLowerCase()}">${correlations.other.trend}</span>
                        <span class="corr-impact impact-${correlations.other.impact?.toLowerCase()}">${correlations.other.impact}</span>
                    </div>
                    ` : ''}
                </div>
                ${correlations.macroEnvironment ? `<p class="macro-env">${correlations.macroEnvironment}</p>` : ''}
            </div>
            ` : ''}

            <!-- Fear & Greed / Geopolitical Context -->
            ${fearGreed || geopolitical ? `
            <div class="detail-section">
                <h5>Contexto de Mercado</h5>
                <div class="context-grid">
                    ${fearGreed ? `
                    <div class="context-card">
                        <span class="context-title">Fear & Greed</span>
                        <div class="fg-values">
                            ${fearGreed.stockValue !== undefined ? `
                            <div class="fg-item">
                                <span>Stocks</span>
                                <span class="fg-value fg-${getFearGreedLevel(fearGreed.stockValue)}">${fearGreed.stockValue} - ${fearGreed.stockLabel}</span>
                            </div>
                            ` : ''}
                            ${fearGreed.cryptoValue !== undefined ? `
                            <div class="fg-item">
                                <span>Crypto</span>
                                <span class="fg-value fg-${getFearGreedLevel(fearGreed.cryptoValue)}">${fearGreed.cryptoValue} - ${fearGreed.cryptoLabel}</span>
                            </div>
                            ` : ''}
                        </div>
                        ${fearGreed.divergenceDetected ? `<p class="fg-divergence">${fearGreed.divergenceDescription}</p>` : ''}
                        ${fearGreed.sentimentImpact ? `<span class="sentiment-impact impact-${fearGreed.sentimentImpact?.toLowerCase()}">${fearGreed.sentimentImpact}</span>` : ''}
                    </div>
                    ` : ''}
                    ${geopolitical ? `
                    <div class="context-card">
                        <span class="context-title">Geopolítico</span>
                        <div class="defcon-display defcon-${geopolitical.defconLevel}">
                            <span class="defcon-level">DEFCON ${geopolitical.defconLevel}</span>
                            <span class="defcon-status">${geopolitical.defconStatus}</span>
                        </div>
                        ${geopolitical.riskClassification ? `<span class="risk-classification">${geopolitical.riskClassification}</span>` : ''}
                        ${geopolitical.riskAssessment ? `<p class="geo-assessment">${geopolitical.riskAssessment}</p>` : ''}
                        <div class="geo-footer">
                            ${geopolitical.geopoliticalImpact ? `<span class="geo-impact impact-${geopolitical.geopoliticalImpact?.toLowerCase()}">${geopolitical.geopoliticalImpact}</span>` : ''}
                            ${geopolitical.confluentWithTechnicals !== undefined ? `
                            <span class="geo-confluence ${geopolitical.confluentWithTechnicals ? 'confluent' : 'divergent'}">
                                ${geopolitical.confluentWithTechnicals ? 'Confluente' : 'Divergente'}
                            </span>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <!-- Analysis Confidence -->
            ${detail.analysis ? `
            <div class="detail-section">
                <h5>Análisis</h5>
                <div class="analysis-summary">
                    <div class="confidence-display">
                        <span class="confidence-label">Confianza</span>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${detail.analysis.confidence}%"></div>
                        </div>
                        <span class="confidence-value">${detail.analysis.confidence}%</span>
                    </div>
                    <div class="bias-display">
                        <span>Bias:</span>
                        <span class="bias-value bias-${detail.analysis.bias?.toLowerCase()}">${detail.analysis.bias}</span>
                    </div>
                    ${detail.analysis.confluenceScore ? `
                    <div class="confluence-display">
                        <span class="conf-bullish">Bullish: ${detail.analysis.confluenceScore.bullish}</span>
                        <span class="conf-bearish">Bearish: ${detail.analysis.confluenceScore.bearish}</span>
                        ${detail.analysis.confluenceScore.total !== undefined ? `<span class="conf-total">Total: ${detail.analysis.confluenceScore.total}</span>` : ''}
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <!-- Tracking Info -->
            ${detail.tracking ? `
            <div class="detail-section tracking-section">
                <h5>Seguimiento en Tiempo Real</h5>
                <div class="tracking-info">
                    <div class="tracking-row">
                        <span class="tracking-label">Precio Actual</span>
                        <span class="tracking-value">${formatNumber(detail.tracking.currentPrice, 2)}</span>
                    </div>
                    ${detail.tracking.currentVolume ? `
                    <div class="tracking-row">
                        <span class="tracking-label">Volumen Actual</span>
                        <span class="tracking-value">${formatVolume(detail.tracking.currentVolume)}</span>
                    </div>
                    ` : ''}
                    <div class="tracking-row">
                        <span class="tracking-label">Actualizaciones</span>
                        <span class="tracking-value">${detail.tracking.updateCount || 0}</span>
                    </div>
                    <div class="tracking-row">
                        <span class="tracking-label">Última Actualización</span>
                        <span class="tracking-value">${detail.tracking.lastUpdate ? formatRelativeTime(new Date(detail.tracking.lastUpdate).toISOString()) : '--'}</span>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

// Helper functions
function getRsiClass(rsi) {
    if (!rsi) return '';
    if (rsi >= 70) return 'overbought';
    if (rsi <= 30) return 'oversold';
    return '';
}

function formatVolume(vol) {
    if (!vol) return '--';
    if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
    return vol.toString();
}

// Helper function
function getFearGreedClass(value) {
    if (!value) return 'neutral';
    if (value >= 75) return 'extreme-greed';
    if (value >= 55) return 'greed';
    if (value >= 45) return 'neutral';
    if (value >= 25) return 'fear';
    return 'extreme-fear';
}

// Risk/Reward Visual Bar
function renderRiskRewardBar(detail) {
    const potential = detail.investmentCard?.potential;
    const price = detail.technical?.price?.current || detail.price?.current;

    if (!potential || !price) return '';

    const stopLoss = potential.stopLoss?.level;
    const targets = potential.targets || [];

    if (!stopLoss || targets.length === 0) return '';

    // Get highest target
    const highestTarget = targets[targets.length - 1];
    const targetLevel = highestTarget.level;

    // Calculate range
    const isLong = targetLevel > price;
    const rangeMin = isLong ? Math.min(stopLoss, price) : Math.min(price, targetLevel);
    const rangeMax = isLong ? Math.max(targetLevel, price) : Math.max(stopLoss, price);
    const range = rangeMax - rangeMin;

    // Calculate positions (as percentage)
    const stopPos = ((stopLoss - rangeMin) / range) * 100;
    const pricePos = ((price - rangeMin) / range) * 100;
    const targetsPos = targets.map(t => ({
        ...t,
        position: ((t.level - rangeMin) / range) * 100
    }));

    // Calculate risk and reward distances
    const riskDistance = Math.abs(price - stopLoss);
    const rewardDistance = Math.abs(targetLevel - price);
    const riskPercent = (riskDistance / price) * 100;
    const rewardPercent = (rewardDistance / price) * 100;

    return `
        <div class="rr-bar-container">
            <div class="rr-bar-header">
                <span class="rr-label">Riesgo vs Recompensa</span>
                <span class="rr-ratio">R:R ${potential.riskReward}</span>
            </div>

            <div class="rr-bar-stats">
                <div class="rr-stat risk">
                    <span class="rr-stat-label">Riesgo</span>
                    <span class="rr-stat-value">${formatPercent(riskPercent / 100)}</span>
                </div>
                <div class="rr-stat reward">
                    <span class="rr-stat-label">Recompensa</span>
                    <span class="rr-stat-value">${formatPercent(rewardPercent / 100)}</span>
                </div>
            </div>

            <div class="rr-bar-visual">
                <svg width="100%" height="80" viewBox="0 0 600 80" preserveAspectRatio="xMidYMid meet">
                    <!-- Risk zone (from stop to price) -->
                    <rect
                        x="${Math.min(stopPos, pricePos) * 6}"
                        y="30"
                        width="${Math.abs(pricePos - stopPos) * 6}"
                        height="20"
                        fill="rgba(239, 68, 68, 0.2)"
                        stroke="rgba(239, 68, 68, 0.5)"
                        stroke-width="1"
                    />

                    <!-- Reward zone (from price to highest target) -->
                    <rect
                        x="${Math.min(pricePos, targetsPos[targetsPos.length - 1].position) * 6}"
                        y="30"
                        width="${Math.abs(targetsPos[targetsPos.length - 1].position - pricePos) * 6}"
                        height="20"
                        fill="rgba(34, 197, 94, 0.2)"
                        stroke="rgba(34, 197, 94, 0.5)"
                        stroke-width="1"
                    />

                    <!-- Stop Loss marker -->
                    <line x1="${stopPos * 6}" y1="20" x2="${stopPos * 6}" y2="60" stroke="#ef4444" stroke-width="2"/>
                    <circle cx="${stopPos * 6}" cy="40" r="4" fill="#ef4444"/>
                    <text x="${stopPos * 6}" y="15" text-anchor="middle" font-size="10" fill="#ef4444" font-weight="600">SL</text>
                    <text x="${stopPos * 6}" y="75" text-anchor="middle" font-size="9" fill="#666">${formatNumber(stopLoss, 2)}</text>

                    <!-- Current Price marker -->
                    <line x1="${pricePos * 6}" y1="20" x2="${pricePos * 6}" y2="60" stroke="#3b82f6" stroke-width="3"/>
                    <circle cx="${pricePos * 6}" cy="40" r="5" fill="#3b82f6"/>
                    <text x="${pricePos * 6}" y="15" text-anchor="middle" font-size="10" fill="#3b82f6" font-weight="600">PRECIO</text>
                    <text x="${pricePos * 6}" y="75" text-anchor="middle" font-size="9" fill="#666" font-weight="600">${formatNumber(price, 2)}</text>

                    <!-- Target markers -->
                    ${targetsPos.map((t, i) => `
                        <line x1="${t.position * 6}" y1="25" x2="${t.position * 6}" y2="55" stroke="#22c55e" stroke-width="2"/>
                        <circle cx="${t.position * 6}" cy="40" r="4" fill="#22c55e"/>
                        <text x="${t.position * 6}" y="15" text-anchor="middle" font-size="10" fill="#22c55e" font-weight="600">T${i + 1}</text>
                        <text x="${t.position * 6}" y="75" text-anchor="middle" font-size="9" fill="#666">${formatNumber(t.level, 2)}</text>
                    `).join('')}
                </svg>
            </div>

            <div class="rr-bar-legend">
                <div class="rr-legend-item">
                    <span class="rr-legend-color risk"></span>
                    <span class="rr-legend-label">Zona de Riesgo</span>
                </div>
                <div class="rr-legend-item">
                    <span class="rr-legend-color reward"></span>
                    <span class="rr-legend-label">Zona de Recompensa</span>
                </div>
            </div>
        </div>
    `;
}
