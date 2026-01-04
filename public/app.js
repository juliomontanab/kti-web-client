const API_BASE_URL = 'https://ffmzs9evxj.execute-api.us-east-1.amazonaws.com/dev';
const APP_VERSION = '1.0.6'; // Incrementa esta versión en cada actualización

let currentData = null;
let navigationHistory = [];
let currentOpportunities = [];
let currentConfidenceFilter = null;

// ========== API FUNCTIONS ==========

async function fetchSymbolTypes() {
    try {
        const response = await fetch(`${API_BASE_URL}/list/type/symbols`);
        if (!response.ok) throw new Error('Error al cargar tipos de símbolos');
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function fetchSymbolsByType(typeCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/list/symbols/${typeCode}`);
        if (!response.ok) throw new Error('Error al cargar símbolos');
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function fetchSymbolResults(symbolCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/list/symbol/results/${symbolCode}`);
        if (!response.ok) throw new Error('Error al cargar resultados');
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function fetchSymbolDetail(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/detail/${id}`);
        if (!response.ok) throw new Error('Error al cargar detalle');
        const result = await response.json();
        const data = result.data || result;
        return Array.isArray(data) ? data[0] : data;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function fetchBestOpportunities(minConfidence = 65) {
    try {
        const response = await fetch(`${API_BASE_URL}/list/symbol/results/confidence/${minConfidence}`);
        if (!response.ok) throw new Error('Error al cargar mejores oportunidades');
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function fetchMarketIndexes() {
    try {
        const response = await fetch(`${API_BASE_URL}/market/indexes`);
        if (!response.ok) throw new Error('Error al cargar índices de mercado');
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// ========== RENDER FUNCTIONS ==========

function renderSymbolTypes(types) {
    const container = document.getElementById('typesGrid');

    // Card de Mejores Oportunidades
    const bestOpportunitiesCard = `
        <div class="type-card best-opportunities-card" onclick="showBestOpportunities()">
            <div class="type-icon" style="background: #ff660020; color: #ff6600">
                🔥
            </div>
            <div class="type-info">
                <div class="type-name">Mejores Oportunidades</div>
                <div class="type-description">Análisis con mayor confianza</div>
            </div>
        </div>
    `;

    // Cards de tipos de símbolos
    const typeCards = types.map(type => `
        <div class="type-card" onclick="showSymbolsByType('${type.code}', '${type.name}', '${type.color}', '${type.icon}')">
            <div class="type-icon" style="background: ${type.color}20; color: ${type.color}">
                ${type.icon}
            </div>
            <div class="type-info">
                <div class="type-name">${type.name}</div>
                <div class="type-description">${type.description}</div>
            </div>
        </div>
    `).join('');

    container.innerHTML = bestOpportunitiesCard + typeCards;
}

function renderSymbols(symbols, typeName, typeColor, typeIcon) {
    const container = document.getElementById('symbolsGrid');
    const header = document.getElementById('symbolsHeader');

    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="type-icon-large" style="background: ${typeColor}20; color: ${typeColor}">
                ${typeIcon}
            </div>
            <div>
                <h1>${typeName}</h1>
                <p>Selecciona un símbolo para ver sus análisis</p>
            </div>
        </div>
    `;

    container.innerHTML = symbols.map(symbol => `
        <div class="symbol-card" onclick="showSymbolResults('${symbol.code}', '${symbol.name}', '${symbol.color}', '${symbol.icon}')">
            <div class="symbol-header">
                <div>
                    <div class="symbol-icon" style="color: ${symbol.color}">${symbol.icon}</div>
                    <div class="symbol-name">${symbol.name}</div>
                    <div class="symbol-code">${symbol.code}</div>
                </div>
            </div>
            <div class="symbol-info">${symbol.fullName}</div>
            <div class="symbol-footer">
                <span class="symbol-trading-code">${symbol.tradingCode}</span>
            </div>
        </div>
    `).join('');
}

function renderResults(results, symbolName, symbolColor, symbolIcon) {
    const container = document.getElementById('resultsGrid');
    const header = document.getElementById('resultsHeader');

    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="type-icon-large" style="background: ${symbolColor}20; color: ${symbolColor}">
                ${symbolIcon}
            </div>
            <div>
                <h1>${symbolName}</h1>
                <p>Selecciona un análisis para ver los detalles</p>
            </div>
        </div>
    `;

    container.innerHTML = results.map(result => `
        <div class="result-card" onclick="showDetail('${result._id}')">
            <div class="result-header">
                <div class="result-symbol">${result.instrument.symbol}</div>
                <div class="result-timeframe">${result.instrument.timeframe}</div>
            </div>
            <div class="result-name">${result.instrument.emoji || ''} ${result.instrument.name}</div>
            <div class="result-type">${result.instrument.assetType}</div>
            <div class="result-date">📅 ${formatDate(result)}</div>
        </div>
    `).join('');
}

function renderBestOpportunities(opportunities, confidenceFilter = 65) {
    const container = document.getElementById('resultsGrid');
    const header = document.getElementById('resultsHeader');

    // Guardar el filtro actual
    currentConfidenceFilter = confidenceFilter;

    // Ordenar por confianza descendente
    const sortedOpportunities = [...opportunities].sort((a, b) => b.analysis.confidence - a.analysis.confidence);

    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <div class="type-icon-large" style="background: #ff660020; color: #ff6600">
                🔥
            </div>
            <div>
                <h1>Mejores Oportunidades</h1>
                <p>Análisis con mayor nivel de confianza - Ordenados por probabilidad</p>
            </div>
        </div>
        <div class="confidence-filter">
            <span class="filter-label">Confianza mínima:</span>
            <button class="filter-btn ${confidenceFilter === 65 ? 'active' : ''}" onclick="filterByConfidence(65)">≥65%</button>
            <button class="filter-btn ${confidenceFilter === 70 ? 'active' : ''}" onclick="filterByConfidence(70)">≥70%</button>
            <button class="filter-btn ${confidenceFilter === 75 ? 'active' : ''}" onclick="filterByConfidence(75)">≥75%</button>
            <button class="filter-btn ${confidenceFilter === 80 ? 'active' : ''}" onclick="filterByConfidence(80)">≥80%</button>
            <button class="filter-btn ${confidenceFilter === 85 ? 'active' : ''}" onclick="filterByConfidence(85)">≥85%</button>
            <button class="filter-btn ${confidenceFilter === 90 ? 'active' : ''}" onclick="filterByConfidence(90)">≥90%</button>
        </div>
    `;

    container.innerHTML = sortedOpportunities.map(opp => {
        const directionClass = opp.analysis.mainScenario.direction === 'LONG' ? 'badge-success' : 'badge-danger';
        const biasClass = opp.analysis.bias === 'Alcista' ? 'badge-success' :
            opp.analysis.bias === 'Bajista' ? 'badge-danger' : 'badge-warning';

        return `
            <div class="opportunity-card" onclick="showDetail('${opp._id}')">
                <div class="opportunity-header">
                    <div class="opportunity-symbol">${opp.instrument.symbol}</div>
                    <div class="opportunity-confidence" style="background: #ff660020; color: #ff6600; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.85rem; font-weight: 600;">
                        ${opp.analysis.confidence}% confianza
                    </div>
                </div>
                <div class="opportunity-name">${opp.instrument.emoji || ''} ${opp.instrument.name}</div>
                <div class="opportunity-details">
                    <span class="badge ${directionClass}">${opp.analysis.mainScenario.direction}</span>
                    <span class="badge ${biasClass}">${opp.analysis.bias}</span>
                    <span class="result-timeframe">${opp.instrument.timeframe}</span>
                </div>
                <div class="opportunity-type">${opp.instrument.assetType}</div>
                <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">Entrada sugerida:</span>
                        <span style="color: var(--secondary); font-weight: bold; font-size: 1rem;">${formatNumber(opp.analysis.mainScenario.entry, 3)}</span>
                    </div>
                </div>
                <div class="opportunity-date">📅 ${formatDate(opp)}</div>
            </div>
        `;
    }).join('');
}

function renderMarketIndexes(data) {
    if (!data) {
        document.getElementById('marketIndexesWidget').style.display = 'none';
        return;
    }

    const container = document.getElementById('marketIndexesContent');
    const widget = document.getElementById('marketIndexesWidget');

    widget.style.display = 'block';

    const { fearGreedIndex, pentagonPizzaIndex } = data;

    // Construir el HTML con medidores gráficos
    let html = '';

    // Fear & Greed Index Section
    if (fearGreedIndex && fearGreedIndex.markets) {
        const { stock, crypto } = fearGreedIndex.markets;
        const divergence = fearGreedIndex.divergence;

        html += `
            <div class="index-section">
                <div class="index-section-title">📊 Fear & Greed Index</div>

                <div class="fg-markets-grid">
                    <div class="fg-market-item">
                        <div class="fg-market-title">📈 Stock Market</div>
                        <div class="fg-market-value" style="color: ${getColorForFearGreed(stock.value)}">
                            ${stock.value}
                        </div>
                        <span class="badge ${getBadgeClassForFearGreed(stock.label)}">${stock.label}</span>
                        <div class="gauge-container" style="margin-top: 1rem;">
                            ${createCircularGauge(stock.value, 0, 100, getColorForFearGreed(stock.value))}
                        </div>
                    </div>

                    <div class="fg-market-item">
                        <div class="fg-market-title">₿ Crypto Market</div>
                        <div class="fg-market-value" style="color: ${getColorForFearGreed(crypto.value)}">
                            ${crypto.value}
                        </div>
                        <span class="badge ${getBadgeClassForFearGreed(crypto.label)}">${crypto.label}</span>
                        <div class="gauge-container" style="margin-top: 1rem;">
                            ${createCircularGauge(crypto.value, 0, 100, getColorForFearGreed(crypto.value))}
                        </div>
                    </div>
                </div>

                ${divergence && divergence.isDivergent ? `
                    <div class="divergence-alert">
                        <div class="divergence-alert-title">⚠️ DIVERGENCIA DETECTADA</div>
                        <div class="divergence-alert-text">
                            Diferencia de ${divergence.divergence} puntos entre Stock (${stock.value}) y Crypto (${crypto.value})
                        </div>
                    </div>
                ` : ''}

                ${fearGreedIndex.recommendation ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(45, 66, 99, 0.3); border-radius: 8px; font-size: 0.9rem; line-height: 1.5;">
                        <strong>💡 Recomendación:</strong> ${fearGreedIndex.recommendation}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Pentagon Pizza Index (DEFCON) Section
    if (pentagonPizzaIndex) {
        const defconLevel = parseInt(pentagonPizzaIndex.defconLevel) || 5;
        const status = pentagonPizzaIndex.status || 'UNKNOWN';
        const riskClass = pentagonPizzaIndex.riskClassification || 'NORMAL';
        const geoContext = pentagonPizzaIndex.geopoliticalContext || {};

        html += `
            <div class="index-section">
                <div class="index-section-title">🌍 Defcon Index</div>

                <div class="defcon-indicator">
                    <div class="defcon-level-display defcon-${defconLevel}">
                        <div style="text-align: center;">
                            <div class="defcon-number" style="color: ${getColorForDefcon(defconLevel)}">
                                ${defconLevel}
                            </div>
                            <div class="defcon-status" style="color: ${getColorForDefcon(defconLevel)}">
                                DEFCON ${defconLevel}
                            </div>
                        </div>
                    </div>

                    <div class="defcon-info">
                        <div class="defcon-info-item">
                            <span class="defcon-info-label">Estado:</span>
                            <span class="badge ${status === 'CRITICAL' || status === 'ALERT' ? 'badge-danger' : status === 'OPERATIONAL' ? 'badge-warning' : 'badge-info'}">${status}</span>
                        </div>

                        <div class="defcon-info-item">
                            <span class="defcon-info-label">Clasificación:</span>
                            <span class="badge ${riskClass === 'CRITICAL' ? 'badge-danger' : riskClass === 'ALERT' ? 'badge-warning' : 'badge-info'}">${riskClass}</span>
                        </div>

                        ${geoContext.riskLevel ? `
                            <div class="defcon-info-item">
                                <span class="defcon-info-label">Nivel de Riesgo:</span>
                                <span class="badge ${geoContext.riskLevel === 'CRITICAL' ? 'badge-danger' : geoContext.riskLevel === 'ALERT' ? 'badge-warning' : 'badge-success'}">${geoContext.riskLevel}</span>
                            </div>
                        ` : ''}
                    </div>

                    ${pentagonPizzaIndex.anomalyDetected ? `
                        <div class="divergence-alert">
                            <div class="divergence-alert-title">⚠️ ANOMALÍA DETECTADA</div>
                            ${pentagonPizzaIndex.anomalyDescription ? `
                                <div class="divergence-alert-text">${pentagonPizzaIndex.anomalyDescription}</div>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${pentagonPizzaIndex.recommendation ? `
                        <div style="margin-top: 1rem; padding: 1rem; background: rgba(45, 66, 99, 0.3); border-radius: 8px; font-size: 0.9rem; line-height: 1.5; max-width: 300px; text-align: center;">
                            <strong>💡 Recomendación:</strong> ${pentagonPizzaIndex.recommendation}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;

    // Animar los gauges después de renderizar
    setTimeout(() => animateGauges(), 100);
}

// Helper: Crear medidor circular SVG
function createCircularGauge(value, min, max, color) {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const percentage = ((value - min) / (max - min)) * 100;
    const offset = circumference - (percentage / 100) * circumference;

    return `
        <svg class="gauge-svg" width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
            <circle class="gauge-background" cx="100" cy="100" r="${radius}"></circle>
            <circle
                class="gauge-progress"
                cx="100"
                cy="100"
                r="${radius}"
                stroke="${color}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
                data-value="${value}"
                data-circumference="${circumference}"
            ></circle>
        </svg>
        <div class="gauge-center-text">
            <span class="gauge-value" style="color: ${color}">${value}</span>
        </div>
    `;
}

// Helper: Animar los medidores circulares
function animateGauges() {
    const gauges = document.querySelectorAll('.gauge-progress');
    gauges.forEach(gauge => {
        const circumference = parseFloat(gauge.getAttribute('data-circumference'));
        const value = parseFloat(gauge.getAttribute('data-value'));
        const percentage = value;
        const offset = circumference - (percentage / 100) * circumference;

        // Iniciar desde offset completo (0%)
        gauge.style.strokeDashoffset = circumference;

        // Animar al valor final
        setTimeout(() => {
            gauge.style.strokeDashoffset = offset;
        }, 50);
    });
}

// Helper: Obtener color para Fear & Greed
function getColorForFearGreed(value) {
    if (value <= 25) return '#e74c3c'; // Extreme Fear - rojo
    if (value <= 45) return '#f39c12'; // Fear - naranja
    if (value <= 55) return '#95a5a6'; // Neutral - gris
    if (value <= 75) return '#3498db'; // Greed - azul
    return '#27ae60'; // Extreme Greed - verde
}

// Helper: Obtener clase de badge para Fear & Greed
function getBadgeClassForFearGreed(label) {
    const lower = label.toLowerCase();
    if (lower.includes('extreme fear')) return 'badge-danger';
    if (lower.includes('fear')) return 'badge-warning';
    if (lower.includes('neutral')) return 'badge-info';
    if (lower.includes('greed')) return 'badge-success';
    return 'badge-info';
}

// Helper: Obtener color para DEFCON
function getColorForDefcon(level) {
    switch (level) {
        case 1: return '#e74c3c'; // DEFCON 1 - Critical (rojo)
        case 2: return '#e67e22'; // DEFCON 2 - Alert (naranja oscuro)
        case 3: return '#f39c12'; // DEFCON 3 - Elevated (naranja/amarillo)
        case 4: return '#3498db'; // DEFCON 4 - Normal (azul)
        case 5: return '#27ae60'; // DEFCON 5 - Low (verde)
        default: return '#95a5a6'; // Unknown (gris)
    }
}

// ========== FORMATTING FUNCTIONS ==========

function formatDate(data) {
    // Priorizar data.date, sino usar data._processing.processedAt
    let dateValue = data.date;

    // Si no existe data.date, intentar con _processing.processedAt
    if (!dateValue && data._processing && data._processing.processedAt) {
        dateValue = data._processing.processedAt;

        // Si es un objeto $date, extraer el valor
        if (typeof dateValue === 'object' && dateValue.$date) {
            dateValue = dateValue.$date;
        }
    }

    if (!dateValue) return 'N/A';

    // Intentar parsear con diferentes formatos
    let parsedDate;

    // Si es un string con formato "YYYY-MM-DD HH:mm"
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}\s\d{1,2}:\d{2}$/)) {
        parsedDate = moment(dateValue, 'YYYY-MM-DD HH:mm');
    } else {
        // Intentar parsear automáticamente (timestamps ISO, etc.)
        parsedDate = moment(dateValue);
    }

    // Verificar si la fecha es válida
    if (!parsedDate.isValid()) {
        console.log('Fecha inválida:', dateValue);
        return 'N/A';
    }

    return parsedDate.format('DD/MM/YYYY HH:mm');
}

function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined) return 'N/A';
    return Number(num).toLocaleString('es-CL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatPercent(num, decimals = 2) {
    if (num === null || num === undefined) return 'N/A';
    return `${num >= 0 ? '+' : ''}${formatNumber(num, decimals)}%`;
}

function getBadgeClass(value, type = 'trend') {
    if (type === 'trend') {
        if (value.toLowerCase().includes('alcista') || value.toLowerCase().includes('bullish')) return 'badge-success';
        if (value.toLowerCase().includes('bajista') || value.toLowerCase().includes('bearish')) return 'badge-danger';
        return 'badge-warning';
    }
    if (type === 'strength') {
        if (value.toLowerCase().includes('fuerte') || value.toLowerCase().includes('muy')) return 'badge-danger';
        if (value.toLowerCase().includes('moderado')) return 'badge-warning';
        return 'badge-info';
    }
    return 'badge-info';
}

// ========== SWING ANALYSIS HELPERS ==========

function getSwingPhaseBadge(phase) {
    switch(phase) {
        case 'EARLY_MOMENTUM': return 'badge-success';
        case 'ACCELERATION': return 'badge-success';
        case 'LATE_MOMENTUM': return 'badge-warning';
        case 'EXHAUSTION': return 'badge-danger';
        case 'CONSOLIDATION': return 'badge-info';
        case 'REVERSAL': return 'badge-danger';
        default: return 'badge-info';
    }
}

function formatSwingPhase(phase) {
    const phases = {
        'EARLY_MOMENTUM': 'Momentum Inicial',
        'ACCELERATION': 'Aceleración',
        'LATE_MOMENTUM': 'Momentum Tardío',
        'EXHAUSTION': 'Agotamiento',
        'CONSOLIDATION': 'Consolidación',
        'REVERSAL': 'Reversión'
    };
    return phases[phase] || phase;
}

function formatSwingAction(action) {
    const actions = {
        'ENTER_NOW': 'Entrar Ahora',
        'WAIT_PULLBACK': 'Esperar Retroceso',
        'WAIT_CONFIRMATION': 'Esperar Confirmación',
        'AVOID': 'Evitar Entrada'
    };
    return actions[action] || action;
}

function formatVolumeTrend(trend) {
    const trends = {
        'INCREASING': 'Creciente',
        'DECREASING': 'Decreciente',
        'STABLE': 'Estable'
    };
    return trends[trend] || trend;
}

function formatMomentumStrength(strength) {
    const strengths = {
        'STRONG': 'Fuerte',
        'MODERATE': 'Moderado',
        'WEAK': 'Débil'
    };
    return strengths[strength] || strength;
}

function formatPriceStructure(structure) {
    const structures = {
        'BREAKING_OUT': 'Rompiendo',
        'TRENDING': 'En Tendencia',
        'RANGING': 'En Rango',
        'RETRACING': 'Retrocediendo'
    };
    return structures[structure] || structure;
}

function renderDetail(data) {
    currentData = data;
    const container = document.getElementById('detailContent');

    if (!data || !data.price || !data.instrument) {
        container.innerHTML = '<div class="error-message">Error: Estructura de datos inválida. Por favor revisa la consola.</div>';
        return;
    }

    const priceChangeClass = data.price.change >= 0 ? 'positive' : 'negative';
    const priceChangeSymbol = data.price.change >= 0 ? '▲' : '▼';

    container.innerHTML = `
        <div class="disclaimer">
            <div class="disclaimer-icon">⚠️</div>
            <div class="disclaimer-title">AVISO IMPORTANTE</div>
            <div class="disclaimer-text">
                Esta aplicación <strong>NO entrega consejos de inversión</strong>. Los análisis presentados son únicamente con fines educativos y de estudio de valores. Las decisiones de inversión son responsabilidad exclusiva del usuario. Consulte siempre con un asesor financiero profesional antes de tomar decisiones de inversión.
            </div>
        </div>

        <div class="price-header">
            <div class="instrument-info">
                <h1>${data.instrument.emoji || ''} ${data.instrument.symbol}</h1>
                <p>${data.instrument.name} | ${data.instrument.timeframe}</p>
            </div>
            <div class="price-display">
                <div class="current-price">${formatNumber(data.price.current, 3)}</div>
                <div class="price-change ${priceChangeClass}">
                    ${priceChangeSymbol} ${formatNumber(data.price.change, 2)} (${formatPercent(data.price.changePercent)})
                </div>
            </div>
        </div>

        <div class="summary-box" style="margin-bottom: 1.5rem;">
            <h3>📋 Resumen Ejecutivo</h3>
            <p><strong>Situación Actual:</strong> ${data.summary.currentSituation}</p>
            <p><strong>Contexto Macro:</strong> ${data.summary.macroContext}</p>
            <p><strong>Recomendación:</strong> ${data.summary.mainRecommendation}</p>
            <p><strong>Niveles Clave:</strong> ${data.summary.keyLevels}</p>

            ${data.fearGreedContext ? `
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.2);">
                    <p style="font-weight: 600; color: var(--accent); margin-bottom: 0.75rem;">📊 Contexto Fear & Greed</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
                        <div>
                            <span style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">Stock Market:</span>
                            <div style="margin-top: 0.25rem;">
                                <span class="badge ${data.fearGreedContext.stockLabel === 'Fear' || data.fearGreedContext.stockLabel === 'Extreme Fear' ? 'badge-danger' : data.fearGreedContext.stockLabel === 'Greed' || data.fearGreedContext.stockLabel === 'Extreme Greed' ? 'badge-success' : 'badge-warning'}">${data.fearGreedContext.stockLabel}</span>
                                <span style="margin-left: 0.5rem; font-weight: bold;">${data.fearGreedContext.stockValue}</span>
                            </div>
                        </div>
                        <div>
                            <span style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">Crypto Market:</span>
                            <div style="margin-top: 0.25rem;">
                                <span class="badge ${data.fearGreedContext.cryptoLabel === 'Fear' || data.fearGreedContext.cryptoLabel === 'Extreme Fear' ? 'badge-danger' : data.fearGreedContext.cryptoLabel === 'Greed' || data.fearGreedContext.cryptoLabel === 'Extreme Greed' ? 'badge-success' : 'badge-warning'}">${data.fearGreedContext.cryptoLabel}</span>
                                <span style="margin-left: 0.5rem; font-weight: bold;">${data.fearGreedContext.cryptoValue}</span>
                            </div>
                        </div>
                    </div>
                    <p style="font-size: 0.9rem; color: rgba(255,255,255,0.8); line-height: 1.5;">
                        <strong>Impacto:</strong>
                        <span class="badge ${data.fearGreedContext.sentimentImpact === 'BULLISH' ? 'badge-success' : data.fearGreedContext.sentimentImpact === 'BEARISH' ? 'badge-danger' : 'badge-warning'}" style="margin-left: 0.25rem;">${data.fearGreedContext.sentimentImpact}</span>
                    </p>
                    ${data.fearGreedContext.divergenceDetected ? `
                        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.8); margin-top: 0.5rem;">
                            <strong>⚠️ Divergencia:</strong> ${data.fearGreedContext.divergenceDescription}
                        </p>
                    ` : `
                        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); margin-top: 0.5rem;">
                            ${data.fearGreedContext.divergenceDescription}
                        </p>
                    `}
                </div>
            ` : ''}

            ${data.geopoliticalContext ? `
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.2);">
                    <p style="font-weight: 600; color: var(--accent); margin-bottom: 0.75rem;">🌍 Contexto Geopolítico</p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin-bottom: 0.75rem;">
                        <div>
                            <span style="color: rgba(255,255,255,0.7); font-size: 0.85rem;">DEFCON</span>
                            <div style="margin-top: 0.25rem;">
                                <span style="font-size: 1.5rem; font-weight: bold; color: ${data.geopoliticalContext.defconLevel <= 2 ? 'var(--danger)' : data.geopoliticalContext.defconLevel === 3 ? 'var(--warning)' : 'var(--success)'};">${data.geopoliticalContext.defconLevel}</span>
                                <span class="badge ${data.geopoliticalContext.defconStatus === 'CRITICAL' || data.geopoliticalContext.defconStatus === 'ALERT' ? 'badge-danger' : 'badge-warning'}" style="margin-left: 0.5rem; font-size: 0.75rem;">${data.geopoliticalContext.defconStatus}</span>
                            </div>
                        </div>
                        <div>
                            <span style="color: rgba(255,255,255,0.7); font-size: 0.85rem;">Riesgo</span>
                            <div style="margin-top: 0.25rem;">
                                <span class="badge ${data.geopoliticalContext.riskClassification === 'CRITICAL' ? 'badge-danger' : data.geopoliticalContext.riskClassification === 'ELEVATED' ? 'badge-warning' : 'badge-info'}">${data.geopoliticalContext.riskClassification}</span>
                            </div>
                        </div>
                        <div>
                            <span style="color: rgba(255,255,255,0.7); font-size: 0.85rem;">Impacto</span>
                            <div style="margin-top: 0.25rem;">
                                <span class="badge ${data.geopoliticalContext.geopoliticalImpact === 'BULLISH' ? 'badge-success' : data.geopoliticalContext.geopoliticalImpact === 'BEARISH' ? 'badge-danger' : 'badge-warning'}">${data.geopoliticalContext.geopoliticalImpact}</span>
                            </div>
                        </div>
                    </div>
                    <p style="font-size: 0.9rem; color: rgba(255,255,255,0.8); line-height: 1.5;">
                        <strong>${data.geopoliticalContext.confluentWithTechnicals ? '✓' : '⚠️'} Análisis Técnico:</strong> ${data.geopoliticalContext.confluentWithTechnicals ? 'Confluente' : 'Divergente'}
                    </p>
                    <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); margin-top: 0.5rem; line-height: 1.5;">
                        ${data.geopoliticalContext.riskAssessment}
                    </p>
                </div>
            ` : ''}
        </div>

        <div class="section trade-setup" style="margin-bottom: 1.5rem;">
            <h2>🎯 Escenario Principal</h2>
            <div class="scenario-header">
                <span class="badge badge-${data.analysis.mainScenario.direction === 'LONG' ? 'success' : 'danger'}">${data.analysis.mainScenario.direction}</span>
                <span class="probability">${data.analysis.mainScenario.probability}% probabilidad</span>
            </div>
            <div class="metric">
                <span class="metric-label">Entrada</span>
                <span class="metric-value">${formatNumber(data.analysis.mainScenario.entry, 3)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Stop Loss</span>
                <span class="metric-value">${formatNumber(data.analysis.mainScenario.stopLoss, 3)}</span>
            </div>
            <div class="targets">
                <strong>Objetivos:</strong>
                ${data.analysis.mainScenario.targets.map(t => `
                    <div class="target-item">
                        <span>${formatNumber(t.level, 3)} - ${t.description}</span>
                        <span class="badge badge-success">${t.rr}</span>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
                <strong>Razonamiento:</strong><br>
                <span style="color: rgba(255,255,255,0.8);">${data.analysis.mainScenario.reasoning}</span>
            </div>
        </div>

        ${data.analysis.alternativeScenario ? `
            <div class="section" style="margin-bottom: 1.5rem;">
                <h2>🔄 Escenario Alternativo</h2>
                <div class="scenario-header">
                    <span class="badge badge-${data.analysis.alternativeScenario.direction === 'LONG' ? 'success' : 'danger'}">${data.analysis.alternativeScenario.direction}</span>
                    <span class="probability">${data.analysis.alternativeScenario.probability}% probabilidad</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Condición</span>
                    <span class="metric-value">${data.analysis.alternativeScenario.condition}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Entrada</span>
                    <span class="metric-value">${formatNumber(data.analysis.alternativeScenario.entry, 3)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Stop Loss</span>
                    <span class="metric-value">${formatNumber(data.analysis.alternativeScenario.stopLoss, 3)}</span>
                </div>
                <div class="targets">
                    <strong>Objetivos:</strong>
                    ${data.analysis.alternativeScenario.targets.map(t => `
                        <div class="target-item">
                            <span>${formatNumber(t.level, 3)} - ${t.description}</span>
                            <span class="badge badge-success">${t.rr}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        ${data.swingAnalysis ? `
            <div class="section" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(45, 66, 99, 0.3) 100%); border: 2px solid rgba(147, 51, 234, 0.4);">
                <h2>📈 Análisis de Swing</h2>

                <div class="metric">
                    <span class="metric-label">Fase del Swing</span>
                    <span class="badge ${getSwingPhaseBadge(data.swingAnalysis.phase)}">${formatSwingPhase(data.swingAnalysis.phase)}</span>
                </div>

                <div class="metric">
                    <span class="metric-label">Calidad de Entrada</span>
                    <span class="badge ${data.swingAnalysis.entryQuality === 'EXCELLENT' ? 'badge-success' : data.swingAnalysis.entryQuality === 'GOOD' ? 'badge-info' : data.swingAnalysis.entryQuality === 'FAIR' ? 'badge-warning' : 'badge-danger'}">${data.swingAnalysis.entryQuality}</span>
                </div>

                ${data.swingAnalysis.swingMetrics ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                        <strong style="color: var(--accent); margin-bottom: 0.75rem; display: block;">📊 Métricas del Swing</strong>

                        <div class="metric">
                            <span class="metric-label">Desde Swing Low</span>
                            <span class="metric-value" style="color: var(--success);">${formatPercent(data.swingAnalysis.swingMetrics.percentFromSwingLow, 1)}</span>
                        </div>

                        <div class="metric">
                            <span class="metric-label">Hasta Swing High</span>
                            <span class="metric-value" style="color: var(--danger);">${formatPercent(data.swingAnalysis.swingMetrics.percentFromSwingHigh, 1)}</span>
                        </div>

                        <div class="metric">
                            <span class="metric-label">Rango del Swing</span>
                            <span class="metric-value">${formatNumber(data.swingAnalysis.swingMetrics.swingRange, 2)}</span>
                        </div>

                        <div class="metric">
                            <span class="metric-label">Posición Actual</span>
                            <span class="metric-value">${data.swingAnalysis.swingMetrics.currentPositionInSwing}</span>
                        </div>
                    </div>
                ` : ''}

                ${data.swingAnalysis.entryRecommendation ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(147, 51, 234, 0.15); border-left: 4px solid rgba(147, 51, 234, 0.6); border-radius: 5px;">
                        <strong style="color: rgba(147, 51, 234, 1); margin-bottom: 0.75rem; display: block;">💡 Recomendación de Entrada</strong>

                        <div class="metric">
                            <span class="metric-label">Acción</span>
                            <span class="badge ${data.swingAnalysis.entryRecommendation.action === 'ENTER_NOW' ? 'badge-success' : data.swingAnalysis.entryRecommendation.action === 'WAIT_PULLBACK' ? 'badge-warning' : 'badge-danger'}">${formatSwingAction(data.swingAnalysis.entryRecommendation.action)}</span>
                        </div>

                        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.9); margin: 0.75rem 0; line-height: 1.5;">
                            ${data.swingAnalysis.entryRecommendation.reasoning}
                        </p>

                        <div class="metric">
                            <span class="metric-label">Entrada Ideal</span>
                            <span class="metric-value" style="color: var(--accent);">${formatNumber(data.swingAnalysis.entryRecommendation.idealEntry, 3)}</span>
                        </div>

                        <div class="metric">
                            <span class="metric-label">Stop Loss</span>
                            <span class="metric-value" style="color: var(--danger);">${formatNumber(data.swingAnalysis.entryRecommendation.stopLoss, 3)}</span>
                        </div>

                        <div class="metric">
                            <span class="metric-label">Take Profit</span>
                            <span class="metric-value" style="color: var(--success);">${formatNumber(data.swingAnalysis.entryRecommendation.takeProfit, 3)}</span>
                        </div>

                        <div class="metric">
                            <span class="metric-label">Risk/Reward</span>
                            <span class="badge badge-info">${data.swingAnalysis.entryRecommendation.riskRewardRatio}:1</span>
                        </div>
                    </div>
                ` : ''}

                ${data.swingAnalysis.phaseIndicators ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                        <strong style="color: var(--accent); margin-bottom: 0.75rem; display: block;">🔍 Indicadores de Fase</strong>

                        <div class="metric">
                            <span class="metric-label">Tendencia de Volumen</span>
                            <span class="badge ${data.swingAnalysis.phaseIndicators.volumeTrend === 'INCREASING' ? 'badge-success' : data.swingAnalysis.phaseIndicators.volumeTrend === 'DECREASING' ? 'badge-danger' : 'badge-warning'}">${formatVolumeTrend(data.swingAnalysis.phaseIndicators.volumeTrend)}</span>
                        </div>

                        <div class="metric">
                            <span class="metric-label">Fuerza del Momentum</span>
                            <span class="badge ${data.swingAnalysis.phaseIndicators.momentumStrength === 'STRONG' ? 'badge-success' : data.swingAnalysis.phaseIndicators.momentumStrength === 'MODERATE' ? 'badge-warning' : 'badge-danger'}">${formatMomentumStrength(data.swingAnalysis.phaseIndicators.momentumStrength)}</span>
                        </div>

                        <div class="metric">
                            <span class="metric-label">Estructura de Precio</span>
                            <span class="badge badge-info">${formatPriceStructure(data.swingAnalysis.phaseIndicators.priceStructure)}</span>
                        </div>

                        <div class="metric">
                            <span class="metric-label">Divergencia</span>
                            <span class="badge ${data.swingAnalysis.phaseIndicators.divergencePresent ? 'badge-warning' : 'badge-success'}">${data.swingAnalysis.phaseIndicators.divergencePresent ? 'Presente' : 'No detectada'}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        ` : ''}

        <div class="grid">
            <div class="section">
                <h2>🔺 Resistencias</h2>
                ${data.levels.resistances.map(r => `
                    <div class="level-item">
                        <div>
                            <strong>${formatNumber(r.level, 3)}</strong>
                            <div class="level-type">${r.type}</div>
                        </div>
                        <span class="badge ${getBadgeClass(r.strength, 'strength')}">${r.strength}</span>
                    </div>
                `).join('')}
            </div>

            <div class="section">
                <h2>🔻 Soportes</h2>
                ${data.levels.supports.map(s => `
                    <div class="level-item">
                        <div>
                            <strong>${formatNumber(s.level, 3)}</strong>
                            <div class="level-type">${s.type}</div>
                        </div>
                        <span class="badge ${getBadgeClass(s.strength, 'strength')}">${s.strength}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="grid">
            <div class="section">
                <h2>📊 Tendencia Multi-Temporal</h2>
                <div class="metric">
                    <span class="metric-label">Superior</span>
                    <span class="badge ${getBadgeClass(data.trend.multiTimeframe.superior)}">${data.trend.multiTimeframe.superior}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Actual</span>
                    <span class="badge ${getBadgeClass(data.trend.multiTimeframe.actual)}">${data.trend.multiTimeframe.actual}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Inferior</span>
                    <span class="badge ${getBadgeClass(data.trend.multiTimeframe.inferior)}">${data.trend.multiTimeframe.inferior}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Confluencia</span>
                    <span class="metric-value">${data.trend.multiTimeframe.confluence}</span>
                </div>
            </div>

            <div class="section">
                <h2>📈 Medias Móviles (EMA)</h2>
                <div class="metric">
                    <span class="metric-label">EMA 9</span>
                    <span class="metric-value">${formatNumber(data.trend.emas.ema9.value, 3)} (${formatPercent(data.trend.emas.ema9.distance)})</span>
                </div>
                <div class="metric">
                    <span class="metric-label">EMA 21</span>
                    <span class="metric-value">${formatNumber(data.trend.emas.ema21.value, 3)} (${formatPercent(data.trend.emas.ema21.distance)})</span>
                </div>
                ${data.trend.emas.ema30 ? `
                    <div class="metric">
                        <span class="metric-label">EMA 30</span>
                        <span class="metric-value">${formatNumber(data.trend.emas.ema30.value, 3)} (${formatPercent(data.trend.emas.ema30.distance)})</span>
                    </div>
                ` : ''}
                <div class="metric">
                    <span class="metric-label">EMA 50</span>
                    <span class="metric-value">${formatNumber(data.trend.emas.ema50.value, 3)} (${formatPercent(data.trend.emas.ema50.distance)})</span>
                </div>
                ${data.trend.emas.ema200 ? `
                    <div class="metric">
                        <span class="metric-label">EMA 200</span>
                        <span class="metric-value">${formatNumber(data.trend.emas.ema200.value, 3)} (${formatPercent(data.trend.emas.ema200.distance)})</span>
                    </div>
                ` : ''}
                <div class="metric">
                    <span class="metric-label">Alineación</span>
                    <span class="badge ${getBadgeClass(data.trend.emas.alignment)}">${data.trend.emas.alignment}</span>
                </div>
            </div>
        </div>

        <div class="grid">
            <div class="section">
                <h2>📉 Indicadores Técnicos</h2>
                <div class="metric">
                    <span class="metric-label">RSI</span>
                    <span class="metric-value">${formatNumber(data.indicators.momentum.rsi)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">SRSI K/D</span>
                    <span class="metric-value">${formatNumber(data.indicators.srsi.k)} / ${formatNumber(data.indicators.srsi.d)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">MACD</span>
                    <span class="metric-value">${formatNumber(data.indicators.macd.histogram)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">ADX</span>
                    <span class="metric-value">${formatNumber(data.indicators.momentum.adx)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Fuerza Tendencia</span>
                    <span class="badge ${getBadgeClass(data.indicators.momentum.trendStrength, 'strength')}">${data.indicators.momentum.trendStrength}</span>
                </div>
            </div>

            <div class="section">
                <h2>🌍 Correlaciones Macro</h2>
                <div class="metric">
                    <span class="metric-label">DXY</span>
                    <span class="metric-value">${formatNumber(data.correlations.dxy.value)}
                        <span class="badge ${getBadgeClass(data.correlations.dxy.trend)}">${data.correlations.dxy.impact}</span>
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Yields 10Y</span>
                    <span class="metric-value">${formatNumber(data.correlations.yields10y.value)}%
                        <span class="badge ${getBadgeClass(data.correlations.yields10y.trend)}">${data.correlations.yields10y.impact}</span>
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">VIX</span>
                    <span class="metric-value">${formatNumber(data.correlations.vix.value)}
                        <span class="badge ${getBadgeClass(data.correlations.vix.trend)}">${data.correlations.vix.impact}</span>
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">${data.correlations.other.name}</span>
                    <span class="metric-value">${formatNumber(data.correlations.other.value, 3)}
                        <span class="badge ${getBadgeClass(data.correlations.other.trend)}">${data.correlations.other.impact}</span>
                    </span>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>⚠️ Gestión de Riesgo</h2>
            <div class="metric">
                <span class="metric-label">Tamaño de Posición</span>
                <span class="metric-value">${data.riskManagement.positionSize}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Invalidación Long</span>
                <span class="metric-value">${data.riskManagement.invalidationLong}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Invalidación Short</span>
                <span class="metric-value">${data.riskManagement.invalidationShort}</span>
            </div>
            ${data.riskManagement.specialRisks.length > 0 ? `
                <div style="margin-top: 1rem;">
                    <strong>Riesgos Especiales:</strong>
                    <ul style="margin-left: 1.5rem; margin-top: 0.5rem; line-height: 1.8;">
                        ${data.riskManagement.specialRisks.map(risk => `<li>${risk}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>

        <div class="metric" style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 5px; margin-top: 1rem;">
            <span class="metric-label">Análisis generado</span>
            <span class="metric-value">${formatDate(data)}</span>
        </div>
    `;
}

// ========== FILTER FUNCTIONS ==========

async function filterByConfidence(minConfidence) {
    // Mostrar spinner mientras carga
    document.getElementById('resultsGrid').innerHTML = '<div class="spinner"></div>';

    // Hacer nueva llamada a la API con el filtro
    const opportunities = await fetchBestOpportunities(minConfidence);
    renderBestOpportunities(opportunities, minConfidence);
}

// ========== NAVIGATION FUNCTIONS ==========

function showView(viewId) {
    // Hide all views
    document.getElementById('splash').style.display = 'none';
    document.getElementById('typesView').style.display = 'none';
    document.getElementById('symbolsView').style.display = 'none';
    document.getElementById('resultsView').style.display = 'none';
    document.getElementById('detailView').style.display = 'none';

    // Show requested view
    document.getElementById(viewId).style.display = 'block';

    // Show header when not in splash screen
    const header = document.querySelector('.header');
    if (viewId === 'splash') {
        header.classList.remove('visible');
    } else {
        header.classList.add('visible');
    }

    // Update back button visibility
    const backBtn = document.querySelector('.back-btn');
    backBtn.style.display = viewId === 'typesView' ? 'none' : 'block';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showSymbolTypes() {
    showView('typesView');
    document.getElementById('typesGrid').innerHTML = '<div class="spinner"></div>';

    // Cargar tipos de símbolos e índices de mercado en paralelo
    const [types, marketIndexes] = await Promise.all([
        fetchSymbolTypes(),
        fetchMarketIndexes()
    ]);

    renderSymbolTypes(types);
    renderMarketIndexes(marketIndexes);
}

async function showSymbolsByType(typeCode, typeName, typeColor, typeIcon) {
    navigationHistory.push({ view: 'typesView' });
    showView('symbolsView');
    document.getElementById('symbolsGrid').innerHTML = '<div class="spinner"></div>';
    const symbols = await fetchSymbolsByType(typeCode);
    renderSymbols(symbols, typeName, typeColor, typeIcon);
}

async function showSymbolResults(symbolCode, symbolName, symbolColor, symbolIcon) {
    navigationHistory.push({ view: 'symbolsView' });
    showView('resultsView');
    document.getElementById('resultsGrid').innerHTML = '<div class="spinner"></div>';
    const results = await fetchSymbolResults(symbolCode);
    renderResults(results, symbolName, symbolColor, symbolIcon);
}

async function showBestOpportunities() {
    navigationHistory.push({ view: 'typesView' });
    showView('resultsView');
    document.getElementById('resultsGrid').innerHTML = '<div class="spinner"></div>';
    const opportunities = await fetchBestOpportunities(65);
    renderBestOpportunities(opportunities, 65);
}

async function showDetail(id) {
    navigationHistory.push({ view: 'resultsView' });
    showView('detailView');
    document.getElementById('detailContent').innerHTML = '<div class="spinner"></div>';
    const data = await fetchSymbolDetail(id);
    renderDetail(data);
}

function goBack() {
    if (navigationHistory.length > 0) {
        const previous = navigationHistory.pop();
        showView(previous.view);
    } else {
        showSymbolTypes();
    }
}

// ========== GESTURE NAVIGATION ==========

let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;

function handleGesture() {
    const swipeThreshold = 50; // Mínimo de píxeles para considerar un swipe
    const horizontalSwipe = Math.abs(touchEndX - touchStartX);
    const verticalSwipe = Math.abs(touchEndY - touchStartY);

    // Solo procesar si el swipe horizontal es mayor que el vertical (evitar conflictos con scroll)
    if (horizontalSwipe > verticalSwipe && horizontalSwipe > swipeThreshold) {
        // Swipe derecha (volver atrás)
        if (touchEndX > touchStartX) {
            console.log('[Gesture] Swipe derecha detectado - Volver atrás');
            goBack();
        }
    }
}

// Touch events para móviles y tablets
document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleGesture();
}, { passive: true });

// Mouse events para trackpads y gestos de ratón
let mouseStartX = 0;
let mouseStartY = 0;
let isMouseDown = false;

document.addEventListener('mousedown', e => {
    // Solo activar en el borde izquierdo de la pantalla (primeros 50px)
    if (e.clientX < 50) {
        isMouseDown = true;
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
    }
});

document.addEventListener('mousemove', e => {
    if (isMouseDown) {
        const deltaX = e.clientX - mouseStartX;
        const deltaY = Math.abs(e.clientY - mouseStartY);

        // Si el movimiento horizontal es significativo y mayor que el vertical
        if (deltaX > 100 && deltaX > deltaY) {
            console.log('[Gesture] Mouse drag derecha detectado - Volver atrás');
            isMouseDown = false;
            goBack();
        }
    }
});

document.addEventListener('mouseup', () => {
    isMouseDown = false;
});

// Soporte para gestos de trackpad (wheel con deltaX)
let lastWheelTime = 0;
const wheelThrottle = 500; // Tiempo mínimo entre gestos de wheel

document.addEventListener('wheel', e => {
    const now = Date.now();

    // Solo procesar swipes horizontales significativos
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 50) {
        // Throttle para evitar múltiples activaciones
        if (now - lastWheelTime > wheelThrottle) {
            lastWheelTime = now;

            // Swipe derecha en trackpad (deltaX negativo)
            if (e.deltaX < -50) {
                console.log('[Gesture] Trackpad swipe derecha detectado - Volver atrás');
                goBack();
            }
        }
    }
}, { passive: true });

// Atajos de teclado adicionales
document.addEventListener('keydown', e => {
    // Alt/Option + Flecha Izquierda = Volver
    if ((e.altKey || e.metaKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        console.log('[Gesture] Atajo de teclado detectado - Volver atrás');
        goBack();
    }

    // Escape = Volver
    if (e.key === 'Escape') {
        e.preventDefault();
        console.log('[Gesture] Tecla Escape detectada - Volver atrás');
        goBack();
    }
});

// ========== VERSION CHECK & CACHE MANAGEMENT ==========

function checkVersion() {
    const storedVersion = localStorage.getItem('app_version');

    if (storedVersion !== APP_VERSION) {
        console.log(`[Version] Actualización detectada: ${storedVersion} -> ${APP_VERSION}`);

        // Limpiar localStorage (excepto configuraciones importantes)
        const keysToPreserve = ['user_preferences']; // Agrega aquí claves que quieras preservar
        const preservedData = {};
        keysToPreserve.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) preservedData[key] = value;
        });

        localStorage.clear();

        // Restaurar datos preservados
        Object.keys(preservedData).forEach(key => {
            localStorage.setItem(key, preservedData[key]);
        });

        // Guardar nueva versión
        localStorage.setItem('app_version', APP_VERSION);

        // Limpiar caché del navegador (Storage API)
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    if (!name.includes(APP_VERSION)) {
                        console.log('[Cache] Eliminando caché antigua:', name);
                        caches.delete(name);
                    }
                });
            });
        }

        console.log('[Version] Caché limpiado, nueva versión:', APP_VERSION);

        // Mostrar notificación al usuario
        return true; // Nueva versión
    }

    return false; // Misma versión
}

// ========== INITIALIZATION ==========

async function init() {
    // Verificar versión y limpiar caché si es necesario
    const isNewVersion = checkVersion();

    if (isNewVersion) {
        console.log('[Init] Nueva versión detectada, recargando en 2 segundos...');
        // Opcional: recargar la página para asegurar que todo está actualizado
        setTimeout(() => {
            window.location.reload(true);
        }, 2000);
        return;
    }

    // Show splash screen
    showView('splash');

    // Wait for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Load symbol types
    await showSymbolTypes();

    // Register service worker con manejo de actualizaciones
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('[SW] Service Worker registrado');

            // Detectar actualizaciones del service worker
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('[SW] Actualización encontrada');

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated') {
                        console.log('[SW] Nuevo service worker activado');
                        // Opcional: notificar al usuario que hay una nueva versión
                        // y ofrecerle recargar la página
                    }
                });
            });

            // Verificar si hay actualizaciones cada 5 minutos
            setInterval(() => {
                registration.update();
            }, 5 * 60 * 1000);

        } catch (error) {
            console.log('[SW] Error al registrar Service Worker:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
