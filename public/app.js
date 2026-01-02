const API_BASE_URL = 'https://ffmzs9evxj.execute-api.us-east-1.amazonaws.com/dev';
let currentData = null;
let navigationHistory = [];

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

async function fetchBestOpportunities() {
    try {
        const response = await fetch(`${API_BASE_URL}/list/symbol/results/confidence`);
        if (!response.ok) throw new Error('Error al cargar mejores oportunidades');
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('Error:', error);
        return [];
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
            <div class="result-name">${result.instrument.name}</div>
            <div class="result-type">${result.instrument.assetType}</div>
            <div class="result-date">📅 ${formatDate(result)}</div>
        </div>
    `).join('');
}

function renderBestOpportunities(opportunities) {
    const container = document.getElementById('resultsGrid');
    const header = document.getElementById('resultsHeader');

    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="type-icon-large" style="background: #ff660020; color: #ff6600">
                🔥
            </div>
            <div>
                <h1>Mejores Oportunidades</h1>
                <p>Análisis con mayor nivel de confianza - Ordenados por probabilidad</p>
            </div>
        </div>
    `;

    // Ordenar por confianza descendente
    const sortedOpportunities = [...opportunities].sort((a, b) => b.analysis.confidence - a.analysis.confidence);

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
                <div class="opportunity-name">${opp.instrument.name}</div>
                <div class="opportunity-details">
                    <span class="badge ${directionClass}">${opp.analysis.mainScenario.direction}</span>
                    <span class="badge ${biasClass}">${opp.analysis.bias}</span>
                    <span class="result-timeframe">${opp.instrument.timeframe}</span>
                </div>
                <div class="opportunity-type">${opp.instrument.assetType}</div>
                <div class="opportunity-date">📅 ${formatDate(opp)}</div>
            </div>
        `;
    }).join('');
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
        <div class="price-header">
            <div class="instrument-info">
                <h1>${data.instrument.symbol}</h1>
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

    // Update back button visibility
    const backBtn = document.querySelector('.back-btn');
    backBtn.style.display = viewId === 'typesView' ? 'none' : 'block';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showSymbolTypes() {
    showView('typesView');
    document.getElementById('typesGrid').innerHTML = '<div class="spinner"></div>';
    const types = await fetchSymbolTypes();
    renderSymbolTypes(types);
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
    const opportunities = await fetchBestOpportunities();
    renderBestOpportunities(opportunities);
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

// ========== INITIALIZATION ==========

async function init() {
    // Show splash screen
    showView('splash');

    // Wait for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Load symbol types
    await showSymbolTypes();

    // Register service worker
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker registrado');
        } catch (error) {
            console.log('Error al registrar Service Worker:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
