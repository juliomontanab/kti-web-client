const API_BASE_URL = 'https://ffmzs9evxj.execute-api.us-east-1.amazonaws.com/dev';
const WS_URL = 'wss://d9ndopwfif.execute-api.us-east-1.amazonaws.com/dev';
const APP_VERSION = '1.7.1'; // Incrementa esta versión en cada actualización

let currentData = null;
let navigationHistory = [];
let currentOpportunities = [];
let currentConfidenceFilter = null;
let ws = null;
let wsReconnectInterval = null;
let realtimePrices = {};

// ========== UTILITY FUNCTIONS ==========

// Sistema de íconos Lucide para símbolos de trading
const TRADING_ICONS = {
    // Por tipo de activo / categoría
    types: {
        'PRECIOUS_METALS': { icon: 'gem', color: '#FFD700' },
        'METALS': { icon: 'gem', color: '#FFD700' },
        'COMMODITIES': { icon: 'package', color: '#CD853F' },
        'CRYPTO': { icon: 'bitcoin', color: '#F7931A' },
        'CRYPTOCURRENCY': { icon: 'bitcoin', color: '#F7931A' },
        'FOREX': { icon: 'currency', color: '#4CAF50' },
        'CURRENCIES': { icon: 'currency', color: '#4CAF50' },
        'STOCKS': { icon: 'building-2', color: '#2196F3' },
        'INDICES': { icon: 'bar-chart-3', color: '#9C27B0' },
        'INDEX': { icon: 'bar-chart-3', color: '#9C27B0' },
        'ENERGY': { icon: 'fuel', color: '#FF5722' },
        'AGRICULTURE': { icon: 'wheat', color: '#8BC34A' },
        'BONDS': { icon: 'file-text', color: '#607D8B' },
        'ETF': { icon: 'layers', color: '#00BCD4' },
    },
    // Por símbolo específico
    symbols: {
        // Metales preciosos
        'GOLD': { icon: 'circle-dollar-sign', color: '#FFD700' },
        'XAUUSD': { icon: 'circle-dollar-sign', color: '#FFD700' },
        'SILVER': { icon: 'coins', color: '#C0C0C0' },
        'XAGUSD': { icon: 'coins', color: '#C0C0C0' },
        'PLATINUM': { icon: 'gem', color: '#E5E4E2' },
        'PALLADIUM': { icon: 'gem', color: '#CED0DD' },
        'COPPER': { icon: 'circle', color: '#B87333' },
        // Crypto
        'BTC': { icon: 'bitcoin', color: '#F7931A' },
        'BTCUSD': { icon: 'bitcoin', color: '#F7931A' },
        'BTCUSDT': { icon: 'bitcoin', color: '#F7931A' },
        'ETH': { icon: 'hexagon', color: '#627EEA' },
        'ETHUSD': { icon: 'hexagon', color: '#627EEA' },
        'ETHUSDT': { icon: 'hexagon', color: '#627EEA' },
        'SOL': { icon: 'sun', color: '#9945FF' },
        'SOLUSD': { icon: 'sun', color: '#9945FF' },
        'XRP': { icon: 'droplet', color: '#23292F' },
        'ADA': { icon: 'flower-2', color: '#0033AD' },
        'DOGE': { icon: 'dog', color: '#C2A633' },
        'DOT': { icon: 'circle-dot', color: '#E6007A' },
        'AVAX': { icon: 'mountain', color: '#E84142' },
        'LINK': { icon: 'link', color: '#2A5ADA' },
        'MATIC': { icon: 'pentagon', color: '#8247E5' },
        'UNI': { icon: 'sparkles', color: '#FF007A' },
        // Índices
        'SPX': { icon: 'trending-up', color: '#1E88E5' },
        'SPX500': { icon: 'trending-up', color: '#1E88E5' },
        'US500': { icon: 'trending-up', color: '#1E88E5' },
        'NDX': { icon: 'cpu', color: '#00C853' },
        'NASDAQ': { icon: 'cpu', color: '#00C853' },
        'US100': { icon: 'cpu', color: '#00C853' },
        'DJI': { icon: 'building', color: '#1565C0' },
        'US30': { icon: 'building', color: '#1565C0' },
        'VIX': { icon: 'activity', color: '#FF5722' },
        'DAX': { icon: 'landmark', color: '#FFEB3B' },
        'FTSE': { icon: 'landmark', color: '#C62828' },
        // Forex
        'EURUSD': { icon: 'euro', color: '#003399' },
        'GBPUSD': { icon: 'pound-sterling', color: '#C8102E' },
        'USDJPY': { icon: 'yen', color: '#BC002D' },
        'DXY': { icon: 'dollar-sign', color: '#85BB65' },
        // Energía
        'OIL': { icon: 'droplets', color: '#1A1A1A' },
        'CRUDE': { icon: 'droplets', color: '#1A1A1A' },
        'WTI': { icon: 'droplets', color: '#1A1A1A' },
        'BRENT': { icon: 'droplets', color: '#2E7D32' },
        'NATGAS': { icon: 'flame', color: '#FF9800' },
    },
    // Ícono por defecto
    default: { icon: 'circle', color: '#9E9E9E' }
};

// Función para obtener el ícono Lucide de un símbolo
function getTradingIcon(symbolCode, type, size = 24) {
    const code = (symbolCode || '').toUpperCase();
    const typeCode = (type || '').toUpperCase().replace(/\s+/g, '_');

    // Primero buscar por símbolo específico
    let iconConfig = TRADING_ICONS.symbols[code];

    // Si no existe, buscar por tipo
    if (!iconConfig && typeCode) {
        iconConfig = TRADING_ICONS.types[typeCode];
    }

    // Si aún no existe, usar default
    if (!iconConfig) {
        iconConfig = TRADING_ICONS.default;
    }

    return `<i data-lucide="${iconConfig.icon}" style="width:${size}px;height:${size}px;color:${iconConfig.color};"></i>`;
}

// Función para obtener solo la configuración del ícono (sin HTML)
function getTradingIconConfig(symbolCode, type) {
    const code = (symbolCode || '').toUpperCase();
    const typeCode = (type || '').toUpperCase().replace(/\s+/g, '_');

    let iconConfig = TRADING_ICONS.symbols[code];
    if (!iconConfig && typeCode) {
        iconConfig = TRADING_ICONS.types[typeCode];
    }
    if (!iconConfig) {
        iconConfig = TRADING_ICONS.default;
    }

    return iconConfig;
}

// Mapeo de códigos WebSocket a símbolos de trading
const SYMBOL_MAP = {
    'GOLD': 'GOLD',
    'SILVER': 'SILVER',
    'COPPER': 'COPPER',
    'PLATINUM': 'PLATINUM',
    'PALLADIUM': 'PALLADIUM'
};

// Función para obtener el código de un análisis
function getAnalysisCode(analysis) {
    // Intentar extraer el código del símbolo (ej: XAUUSD -> GOLD)
    const symbol = analysis.instrument?.symbol;
    if (!symbol) return null;

    // Mapeo de símbolos a códigos
    if (symbol.includes('XAU')) return 'GOLD';
    if (symbol.includes('XAG')) return 'SILVER';
    if (symbol.includes('XCU')) return 'COPPER';
    if (symbol.includes('XPT')) return 'PLATINUM';
    if (symbol.includes('XPD')) return 'PALLADIUM';

    return null;
}

function toggleCollapse(elementId) {
    const content = document.getElementById(elementId);
    const icon = document.getElementById(`${elementId}-icon`);

    if (!content || !icon) return;

    const isHidden = content.style.display === 'none';

    if (isHidden) {
        content.style.display = 'block';
        icon.innerHTML = '<i data-lucide="chevron-down" style="width:18px;height:18px;"></i>'; if(window.refreshLucideIcons) window.refreshLucideIcons();
    } else {
        content.style.display = 'none';
        icon.innerHTML = '<i data-lucide="chevron-right" style="width:18px;height:18px;"></i>'; if(window.refreshLucideIcons) window.refreshLucideIcons();
    }
}

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

// ========== WEBSOCKET FUNCTIONS ==========

function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('[WS] Ya existe una conexión WebSocket activa');
        return;
    }

    console.log('[WS] Conectando a WebSocket...');
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('[WS] ✓ Conectado al WebSocket');
        if (wsReconnectInterval) {
            clearInterval(wsReconnectInterval);
            wsReconnectInterval = null;
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('[WS] Mensaje recibido:', data);

            // Verificar que el mensaje tiene la estructura esperada (array de símbolos)
            if (data.message && Array.isArray(data.message)) {
                console.log(`[WS] Procesando ${data.message.length} símbolos...`);

                // Procesar cada símbolo en el array
                data.message.forEach(symbolData => {
                    const { symbol, price, change, changePercent, timestamp } = symbolData;

                    console.log(`[WS] Precio actualizado para ${symbol}: ${price}`);

                    // Actualizar el objeto de precios en tiempo real
                    realtimePrices[symbol] = {
                        price,
                        change,
                        changePercent,
                        timestamp
                    };

                    // Actualizar las tarjetas de símbolos en la vista principal
                    updateSymbolCard(symbol);

                    // Si estamos viendo el detalle de este símbolo, actualizar la UI
                    if (currentData && currentData.instrument && currentData.code === symbol) {
                        console.log(`[WS] ✓ Actualizando UI de detalle para ${symbol}`);
                        updateRealtimePrice(symbol, price, change, changePercent, timestamp);
                    }
                });

                console.log(`[WS] ✓ ${data.message.length} símbolos actualizados`);
            }
        } catch (error) {
            console.error('[WS] Error al procesar mensaje:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('[WS] Error en WebSocket:', error);
    };

    ws.onclose = () => {
        console.log('[WS] Conexión cerrada. Intentando reconectar...');
        ws = null;

        // Intentar reconectar cada 5 segundos
        if (!wsReconnectInterval) {
            wsReconnectInterval = setInterval(() => {
                console.log('[WS] Intentando reconectar...');
                connectWebSocket();
            }, 5000);
        }
    };
}

function disconnectWebSocket() {
    if (ws) {
        console.log('[WS] Cerrando conexión WebSocket');
        ws.close();
        ws = null;
    }

    if (wsReconnectInterval) {
        clearInterval(wsReconnectInterval);
        wsReconnectInterval = null;
    }
}

function updateRealtimePrice(symbol, price, change, changePercent, timestamp) {
    console.log('[WS] updateRealtimePrice llamado:', { symbol, price, change, changePercent });

    const realtimeContainer = document.getElementById('realtimePriceContainer');
    if (!realtimeContainer) {
        console.error('[WS] ❌ No se encontró realtimePriceContainer');
        return;
    }

    const priceChangeClass = change >= 0 ? 'positive' : 'negative';
    const priceChangeSymbol = change >= 0 ? '▲' : '▼';
    const formattedTime = moment(timestamp).format('HH:mm:ss');

    // Actualizar el contenido con texto alineado a la derecha
    realtimeContainer.innerHTML = `
        <div class="realtime-price-header">
            <h3 style="margin: 0; font-size: 1.2rem; color: var(--accent);"><i data-lucide="activity" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;"></i>Precio Actual</h3>
            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 0.25rem;">
                Actualizado: ${formattedTime}
            </div>
        </div>
        <div class="realtime-price-display">
            <div class="realtime-current-price" style="text-align: right;">${formatNumber(price, 3)}</div>
            <div class="realtime-price-change ${priceChangeClass}" style="text-align: right;">
                ${priceChangeSymbol} ${formatNumber(change, 2)} (${formatPercent(changePercent)})
            </div>
        </div>
    `;

    console.log('[WS] ✓ Precio actualizado en DOM');

    // Añadir animación de actualización
    realtimeContainer.style.animation = 'none';
    setTimeout(() => {
        realtimeContainer.style.animation = 'priceUpdate 0.5s ease';
    }, 10);

    // Actualizar el calculador de distancias con el nuevo precio en tiempo real
    updatePriceDistances(price);

    // Actualizar la barra de progreso con el nuevo precio
    updateProgressBar(price);
}

function updateSymbolCard(symbol) {
    const priceData = realtimePrices[symbol];
    if (!priceData) return;

    // Buscar tarjetas de símbolos (vista de símbolos por tipo)
    const symbolCards = document.querySelectorAll(`.symbol-card[data-code="${symbol}"]`);
    symbolCards.forEach(card => {
        const priceContainer = card.querySelector('.symbol-realtime-price');
        if (priceContainer) {
            priceContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <span style="color: rgba(255,255,255,0.6); font-size: 0.85rem;">Precio Actual:</span>
                    <span style="color: rgba(39, 174, 96, 1); font-weight: bold; font-size: 0.95rem;">${formatNumber(priceData.price, 3)}</span>
                </div>
                <div style="text-align: right; font-size: 0.75rem; color: ${priceData.change >= 0 ? 'var(--success)' : 'var(--danger)'};">
                    ${priceData.change >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(priceData.change), 2)} (${formatPercent(priceData.changePercent)})
                </div>
            `;
            priceContainer.style.background = 'rgba(39, 174, 96, 0.1)';
            priceContainer.style.borderLeft = '3px solid rgba(39, 174, 96, 0.6)';
        }
    });

    // Buscar tarjetas de oportunidades (vista de mejores oportunidades)
    const opportunityCards = document.querySelectorAll(`.opportunity-card[data-code="${symbol}"]`);
    opportunityCards.forEach(card => {
        const priceContainer = card.querySelector('.realtime-price-badge');
        if (priceContainer) {
            priceContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <span style="color: rgba(255,255,255,0.6); font-size: 0.85rem;">Precio Actual:</span>
                    <span style="color: rgba(39, 174, 96, 1); font-weight: bold; font-size: 0.95rem;">${formatNumber(priceData.price, 3)}</span>
                </div>
                <div style="text-align: right; font-size: 0.75rem; color: ${priceData.change >= 0 ? 'var(--success)' : 'var(--danger)'};">
                    ${priceData.change >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(priceData.change), 2)} (${formatPercent(priceData.changePercent)})
                </div>
            `;
        }
    });

    // Buscar tarjetas de resultados (vista de análisis por símbolo)
    const resultCards = document.querySelectorAll(`.result-card[data-code="${symbol}"]`);

    // Si hay tarjetas de resultados, actualizar el precio en el header
    if (resultCards.length > 0) {
        const headerPrice = document.getElementById('results-header-price');
        if (headerPrice) {
            headerPrice.innerHTML = `
                <div style="display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.25rem;">
                    <span style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">Precio Actual:</span>
                    <span style="color: rgba(39, 174, 96, 1); font-weight: bold; font-size: 1.5rem;">${formatNumber(priceData.price, 3)}</span>
                </div>
                <div style="text-align: right; font-size: 0.85rem; color: ${priceData.change >= 0 ? 'var(--success)' : 'var(--danger)'};">
                    ${priceData.change >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(priceData.change), 2)} (${formatPercent(priceData.changePercent)})
                </div>
            `;
            headerPrice.style.background = 'rgba(39, 174, 96, 0.1)';
            headerPrice.style.borderLeft = '4px solid rgba(39, 174, 96, 0.8)';
        }
    }

    if (symbolCards.length > 0 || opportunityCards.length > 0 || resultCards.length > 0) {
        console.log(`[WS] ✓ Tarjetas actualizadas para ${symbol} (Símbolos: ${symbolCards.length}, Oportunidades: ${opportunityCards.length}, Resultados: ${resultCards.length})`);
    }
}

function updateProgressBar(currentPrice) {
    if (!currentData || !currentData.analysis) return;

    // Actualizar barra del escenario principal
    if (currentData.analysis.mainScenario) {
        updateProgressBarForScenario(currentPrice, currentData.analysis.mainScenario, 'main');
    }

    // Actualizar barra del escenario alternativo
    if (currentData.analysis.alternativeScenario) {
        updateProgressBarForScenario(currentPrice, currentData.analysis.alternativeScenario, 'alternative');
    }
}

function updateProgressBarForScenario(currentPrice, scenario, scenarioType) {
    const stopLoss = scenario.stopLoss;
    const entry = scenario.entry;
    const lastTarget = scenario.targets[scenario.targets.length - 1].level;
    const isLong = scenario.direction === 'LONG';

    // Calcular el rango total
    const totalRange = Math.abs(lastTarget - stopLoss);

    // Calcular la posición de Entry
    const entryPosition = entry ? (isLong
        ? ((entry - stopLoss) / totalRange) * 100
        : ((stopLoss - entry) / totalRange) * 100) : 0;

    // Calcular el progreso (para la barra visual desde SL)
    let progress = 0;
    let isInvalidated = false;

    if (isLong) {
        if (currentPrice <= stopLoss) {
            progress = 0;
            isInvalidated = true;
        } else if (currentPrice >= lastTarget) {
            progress = 100;
        } else {
            progress = ((currentPrice - stopLoss) / totalRange) * 100;
        }
    } else {
        if (currentPrice >= stopLoss) {
            progress = 0;
            isInvalidated = true;
        } else if (currentPrice <= lastTarget) {
            progress = 100;
        } else {
            progress = ((stopLoss - currentPrice) / totalRange) * 100;
        }
    }

    // Calcular el progreso desde Entry (para mostrar el porcentaje)
    let progressFromEntry = 0;
    if (entry) {
        const entryToTargetRange = Math.abs(lastTarget - entry);
        if (isLong) {
            if (currentPrice <= entry) {
                progressFromEntry = 0;
            } else if (currentPrice >= lastTarget) {
                progressFromEntry = 100;
            } else {
                progressFromEntry = ((currentPrice - entry) / entryToTargetRange) * 100;
            }
        } else {
            if (currentPrice >= entry) {
                progressFromEntry = 0;
            } else if (currentPrice <= lastTarget) {
                progressFromEntry = 100;
            } else {
                progressFromEntry = ((entry - currentPrice) / entryToTargetRange) * 100;
            }
        }
    }

    const redZonePercent = 2;

    // Buscar los elementos de la barra de progreso
    const progressFill = document.getElementById(`progress-fill-${scenarioType}`);
    const progressContainer = document.getElementById(`progress-bar-container-${scenarioType}`);

    if (!progressContainer) return;

    // Actualizar el porcentaje mostrado (desde Entry)
    const progressText = progressContainer.querySelector('span[style*="font-weight: bold"]');
    if (progressText) {
        progressText.innerHTML = isInvalidated ? '<i data-lucide="x-circle" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i>Invalidado' : `${progressFromEntry.toFixed(1)}%`;
        progressText.style.color = isInvalidated ? 'var(--danger)' : 'var(--success)';
    }

    // Actualizar el relleno de la barra verde (Entry a precio actual, solo si superó Entry)
    if (progressFill && !isInvalidated) {
        if (progress > entryPosition) {
            const greenWidth = progress - entryPosition;
            progressFill.style.width = `${greenWidth}%`;
        } else {
            progressFill.style.width = '0%';
        }
    }

    // Actualizar la zona roja final
    const redZone = progressContainer.querySelector(`.progress-red-zone-${scenarioType}`);
    if (redZone && !isInvalidated) {
        if (progress > entryPosition) {
            redZone.style.left = `${progress}%`;
            redZone.style.width = `${redZonePercent}%`;
        } else {
            redZone.style.width = '0%';
        }
    }

    // Actualizar el indicador del precio actual
    const priceIndicator = progressContainer.querySelector(`.progress-indicator-${scenarioType}`);
    if (priceIndicator && !isInvalidated) {
        priceIndicator.style.left = `${progress}%`;
    }

    // Actualizar el label del precio actual
    const priceLabel = progressContainer.querySelector(`.progress-price-label-${scenarioType}`);
    if (priceLabel && !isInvalidated) {
        priceLabel.style.left = `${progress}%`;
        priceLabel.textContent = formatNumber(currentPrice, 2);
    }

    // Actualizar los marcadores alcanzados
    const markers = progressContainer.querySelectorAll('div[style*="position: absolute"][style*="height: 100%"]');
    markers.forEach((marker, index) => {
        if (index === 0) return; // Skip si es el primero (entry)

        // Determinar si el target fue alcanzado
        const targetIndex = index - 1; // Ajustar índice considerando entry
        if (scenario.targets[targetIndex]) {
            const targetLevel = scenario.targets[targetIndex].level;
            const reached = isLong ? currentPrice >= targetLevel : currentPrice <= targetLevel;

            const label = marker.querySelector('div[style*="top: -25px"]');
            if (label) {
                label.style.color = reached ? '#2ecc71' : 'rgba(255,255,255,0.7)';
                if (reached && !label.textContent.includes('✓')) {
                    label.textContent = '✓ ' + label.textContent;
                }
            }
            marker.style.background = reached ? '#2ecc71' : 'rgba(255,255,255,0.4)';
        }
    });

    console.log(`[Progress Bar ${scenarioType}] Actualizado: ${progress.toFixed(1)}% (Invalidado: ${isInvalidated})`);
}

function updatePriceDistances(newPrice) {
    if (!currentData || !currentData.analysis) return;

    // Buscar el contenedor del calculador de distancias buscando por todos los h2
    let container = null;
    const allH2 = document.querySelectorAll('.section h2');
    for (let h2 of allH2) {
        if (h2.textContent.includes('Calculador de Distancias')) {
            container = h2.closest('.section');
            break;
        }
    }

    if (!container) {
        console.log('[WS] No se encontró el contenedor del calculador de distancias');
        return;
    }

    // Actualizar solo el precio actual mostrado en el header del calculador
    const priceDisplay = container.querySelector('div[style*="font-size: 0.85rem"]');
    if (priceDisplay) {
        priceDisplay.innerHTML = `Precio actual: <strong style="color: var(--accent);">${formatNumber(newPrice, 2)}</strong> <span style="font-size: 0.75rem; color: rgba(39, 174, 96, 1);">● LIVE</span>`;
    }

    // Recalcular todas las distancias
    const allRows = container.querySelectorAll('.distance-row');
    allRows.forEach(row => {
        const valueElement = row.querySelector('.distance-value');
        if (!valueElement) return;

        const targetPrice = parseFloat(valueElement.textContent.replace(/,/g, ''));
        if (isNaN(targetPrice)) return;

        const dist = calculateDistance(newPrice, targetPrice);

        // Actualizar el cálculo de distancia
        const calcElement = row.querySelector('.distance-calc');
        if (calcElement) {
            calcElement.textContent = dist.formatted;
        }

        // Actualizar la clase de color
        row.classList.remove('distance-close', 'distance-medium', 'distance-far');
        row.classList.add(dist.colorClass);

        // Actualizar o agregar el status
        let statusElement = row.querySelector('.distance-status');
        if (dist.status) {
            if (!statusElement) {
                statusElement = document.createElement('span');
                statusElement.className = 'distance-status';
                row.appendChild(statusElement);
            }
            statusElement.textContent = dist.status;
        } else if (statusElement) {
            statusElement.remove();
        }
    });

    console.log('[WS] ✓ Calculador de distancias actualizado con precio:', newPrice);

    // Actualizar también la sección de validación de escenarios
    updateScenarioValidation(newPrice);
}

function updateScenarioValidation(newPrice) {
    if (!currentData || !currentData.analysis || !currentData.riskManagement) {
        console.log('[WS] No hay datos suficientes para actualizar validación');
        return;
    }

    console.log('[WS] Intentando actualizar validación de escenarios...');

    // Buscar el contenedor de validación de escenarios
    let validationContainer = null;
    const allH2 = document.querySelectorAll('.section h2');

    console.log(`[WS] Encontrados ${allH2.length} h2 elements`);

    for (let h2 of allH2) {
        console.log(`[WS] Revisando h2: "${h2.textContent}"`);
        if (h2.textContent.includes('Validación de Escenarios')) {
            validationContainer = h2.closest('.section');
            console.log('[WS] ✓ Contenedor de validación encontrado');
            break;
        }
    }

    if (!validationContainer) {
        console.log('[WS] ❌ No se encontró el contenedor de validación de escenarios');
        return;
    }

    // Calcular nuevas validaciones
    const mainScenario = currentData.analysis.mainScenario;
    const riskManagement = currentData.riskManagement;

    const mainValidity = checkScenarioValidity(newPrice, mainScenario, riskManagement);

    // Actualizar escenario principal
    if (mainValidity) {
        const mainScenarioDiv = validationContainer.querySelector('div[style*="border-left: 4px solid"]');
        if (mainScenarioDiv) {
            const statusText = mainValidity.status === 'VALID' ? 'ESCENARIO VÁLIDO' :
                mainValidity.status === 'AT_RISK' ? 'ESCENARIO EN RIESGO' :
                    'ESCENARIO INVALIDADO';

            // Actualizar border color
            mainScenarioDiv.style.borderLeftColor = mainValidity.statusColor;

            // Actualizar icono y texto de estado
            const statusDiv = mainScenarioDiv.querySelector('div[style*="font-size: 1.5rem"]');
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <span style="font-size: 1.5rem;">${mainValidity.statusIcon}</span>
                    <strong style="color: ${mainValidity.statusColor}; font-size: 1.1rem;">${statusText}</strong>
                `;
            }

            // Actualizar nivel y distancia
            const levelBox = mainScenarioDiv.querySelector('div[style*="background: rgba(0,0,0,0.2)"]');
            if (levelBox) {
                const distanceColor = mainValidity.distance.colorClass === 'distance-close' ? 'var(--success)' :
                    mainValidity.distance.colorClass === 'distance-medium' ? '#f39c12' : 'var(--danger)';

                levelBox.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">Nivel de invalidación:</span>
                        <strong style="color: var(--accent); font-family: 'Courier New', monospace;">${formatNumber(mainValidity.invalidationLevel, 2)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">Distancia:</span>
                        <strong style="color: ${distanceColor}; font-family: 'Courier New', monospace;">${mainValidity.distance.formatted}</strong>
                    </div>
                    ${mainValidity.distance.status ? `
                        <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(235, 87, 87, 0.2); border-radius: 4px;">
                            <strong style="color: var(--danger);"><i data-lucide="alert-triangle" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i>${mainValidity.distance.status}</strong>
                        </div>
                    ` : ''}
                `;
            }

            console.log('[WS] ✓ Escenario principal actualizado:', statusText);
        } else {
            console.log('[WS] ⚠️ No se encontró el div del escenario principal');
        }
    }

    // Actualizar escenario alternativo si existe
    if (currentData.analysis.alternativeScenario) {
        const altScenario = currentData.analysis.alternativeScenario;
        const altValidity = checkScenarioValidity(newPrice, altScenario, riskManagement);

        if (altValidity) {
            // Buscar el div del escenario alternativo (el segundo div con border-left)
            const allScenarioDivs = validationContainer.querySelectorAll('div[style*="border-left: 4px solid"]');
            const altScenarioDiv = allScenarioDivs[1]; // El segundo es el alternativo

            if (altScenarioDiv) {
                const statusText = altValidity.status === 'VALID' ? 'ESCENARIO VÁLIDO' :
                    altValidity.status === 'AT_RISK' ? 'ESCENARIO EN RIESGO' :
                        'ESCENARIO INVALIDADO';

                // Actualizar border color
                altScenarioDiv.style.borderLeftColor = altValidity.statusColor;

                // Actualizar icono y texto de estado
                const statusDiv = altScenarioDiv.querySelector('div[style*="font-size: 1.5rem"]');
                if (statusDiv) {
                    statusDiv.innerHTML = `
                        <span style="font-size: 1.5rem;">${altValidity.statusIcon}</span>
                        <strong style="color: ${altValidity.statusColor}; font-size: 1.1rem;">${statusText}</strong>
                    `;
                }

                // Actualizar nivel y distancia
                const levelBox = altScenarioDiv.querySelector('div[style*="background: rgba(0,0,0,0.2)"]');
                if (levelBox) {
                    const distanceColor = altValidity.distance.colorClass === 'distance-close' ? 'var(--success)' :
                        altValidity.distance.colorClass === 'distance-medium' ? '#f39c12' : 'var(--danger)';

                    levelBox.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <span style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">Nivel de invalidación:</span>
                            <strong style="color: var(--accent); font-family: 'Courier New', monospace;">${formatNumber(altValidity.invalidationLevel, 2)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">Distancia:</span>
                            <strong style="color: ${distanceColor}; font-family: 'Courier New', monospace;">${altValidity.distance.formatted}</strong>
                        </div>
                        ${altValidity.distance.status ? `
                            <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(235, 87, 87, 0.2); border-radius: 4px;">
                                <strong style="color: var(--danger);"><i data-lucide="alert-triangle" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i>${altValidity.distance.status}</strong>
                            </div>
                        ` : ''}
                    `;
                }

                console.log('[WS] ✓ Escenario alternativo actualizado:', statusText);
            } else {
                console.log('[WS] ⚠️ No se encontró el div del escenario alternativo');
            }
        }
    }

    console.log('[WS] ✓ Validación de escenarios actualizada con precio:', newPrice);
}

// ========== RENDER FUNCTIONS ==========

function renderSymbolTypes(types) {
    const container = document.getElementById('typesGrid');

    // Card de Mejores Oportunidades
    const bestOpportunitiesCard = `
        <div class="type-card best-opportunities-card" onclick="showBestOpportunities()">
            <div class="type-icon" style="background: #ff660020; color: #ff6600">
                <i data-lucide="flame" style="width:28px;height:28px;"></i>
            </div>
            <div class="type-info">
                <div class="type-name">Mejores Oportunidades</div>
                <div class="type-description">Análisis con mayor confianza</div>
            </div>
        </div>
    `;

    // Cards de tipos de símbolos
    const typeCards = types.map(type => {
        const iconConfig = getTradingIconConfig(null, type.code);
        return `
        <div class="type-card" onclick="showSymbolsByType('${type.code}', '${type.name}', '${iconConfig.color}', '${type.code}')">
            <div class="type-icon" style="background: ${iconConfig.color}20; color: ${iconConfig.color}">
                ${getTradingIcon(null, type.code, 28)}
            </div>
            <div class="type-info">
                <div class="type-name">${type.name}</div>
                <div class="type-description">${type.description}</div>
            </div>
        </div>
        `;
    }).join('');

    container.innerHTML = bestOpportunitiesCard + typeCards;
    if(window.refreshLucideIcons) window.refreshLucideIcons();
}

function renderSymbols(symbols, typeName, typeColor, typeIcon) {
    const container = document.getElementById('symbolsGrid');
    const header = document.getElementById('symbolsHeader');

    // Obtener ícono del tipo
    const typeIconConfig = getTradingIconConfig(null, typeIcon);

    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="type-icon-large" style="background: ${typeIconConfig.color}20; color: ${typeIconConfig.color}">
                ${getTradingIcon(null, typeIcon, 32)}
            </div>
            <div>
                <h1>${typeName}</h1>
                <p>Selecciona un símbolo para ver sus análisis</p>
            </div>
        </div>
    `;

    container.innerHTML = symbols.map(symbol => {
        const realtimePrice = realtimePrices[symbol.code];
        const symbolIconConfig = getTradingIconConfig(symbol.code, symbol.type);

        return `
        <div class="symbol-card" data-code="${symbol.code}" onclick="showSymbolResults('${symbol.code}', '${symbol.name}', '${symbolIconConfig.color}', '${symbol.type || symbol.code}')">
            <div class="symbol-header">
                <div>
                    <div class="symbol-icon" style="color: ${symbolIconConfig.color}">${getTradingIcon(symbol.code, symbol.type, 24)}</div>
                    <div class="symbol-name">${symbol.name}</div>
                    <div class="symbol-code">${symbol.code}</div>
                </div>
            </div>
            <div class="symbol-info">${symbol.fullName}</div>

            ${realtimePrice ? `
                <div class="symbol-realtime-price" style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(39, 174, 96, 0.1); border-radius: 6px; border-left: 3px solid rgba(39, 174, 96, 0.6);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                        <span style="color: rgba(255,255,255,0.6); font-size: 0.85rem;">Precio Actual:</span>
                        <span style="color: rgba(39, 174, 96, 1); font-weight: bold; font-size: 0.95rem;">${formatNumber(realtimePrice.price, 3)}</span>
                    </div>
                    <div style="text-align: right; font-size: 0.75rem; color: ${realtimePrice.change >= 0 ? 'var(--success)' : 'var(--danger)'};">
                        ${realtimePrice.change >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(realtimePrice.change), 2)} (${formatPercent(realtimePrice.changePercent)})
                    </div>
                </div>
            ` : `
                <div class="symbol-realtime-price" style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 6px;">
                    <div style="color: rgba(255,255,255,0.4); font-size: 0.85rem; text-align: center;">
                        <i data-lucide="loader" style="width:14px;height:14px;margin-right:4px;animation:spin 1s linear infinite;"></i>Esperando precio...
                    </div>
                </div>
            `}

            <div class="symbol-footer">
                <span class="symbol-trading-code">${symbol.tradingCode}</span>
            </div>
        </div>
        `;
    }).join('');
    if(window.refreshLucideIcons) window.refreshLucideIcons();
}

function renderResults(results, symbolName, symbolColor, symbolIcon) {
    const container = document.getElementById('resultsGrid');
    const header = document.getElementById('resultsHeader');

    // Extraer el código del primer resultado para obtener el precio
    const code = results.length > 0 ? getAnalysisCode(results[0]) : null;
    const realtimePrice = code ? realtimePrices[code] : null;

    // Obtener ícono del símbolo
    const iconConfig = getTradingIconConfig(code, symbolIcon);

    header.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div class="type-icon-large" style="background: ${iconConfig.color}20; color: ${iconConfig.color}">
                    ${getTradingIcon(code, symbolIcon, 32)}
                </div>
                <div>
                    <h1>${symbolName}</h1>
                    <p>Selecciona un análisis para ver los detalles</p>
                </div>
            </div>
            ${realtimePrice ? `
                <div id="results-header-price" style="padding: 1rem 1.5rem; background: rgba(39, 174, 96, 0.1); border-radius: 8px; border-left: 4px solid rgba(39, 174, 96, 0.8);">
                    <div style="display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.25rem;">
                        <span style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">Precio Actual:</span>
                        <span style="color: rgba(39, 174, 96, 1); font-weight: bold; font-size: 1.5rem;">${formatNumber(realtimePrice.price, 3)}</span>
                    </div>
                    <div style="text-align: right; font-size: 0.85rem; color: ${realtimePrice.change >= 0 ? 'var(--success)' : 'var(--danger)'};">
                        ${realtimePrice.change >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(realtimePrice.change), 2)} (${formatPercent(realtimePrice.changePercent)})
                    </div>
                </div>
            ` : `
                <div id="results-header-price" style="padding: 1rem 1.5rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <div style="color: rgba(255,255,255,0.4); font-size: 0.9rem;">
                        <i data-lucide="loader" style="width:14px;height:14px;margin-right:4px;animation:spin 1s linear infinite;"></i>Esperando precio...
                    </div>
                </div>
            `}
        </div>
    `;

    container.innerHTML = results.map(result => {
        const code = getAnalysisCode(result);
        const relativeTime = formatRelativeTime(result);

        return `
        <div class="result-card" data-code="${code}" onclick="showDetail('${result._id}')">
            <div class="result-header">
                <div class="result-symbol">${result.instrument.symbol}</div>
                <div class="result-timeframe">${result.instrument.timeframe}</div>
            </div>
            <div class="result-name">${result.instrument.emoji || ''} ${result.instrument.name}</div>
            <div class="result-type">${result.instrument.assetType}</div>
            <div class="result-date" style="color: rgba(255,255,255,0.6); font-size: 0.85rem;">
                <i data-lucide="clock" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i>${relativeTime}
            </div>
            <div class="result-date-full" style="color: rgba(255,255,255,0.4); font-size: 0.75rem; margin-top: 0.25rem;">
                <i data-lucide="calendar" style="width:12px;height:12px;margin-right:4px;vertical-align:middle;"></i>${formatDate(result)}
            </div>
        </div>
        `;
    }).join('');
    if(window.refreshLucideIcons) window.refreshLucideIcons();
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
                <i data-lucide="flame" style="width:32px;height:32px;"></i>
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

        // El code está en la raíz del objeto
        const code = opp.code;
        const realtimePrice = code ? realtimePrices[code] : null;

        console.log('[Render] Oportunidad:', opp.instrument?.symbol, 'Code:', code, 'Precio RT:', realtimePrice);

        return `
            <div class="opportunity-card" data-code="${code}" onclick="showDetail('${opp._id}')">
                <div class="opportunity-header">
                    <div class="opportunity-symbol">${opp.instrument.symbol}</div>
                    <div class="opportunity-confidence" style="background: #ff660020; color: #ff6600; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.85rem; font-weight: 600;">
                        ${opp.analysis.confidence}% confianza
                    </div>
                </div>
                <div class="opportunity-name">${getTradingIcon(opp.code || opp.instrument.symbol, opp.instrument.assetType, 16)} ${opp.instrument.name}</div>
                <div class="opportunity-details">
                    <span class="badge ${directionClass}">${opp.analysis.mainScenario.direction}</span>
                    <span class="badge ${biasClass}">${opp.analysis.bias}</span>
                    <span class="result-timeframe">${opp.instrument.timeframe}</span>
                </div>
                <div class="opportunity-type">${opp.instrument.assetType}</div>

                ${realtimePrice ? `
                    <div class="realtime-price-badge" style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(39, 174, 96, 0.1); border-radius: 6px; border-left: 3px solid rgba(39, 174, 96, 0.6);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                            <span style="color: rgba(255,255,255,0.6); font-size: 0.85rem;">Precio Actual:</span>
                            <span style="color: rgba(39, 174, 96, 1); font-weight: bold; font-size: 0.95rem;">${formatNumber(realtimePrice.price, 3)}</span>
                        </div>
                        <div style="text-align: right; font-size: 0.75rem; color: ${realtimePrice.change >= 0 ? 'var(--success)' : 'var(--danger)'};">
                            ${realtimePrice.change >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(realtimePrice.change), 2)} (${formatPercent(realtimePrice.changePercent)})
                        </div>
                    </div>
                ` : `
                    <div class="realtime-price-badge" style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 6px;">
                        <div style="color: rgba(255,255,255,0.4); font-size: 0.85rem; text-align: center;">
                            <i data-lucide="loader" style="width:14px;height:14px;margin-right:4px;animation:spin 1s linear infinite;"></i>Esperando precio en tiempo real...
                        </div>
                    </div>
                `}

                <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">Entrada sugerida:</span>
                        <span style="color: var(--secondary); font-weight: bold; font-size: 1rem;">${formatNumber(opp.analysis.mainScenario.entry, 3)}</span>
                    </div>
                </div>
                <div class="opportunity-date"><i data-lucide="calendar" style="width:12px;height:12px;margin-right:4px;vertical-align:middle;"></i>${formatDate(opp)}</div>
            </div>
        `;
    }).join('');
    if(window.refreshLucideIcons) window.refreshLucideIcons();
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
                <div class="index-section-title"><i data-lucide="gauge" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;"></i>Fear & Greed Index</div>

                <div class="fg-markets-grid">
                    <div class="fg-market-item">
                        <div class="fg-market-title"><i data-lucide="trending-up" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i>Stock Market</div>
                        <div class="fg-market-value" style="color: ${getColorForFearGreed(stock.value)}">
                            ${stock.value}
                        </div>
                        <span class="badge ${getBadgeClassForFearGreed(stock.label)}">${stock.label}</span>
                        <div class="gauge-container" style="margin-top: 1rem;">
                            ${createCircularGauge(stock.value, 0, 100, getColorForFearGreed(stock.value))}
                        </div>
                    </div>

                    <div class="fg-market-item">
                        <div class="fg-market-title"><i data-lucide="bitcoin" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i>Crypto Market</div>
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
                        <div class="divergence-alert-title"><i data-lucide="alert-triangle" style="width:16px;height:16px;margin-right:6px;vertical-align:middle;color:#f59e0b;"></i>DIVERGENCIA DETECTADA</div>
                        <div class="divergence-alert-text">
                            Diferencia de ${divergence.divergence} puntos entre Stock (${stock.value}) y Crypto (${crypto.value})
                        </div>
                    </div>
                ` : ''}

                ${fearGreedIndex.recommendation ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(45, 66, 99, 0.3); border-radius: 8px; font-size: 0.9rem; line-height: 1.5;">
                        <strong><i data-lucide="lightbulb" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;color:#fbbf24;"></i>Recomendación:</strong> ${fearGreedIndex.recommendation}
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
                <div class="index-section-title"><i data-lucide="shield-alert" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;"></i>Defcon Index</div>

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
                            <div class="divergence-alert-title"><i data-lucide="alert-octagon" style="width:16px;height:16px;margin-right:6px;vertical-align:middle;color:#ef4444;"></i>ANOMALÍA DETECTADA</div>
                            ${pentagonPizzaIndex.anomalyDescription ? `
                                <div class="divergence-alert-text">${pentagonPizzaIndex.anomalyDescription}</div>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${pentagonPizzaIndex.recommendation ? `
                        <div style="margin-top: 1rem; padding: 1rem; background: rgba(45, 66, 99, 0.3); border-radius: 8px; font-size: 0.9rem; line-height: 1.5; max-width: 300px; text-align: center;">
                            <strong><i data-lucide="lightbulb" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;color:#fbbf24;"></i>Recomendación:</strong> ${pentagonPizzaIndex.recommendation}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
    if(window.refreshLucideIcons) window.refreshLucideIcons();

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

function generateProgressBar(scenario, currentPrice, direction, scenarioType = 'main') {
    if (!scenario || !scenario.stopLoss || !scenario.targets || scenario.targets.length === 0) {
        return '';
    }

    const stopLoss = scenario.stopLoss;
    const entry = scenario.entry;
    const lastTarget = scenario.targets[scenario.targets.length - 1].level;

    // Determinar si es LONG o SHORT
    const isLong = direction === 'LONG';

    // Calcular el rango total (de SL al último target)
    const rangeStart = isLong ? stopLoss : lastTarget;
    const rangeEnd = isLong ? lastTarget : stopLoss;
    const totalRange = Math.abs(rangeEnd - rangeStart);

    // Calcular el progreso del precio actual (para la barra visual desde SL)
    let progress = 0;
    let isInvalidated = false;

    if (isLong) {
        // LONG: SL está abajo, targets arriba
        if (currentPrice <= stopLoss) {
            progress = 0;
            isInvalidated = true;
        } else if (currentPrice >= lastTarget) {
            progress = 100;
        } else {
            progress = ((currentPrice - stopLoss) / totalRange) * 100;
        }
    } else {
        // SHORT: SL está arriba, targets abajo
        if (currentPrice >= stopLoss) {
            progress = 0;
            isInvalidated = true;
        } else if (currentPrice <= lastTarget) {
            progress = 100;
        } else {
            progress = ((stopLoss - currentPrice) / totalRange) * 100;
        }
    }

    // Calcular el progreso desde Entry (para mostrar el porcentaje)
    let progressFromEntry = 0;
    if (entry) {
        const entryToTargetRange = Math.abs(lastTarget - entry);
        if (isLong) {
            if (currentPrice <= entry) {
                progressFromEntry = 0;
            } else if (currentPrice >= lastTarget) {
                progressFromEntry = 100;
            } else {
                progressFromEntry = ((currentPrice - entry) / entryToTargetRange) * 100;
            }
        } else {
            if (currentPrice >= entry) {
                progressFromEntry = 0;
            } else if (currentPrice <= lastTarget) {
                progressFromEntry = 100;
            } else {
                progressFromEntry = ((entry - currentPrice) / entryToTargetRange) * 100;
            }
        }
    }

    // Calcular posiciones de los marcadores
    const markers = [];

    // Calcular la posición de Entry en la barra (zona roja de riesgo va de 0% a entryPos%)
    let entryPosition = 0;
    if (entry) {
        entryPosition = isLong
            ? ((entry - stopLoss) / totalRange) * 100
            : ((stopLoss - entry) / totalRange) * 100;
        markers.push({
            position: Math.max(0, Math.min(100, entryPosition)),
            label: 'Entry',
            value: entry,
            type: 'entry',
            reached: isLong ? currentPrice >= entry : currentPrice <= entry
        });
    }

    // Definir el 2% de zona roja proporcional al final
    const redZonePercent = 2;

    // Targets
    scenario.targets.forEach((target, index) => {
        const targetPos = isLong
            ? ((target.level - stopLoss) / totalRange) * 100
            : ((stopLoss - target.level) / totalRange) * 100;

        const reached = isLong ? currentPrice >= target.level : currentPrice <= target.level;

        markers.push({
            position: Math.max(0, Math.min(100, targetPos)),
            label: `T${index + 1}`,
            value: target.level,
            type: 'target',
            reached: reached
        });
    });

    // Generar HTML con IDs únicos por escenario
    const containerId = `progress-bar-container-${scenarioType}`;
    const fillId = `progress-fill-${scenarioType}`;

    // Calcular ancho del verde (desde Entry hasta precio actual, SIN restar la zona roja)
    const greenWidth = progress > entryPosition ? progress - entryPosition : 0;

    // Debug
    console.log(`[Progress Bar ${scenarioType}] currentPrice: ${currentPrice}, SL: ${stopLoss}, Entry: ${entry}, LastTarget: ${lastTarget}`);
    console.log(`[Progress Bar ${scenarioType}] progress: ${progress.toFixed(2)}%, entryPosition: ${entryPosition.toFixed(2)}%`);
    console.log(`[Progress Bar ${scenarioType}] Verde width: ${greenWidth.toFixed(2)}%, ¿Superó Entry?: ${progress > entryPosition}`);

    let html = `
        <div id="${containerId}" style="margin: 1.5rem 0; padding: 1rem; background: rgba(0,0,0,0.3); border-radius: 8px;">
            <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.85rem; color: rgba(255,255,255,0.6);">Progreso hacia objetivos</span>
                <span style="font-size: 0.9rem; font-weight: bold; color: ${isInvalidated ? 'var(--danger)' : 'var(--success)'};">
                    ${isInvalidated ? '❌ Invalidado' : `${progressFromEntry.toFixed(1)}%`}
                </span>
            </div>

            <!-- Contenedor de barra con espacio para label -->
            <div style="position: relative; margin-top: 35px; ${!isLong ? 'transform: scaleX(-1);' : ''}">
                <!-- Barra de progreso -->
                <div style="position: relative; height: 40px; background: rgba(255,255,255,0.1); border-radius: 20px; overflow: hidden;">
                    ${!isInvalidated ? `
                        <!-- Zona roja (SL a Entry) -->
                        <div style="position: absolute; left: 0; top: 0; height: 100%; width: ${entryPosition}%; background: linear-gradient(90deg, rgba(192, 57, 43, 0.8) 0%, rgba(231, 76, 60, 0.5) 80%, rgba(231, 76, 60, 0.2) 100%); z-index: 1;">
                        </div>
                        <!-- Relleno verde (Entry a precio actual) -->
                        <div id="${fillId}" style="position: absolute; left: ${entryPosition}%; top: 0; height: 100%; width: ${greenWidth}%; background: linear-gradient(90deg, rgba(39, 174, 96, 0.3) 0%, rgba(39, 174, 96, 0.8) 50%, rgba(46, 213, 115, 1) 100%); transition: width 0.5s ease; z-index: 2;">
                        </div>
                        <!-- Zona roja final (2%) -->
                        <div class="progress-red-zone-${scenarioType}" style="position: absolute; left: ${progress}%; top: 0; height: 100%; width: ${progress > entryPosition ? redZonePercent : 0}%; background: linear-gradient(90deg, rgba(231, 76, 60, 0.3) 0%, rgba(192, 57, 43, 0.8) 100%); transition: left 0.5s ease, width 0.5s ease; z-index: 3;">
                        </div>
                    ` : ''}
                </div>

                <!-- Marcadores de niveles (fuera del overflow) -->
                ${markers.map(marker => `
                    <div style="position: absolute; left: ${marker.position}%; top: 0; height: 40px; width: 2px; background: ${marker.reached ? '#2ecc71' : 'rgba(255,255,255,0.4)'}; z-index: 10;">
                        <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%) ${!isLong ? 'scaleX(-1)' : ''}; font-size: 0.7rem; font-weight: bold; color: ${marker.reached ? '#2ecc71' : 'rgba(255,255,255,0.7)'}; white-space: nowrap;">
                            ${marker.reached ? '✓ ' : ''}${marker.label}
                        </div>
                        <!-- Precio dentro de la línea -->
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) ${!isLong ? 'scaleX(-1)' : ''}; background: rgba(0,0,0,0.8); padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; color: ${marker.reached ? '#2ecc71' : '#fff'}; white-space: nowrap; border: 1px solid ${marker.reached ? '#2ecc71' : 'rgba(255,255,255,0.3)'};">
                            ${formatNumber(marker.value, 2)}
                        </div>
                    </div>
                `).join('')}

                <!-- Indicador de precio actual (fuera del overflow) -->
                ${!isInvalidated ? `
                    <div class="progress-indicator-${scenarioType}" style="position: absolute; left: ${progress}%; top: 20px; transform: translate(-50%, -50%); width: 12px; height: 12px; background: #fff; border: 2px solid #2ecc71; border-radius: 50%; box-shadow: 0 0 10px rgba(46, 204, 113, 0.8); z-index: 15; transition: left 0.5s ease;">
                    </div>
                    <!-- Label del precio actual -->
                    <div class="progress-price-label-${scenarioType}" style="position: absolute; left: ${progress}%; top: -30px; transform: translateX(-50%) ${!isLong ? 'scaleX(-1)' : ''}; background: rgba(46, 204, 113, 0.9); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; color: #fff; white-space: nowrap; z-index: 16; transition: left 0.5s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                        ${formatNumber(currentPrice, 2)}
                    </div>
                ` : ''}
            </div>

            <!-- Leyenda -->
            <div style="display: flex; justify-content: space-between; margin-top: 0.75rem; font-size: 0.75rem; color: rgba(255,255,255,0.5);">
                ${isLong ? `
                    <span>SL: ${formatNumber(stopLoss, 2)}</span>
                    <span>Último Target: ${formatNumber(lastTarget, 2)}</span>
                ` : `
                    <span>Último Target: ${formatNumber(lastTarget, 2)}</span>
                    <span>SL: ${formatNumber(stopLoss, 2)}</span>
                `}
            </div>
        </div>
    `;

    return html;
}

// ========== TRACKING & EVENTS ==========

function calculateAdjustedConfidence(data) {
    if (!data.tracking || !data.tracking.mainScenario) return null;

    const initial = data.tracking.mainScenario.confidenceInitial;
    const events = data.tracking.events || [];

    // Calcular ajustes acumulados desde los eventos
    let totalAdjustment = 0;
    let momentumEvents = [];
    let riskEvents = [];

    events.forEach(event => {
        const change = event.confidenceChange || 0;
        totalAdjustment += change;

        if (change > 0) {
            momentumEvents.push({ type: event.type, change, description: event.description });
        } else if (change < 0) {
            riskEvents.push({ type: event.type, change, description: event.description });
        }
    });

    // Calcular scores de momentum y riesgo (0-100)
    const momentumScore = Math.min(100, Math.max(0, 50 + (momentumEvents.reduce((sum, e) => sum + e.change, 0) * 2)));
    const riskScore = Math.min(100, Math.max(0, 50 - (Math.abs(riskEvents.reduce((sum, e) => sum + e.change, 0)) * 2)));

    // Confianza ajustada
    const adjusted = Math.min(100, Math.max(0, initial + totalAdjustment));
    const delta = adjusted - initial;

    return {
        initial,
        adjusted,
        delta,
        momentumScore,
        riskScore,
        momentumEvents,
        riskEvents
    };
}

function renderTrackingStatus(data) {
    if (!data.tracking || !data.status) return '';

    const statusConfig = {
        'ACTIVE': { icon: '<i data-lucide="clock" style="width:16px;height:16px;"></i>', label: 'Activo', color: '#3498db', desc: 'Esperando entry' },
        'HEALTHY': { icon: '<i data-lucide="check-circle" style="width:16px;height:16px;"></i>', label: 'Saludable', color: '#27ae60', desc: 'Progresando hacia targets' },
        'AT_RISK': { icon: '<i data-lucide="alert-triangle" style="width:16px;height:16px;"></i>', label: 'En Riesgo', color: '#f39c12', desc: 'Cerca del Stop Loss' },
        'COMPLETED': { icon: '🎯', label: 'Completado', color: '#9b59b6', desc: '2+ targets alcanzados' },
        'INVALIDATED': { icon: '<i data-lucide="x-circle" style="width:16px;height:16px;"></i>', label: 'Invalidado', color: '#e74c3c', desc: 'Stop Loss tocado' }
    };

    const config = statusConfig[data.status] || statusConfig['ACTIVE'];
    const isActive = data.active === 1;

    return `
        <div class="section" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, ${config.color}33 0%, rgba(45, 66, 99, 0.3) 100%); border: 2px solid ${config.color}66;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2 style="margin: 0;">${config.icon} Estado del Análisis</h2>
                <span class="badge" style="background: ${config.color}; font-size: 0.9rem; padding: 0.5rem 1rem;">
                    ${config.label}
                </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                <div>
                    <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">Estado</div>
                    <div style="font-size: 1.1rem; font-weight: bold; color: ${config.color};">${config.desc}</div>
                </div>
                <div>
                    <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">Activo</div>
                    <div style="font-size: 1.1rem; font-weight: bold;">${isActive ? '<i data-lucide="check-circle" style="width:16px;height:16px;margin-right:4px;vertical-align:middle;color:#22c55e;"></i>Sí' : '<i data-lucide="x-circle" style="width:16px;height:16px;margin-right:4px;vertical-align:middle;color:#ef4444;"></i>No'}</div>
                </div>
                ${data.targetsAchieved ? `
                    <div>
                        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">Targets Alcanzados</div>
                        <div style="font-size: 1.1rem; font-weight: bold; color: var(--success);">
                            ${data.targetsAchieved.count} / ${data.targetsAchieved.total} (${data.targetsAchieved.percentage}%)
                        </div>
                    </div>
                ` : ''}
                ${data.tracking.updateCount ? `
                    <div>
                        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">Actualizaciones</div>
                        <div style="font-size: 1.1rem; font-weight: bold;">${data.tracking.updateCount}</div>
                    </div>
                ` : ''}
            </div>

            ${data.tracking.mainScenario ? (() => {
                const confData = calculateAdjustedConfidence(data);
                const deltaColor = confData && confData.delta > 0 ? 'var(--success)' : confData && confData.delta < 0 ? 'var(--danger)' : '#95a5a6';
                const deltaSymbol = confData && confData.delta > 0 ? '▲' : confData && confData.delta < 0 ? '▼' : '━';

                return `
                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="font-size: 1rem; margin-bottom: 0.75rem;"><i data-lucide="target" style="width:16px;height:16px;margin-right:6px;vertical-align:middle;"></i>Escenario Principal</h3>

                    ${confData ? `
                        <!-- Confianza Ajustada -->
                        <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                            <h4 style="font-size: 0.9rem; margin: 0 0 1rem 0; color: rgba(255,255,255,0.8);"><i data-lucide="percent" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i>Confianza del Escenario</h4>

                            <!-- Barras de confianza -->
                            <div style="display: grid; gap: 0.5rem; margin-bottom: 1rem;">
                                <div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Inicial:</span>
                                        <span style="font-size: 0.75rem; font-weight: bold;">${confData.initial}%</span>
                                    </div>
                                    <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                                        <div style="height: 100%; width: ${confData.initial}%; background: linear-gradient(90deg, #3498db 0%, #2980b9 100%); transition: width 0.3s ease;"></div>
                                    </div>
                                </div>

                                <div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Actual:</span>
                                        <span style="font-size: 0.75rem; font-weight: bold; color: ${confData.adjusted >= 70 ? 'var(--success)' : confData.adjusted >= 50 ? '#f39c12' : 'var(--danger)'};">
                                            ${confData.adjusted}%
                                            <span style="color: ${deltaColor};">${deltaSymbol}${Math.abs(confData.delta)}%</span>
                                        </span>
                                    </div>
                                    <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                                        <div style="height: 100%; width: ${confData.adjusted}%; background: linear-gradient(90deg, ${confData.adjusted >= 70 ? '#27ae60, #2ecc71' : confData.adjusted >= 50 ? '#f39c12, #f1c40f' : '#e74c3c, #c0392b'}); transition: width 0.3s ease;"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Ajustes aplicados -->
                            ${confData.momentumEvents.length > 0 || confData.riskEvents.length > 0 ? `
                                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">
                                    <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-bottom: 0.5rem;">Ajustes aplicados:</div>
                                    <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                                        ${confData.momentumEvents.map(e => `
                                            <div style="font-size: 0.75rem; display: flex; justify-content: space-between;">
                                                <span style="color: rgba(255,255,255,0.7);"><i data-lucide="check" style="width:12px;height:12px;margin-right:4px;vertical-align:middle;color:#22c55e;"></i>${e.description}</span>
                                                <span style="color: var(--success); font-weight: bold;">+${e.change}%</span>
                                            </div>
                                        `).join('')}
                                        ${confData.riskEvents.map(e => `
                                            <div style="font-size: 0.75rem; display: flex; justify-content: space-between;">
                                                <span style="color: rgba(255,255,255,0.7);"><i data-lucide="alert-triangle" style="width:12px;height:12px;margin-right:4px;vertical-align:middle;color:#f59e0b;"></i>${e.description}</span>
                                                <span style="color: var(--danger); font-weight: bold;">${e.change}%</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            <!-- Scores de Momentum y Riesgo -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">
                                <div>
                                    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-bottom: 0.25rem;">Momentum Score:</div>
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                                            <div style="height: 100%; width: ${confData.momentumScore}%; background: linear-gradient(90deg, #27ae60, #2ecc71); transition: width 0.3s ease;"></div>
                                        </div>
                                        <span style="font-size: 0.75rem; font-weight: bold; color: var(--success); min-width: 35px;">${confData.momentumScore}/100</span>
                                    </div>
                                </div>
                                <div>
                                    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-bottom: 0.25rem;">Risk Score:</div>
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                                            <div style="height: 100%; width: ${confData.riskScore}%; background: linear-gradient(90deg, ${confData.riskScore >= 50 ? '#27ae60, #2ecc71' : '#e74c3c, #c0392b'}); transition: width 0.3s ease;"></div>
                                        </div>
                                        <span style="font-size: 0.75rem; font-weight: bold; color: ${confData.riskScore >= 50 ? 'var(--success)' : 'var(--danger)'}; min-width: 35px;">${confData.riskScore}/100</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Info adicional -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem;">
                        <div>
                            <span style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Estado:</span>
                            <strong style="margin-left: 0.5rem;">${data.tracking.mainScenario.status}</strong>
                        </div>
                        ${data.tracking.mainScenario.entryReached ? `
                            <div>
                                <span style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Entry:</span>
                                <strong style="margin-left: 0.5rem; color: var(--success);"><i data-lucide="check" style="width:12px;height:12px;margin-right:2px;vertical-align:middle;"></i>Alcanzado</strong>
                            </div>
                        ` : ''}
                    </div>
                </div>
                `;
            })() : ''}

            ${data.tracking.alternativeScenario ? `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="font-size: 1rem; margin-bottom: 0.75rem;">🔄 Escenario Alternativo</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem;">
                        <div>
                            <span style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Estado:</span>
                            <strong style="margin-left: 0.5rem;">${data.tracking.alternativeScenario.status}</strong>
                        </div>
                        ${data.tracking.alternativeScenario.invalidationReason ? `
                            <div style="grid-column: 1 / -1;">
                                <span style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Razón:</span>
                                <span style="margin-left: 0.5rem; font-size: 0.85rem;">${data.tracking.alternativeScenario.invalidationReason}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function renderEvents(data) {
    if (!data.tracking || !data.tracking.events || data.tracking.events.length === 0) return '';

    const eventConfig = {
        'ENTRY_REACHED': { icon: '🎯', color: '#27ae60', label: 'Entry Alcanzado' },
        'TARGET_REACHED': { icon: '<i data-lucide="flag" style="width:14px;height:14px;"></i>', color: '#3498db', label: 'Target Alcanzado' },
        'STOP_LOSS_HIT': { icon: '🛑', color: '#e74c3c', label: 'Stop Loss Tocado' },
        'STATUS_CHANGE': { icon: '<i data-lucide="refresh-cw" style="width:14px;height:14px;"></i>', color: '#f39c12', label: 'Cambio de Estado' }
    };

    return `
        <div class="section" style="margin-bottom: 1.5rem;">
            <h2><i data-lucide="history" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;"></i>Historial de Eventos</h2>
            <div style="margin-top: 1rem;">
                ${data.tracking.events.slice().reverse().map(event => {
                    const config = eventConfig[event.type] || { icon: '📌', color: '#95a5a6', label: event.type };
                    const timestamp = moment(event.timestamp).format('DD/MM/YYYY HH:mm');
                    const confidenceChange = event.confidenceChange;
                    const confidenceColor = confidenceChange > 0 ? 'var(--success)' : confidenceChange < 0 ? 'var(--danger)' : '#95a5a6';
                    const confidenceSymbol = confidenceChange > 0 ? '+' : '';

                    return `
                        <div style="padding: 0.75rem; margin-bottom: 0.75rem; background: rgba(0,0,0,0.2); border-left: 3px solid ${config.color}; border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="font-size: 1.2rem;">${config.icon}</span>
                                    <strong style="color: ${config.color};">${config.label}</strong>
                                    ${event.scenario ? `<span class="badge badge-info" style="font-size: 0.7rem;">${event.scenario}</span>` : ''}
                                </div>
                                <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5);">${timestamp}</div>
                            </div>
                            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.8); margin-bottom: 0.5rem;">
                                ${event.description}
                            </div>
                            <div style="display: flex; gap: 1rem; font-size: 0.8rem;">
                                ${event.price ? `
                                    <div>
                                        <span style="color: rgba(255,255,255,0.6);">Precio:</span>
                                        <strong style="margin-left: 0.25rem;">${formatNumber(event.price, 2)}</strong>
                                    </div>
                                ` : ''}
                                ${confidenceChange !== undefined && confidenceChange !== 0 ? `
                                    <div>
                                        <span style="color: rgba(255,255,255,0.6);">Confianza:</span>
                                        <strong style="margin-left: 0.25rem; color: ${confidenceColor};">
                                            ${confidenceSymbol}${confidenceChange}%
                                        </strong>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function formatRelativeTime(data) {
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
        return 'N/A';
    }

    const now = moment();
    const diff = now.diff(parsedDate);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    // Construir el texto según las condiciones
    if (days > 0) {
        if (hours > 0) {
            return `Hace ${days} día${days > 1 ? 's' : ''} con ${hours} hora${hours > 1 ? 's' : ''}`;
        } else {
            return `Hace ${days} día${days > 1 ? 's' : ''}`;
        }
    } else if (hours > 0) {
        if (minutes > 0) {
            return `Hace ${hours} hora${hours > 1 ? 's' : ''} con ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        } else {
            return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        }
    } else if (minutes > 0) {
        return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else {
        return 'Hace menos de 1 minuto';
    }
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
    switch (phase) {
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

// ========== SCENARIO VALIDATION ==========

function checkScenarioValidity(currentPrice, scenario, riskManagement) {
    if (!scenario || !riskManagement) return null;

    const isLong = scenario.direction === 'LONG';

    // El nivel de invalidación es el Stop Loss del escenario
    const invalidationLevel = scenario.stopLoss;

    if (!invalidationLevel || isNaN(invalidationLevel)) return null;

    const dist = calculateDistance(currentPrice, invalidationLevel);
    const absPercent = Math.abs(dist.diffPercent);

    let status = 'VALID';
    let statusIcon = '✅';
    let statusColor = 'var(--success)';

    console.log(`[Validation] Checking scenario ${scenario.direction}:`, {
        currentPrice,
        invalidationLevel,
        absPercent,
        isLong
    });

    // Determinar si está invalidado o en riesgo
    if (isLong && currentPrice < invalidationLevel) {
        status = 'INVALIDATED';
        statusIcon = '❌';
        statusColor = 'var(--danger)';
        console.log('[Validation] LONG INVALIDATED - precio por debajo del nivel');
    } else if (!isLong && currentPrice > invalidationLevel) {
        status = 'INVALIDATED';
        statusIcon = '❌';
        statusColor = 'var(--danger)';
        console.log('[Validation] SHORT INVALIDATED - precio por encima del nivel');
    } else if (absPercent < 1.0) {  // Cambié de 0.5 a 1.0 para que detecte <1%
        status = 'AT_RISK';
        statusIcon = '⚠️';
        statusColor = '#f39c12';
        console.log('[Validation] AT RISK - distancia:', absPercent + '%');
    } else {
        console.log('[Validation] VALID - distancia segura:', absPercent + '%');
    }

    return {
        status,
        statusIcon,
        statusColor,
        invalidationLevel,
        distance: dist,
        condition: isLong ? riskManagement.invalidationLong : riskManagement.invalidationShort
    };
}

function renderScenarioValidation(currentPrice, analysis, riskManagement) {
    if (!analysis || !riskManagement) return '';

    const mainScenario = analysis.mainScenario;
    const altScenario = analysis.alternativeScenario;

    const mainValidity = checkScenarioValidity(currentPrice, mainScenario, riskManagement);
    const altValidity = altScenario ? checkScenarioValidity(currentPrice, altScenario, riskManagement) : null;

    if (!mainValidity && !altValidity) return '';

    let html = `
        <div class="section" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(255, 140, 0, 0.2) 0%, rgba(45, 66, 99, 0.3) 100%); border: 2px solid rgba(255, 140, 0, 0.4);">
            <h2><i data-lucide="shield-check" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;"></i>Validación de Escenarios</h2>
    `;

    // Escenario Principal
    if (mainValidity) {
        const statusText = mainValidity.status === 'VALID' ? 'ESCENARIO VÁLIDO' :
            mainValidity.status === 'AT_RISK' ? 'ESCENARIO EN RIESGO' :
                'ESCENARIO INVALIDADO';

        html += `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 8px; border-left: 4px solid ${mainValidity.statusColor};">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                    <strong style="font-size: 1rem;"><i data-lucide="target" style="width:16px;height:16px;margin-right:6px;vertical-align:middle;"></i>ESCENARIO PRINCIPAL</strong>
                    <span class="badge ${mainScenario.direction === 'LONG' ? 'badge-success' : 'badge-danger'}">${mainScenario.direction}</span>
                    <span class="badge badge-info">${mainScenario.probability}%</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                    <span style="font-size: 1.5rem;">${mainValidity.statusIcon}</span>
                    <strong style="color: ${mainValidity.statusColor}; font-size: 1.1rem;">${statusText}</strong>
                </div>
                <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 5px; margin-bottom: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">Nivel de invalidación:</span>
                        <strong style="color: var(--accent); font-family: 'Courier New', monospace;">${formatNumber(mainValidity.invalidationLevel, 2)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">Distancia:</span>
                        <strong style="color: ${mainValidity.distance.colorClass === 'distance-close' ? 'var(--success)' : mainValidity.distance.colorClass === 'distance-medium' ? '#f39c12' : 'var(--danger)'}; font-family: 'Courier New', monospace;">${mainValidity.distance.formatted}</strong>
                    </div>
                    ${mainValidity.distance.status ? `
                        <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(235, 87, 87, 0.2); border-radius: 4px;">
                            <strong style="color: var(--danger);"><i data-lucide="alert-triangle" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i>${mainValidity.distance.status}</strong>
                        </div>
                    ` : ''}
                </div>
                <div style="font-size: 0.85rem; color: rgba(255,255,255,0.8); font-style: italic;">
                    📝 ${mainValidity.condition}
                </div>
            </div>
        `;
    }

    // Escenario Alternativo
    if (altValidity) {
        const statusText = altValidity.status === 'VALID' ? 'ESCENARIO VÁLIDO' :
            altValidity.status === 'AT_RISK' ? 'ESCENARIO EN RIESGO' :
                'ESCENARIO INVALIDADO';

        html += `
            <div style="padding: 1rem; background: rgba(0,0,0,0.15); border-radius: 8px; border-left: 4px solid ${altValidity.statusColor};">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                    <strong style="font-size: 0.95rem; color: rgba(255,255,255,0.8);">🔄 ESCENARIO ALTERNATIVO</strong>
                    <span class="badge ${altScenario.direction === 'LONG' ? 'badge-success' : 'badge-danger'}">${altScenario.direction}</span>
                    <span class="badge badge-info">${altScenario.probability}%</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                    <span style="font-size: 1.3rem;">${altValidity.statusIcon}</span>
                    <strong style="color: ${altValidity.statusColor}; font-size: 1rem;">${statusText}</strong>
                </div>
                <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 5px; margin-bottom: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">Nivel de invalidación:</span>
                        <strong style="color: var(--accent); font-family: 'Courier New', monospace;">${formatNumber(altValidity.invalidationLevel, 2)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">Distancia:</span>
                        <strong style="color: ${altValidity.distance.colorClass === 'distance-close' ? 'var(--success)' : altValidity.distance.colorClass === 'distance-medium' ? '#f39c12' : 'var(--danger)'}; font-family: 'Courier New', monospace;">${altValidity.distance.formatted}</strong>
                    </div>
                    ${altValidity.distance.status ? `
                        <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(235, 87, 87, 0.2); border-radius: 4px;">
                            <strong style="color: var(--danger);"><i data-lucide="alert-triangle" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i>${altValidity.distance.status}</strong>
                        </div>
                    ` : ''}
                </div>
                <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7); font-style: italic;">
                    📝 ${altValidity.condition}
                </div>
            </div>
        `;
    }

    html += `</div>`;

    return html;
}

// ========== PRICE DISTANCE CALCULATOR ==========

function calculateDistance(currentPrice, targetPrice) {
    const diff = targetPrice - currentPrice;
    const diffPercent = (diff / currentPrice) * 100;
    const direction = diff > 0 ? '↑' : '↓';
    const absPercent = Math.abs(diffPercent);

    // Determinar color según distancia
    let colorClass = 'distance-far';
    if (absPercent < 1) colorClass = 'distance-close';
    else if (absPercent < 3) colorClass = 'distance-medium';

    const status = Math.abs(diff) < 0.01 ? 'ALCANZADO' : (diff < 0 ? 'SUPERADO' : '');

    return {
        diff,
        diffPercent,
        direction,
        colorClass,
        status,
        formatted: `${direction} ${formatNumber(Math.abs(diff), 2)} (${formatPercent(diffPercent).replace('+', '')})`
    };
}

function renderPriceDistances(currentPrice, analysis, levels, riskManagement) {
    // Temporalmente oculto - necesita refinamiento
    return '';

    if (!analysis || !analysis.mainScenario) return '';

    const mainScenario = analysis.mainScenario;
    const altScenario = analysis.alternativeScenario;

    // Verificar si el escenario principal está invalidado
    const mainValidity = checkScenarioValidity(currentPrice, mainScenario, riskManagement);
    const isMainInvalidated = mainValidity && mainValidity.status === 'INVALIDATED';
    const collapseId = 'distanceCalculator';
    const isCollapsed = isMainInvalidated;

    let html = `
        <div class="section collapsible-section" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(100, 50, 200, 0.2) 0%, rgba(45, 66, 99, 0.3) 100%); border: 2px solid rgba(100, 50, 200, 0.4);">
            <div class="collapsible-header" onclick="toggleCollapse('${collapseId}')" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;">
                <h2 style="margin: 0;"><i data-lucide="ruler" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;"></i>Calculador de Distancias</h2>
                <span class="collapse-icon" id="${collapseId}-icon" style="font-size: 1.5rem; transition: transform 0.3s ease;">${isCollapsed ? '<i data-lucide="chevron-right" style="width:18px;height:18px;"></i>' : '<i data-lucide="chevron-down" style="width:18px;height:18px;"></i>'}</span>
            </div>
            <div id="${collapseId}" class="collapsible-content" style="display: ${isCollapsed ? 'none' : 'block'};">
                <div style="font-size: 0.85rem; color: rgba(255,255,255,0.6); margin: 1rem 0;">
                    Precio actual: <strong style="color: var(--accent);">${formatNumber(currentPrice, 2)}</strong>
                </div>
    `;

    // Escenario Principal
    html += `
        <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                <strong style="color: var(--accent); font-size: 1.1rem;"><i data-lucide="target" style="width:16px;height:16px;margin-right:6px;vertical-align:middle;"></i>ESCENARIO PRINCIPAL</strong>
                <span class="badge ${mainScenario.direction === 'LONG' ? 'badge-success' : 'badge-danger'}">${mainScenario.direction}</span>
                <span class="badge badge-info">${mainScenario.probability}% prob.</span>
            </div>
            <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px;">
    `;

    // Entry
    if (mainScenario.entry) {
        const dist = calculateDistance(currentPrice, mainScenario.entry);
        html += `
            <div class="distance-row ${dist.colorClass}">
                <span class="distance-label">Entry:</span>
                <span class="distance-value">${formatNumber(mainScenario.entry, 2)}</span>
                <span class="distance-calc">${dist.formatted}</span>
                ${dist.status ? `<span class="distance-status">${dist.status}</span>` : ''}
            </div>
        `;
    }

    // Stop Loss
    if (mainScenario.stopLoss) {
        const dist = calculateDistance(currentPrice, mainScenario.stopLoss);
        html += `
            <div class="distance-row ${dist.colorClass}">
                <span class="distance-label">Stop Loss:</span>
                <span class="distance-value">${formatNumber(mainScenario.stopLoss, 2)}</span>
                <span class="distance-calc">${dist.formatted}</span>
                ${dist.status ? `<span class="distance-status">${dist.status}</span>` : ''}
            </div>
        `;
    }

    // Targets
    if (mainScenario.targets && mainScenario.targets.length > 0) {
        mainScenario.targets.forEach((target, index) => {
            const dist = calculateDistance(currentPrice, target.level);
            html += `
                <div class="distance-row ${dist.colorClass}">
                    <span class="distance-label">Target ${index + 1}:</span>
                    <span class="distance-value">${formatNumber(target.level, 2)}</span>
                    <span class="distance-calc">${dist.formatted}</span>
                    ${dist.status ? `<span class="distance-status">${dist.status}</span>` : ''}
                    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 0.25rem; grid-column: 1 / -1;">
                        ${target.description} (R/R: ${target.rr})
                    </div>
                </div>
            `;
        });
    }

    html += `</div></div>`;

    // Escenario Alternativo
    if (altScenario) {
        html += `
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <strong style="color: rgba(255,255,255,0.7); font-size: 1rem;">🔄 ESCENARIO ALTERNATIVO</strong>
                    <span class="badge ${altScenario.direction === 'LONG' ? 'badge-success' : 'badge-danger'}">${altScenario.direction}</span>
                    <span class="badge badge-info">${altScenario.probability}% prob.</span>
                </div>
                <div style="background: rgba(0,0,0,0.15); padding: 1rem; border-radius: 8px;">
        `;

        if (altScenario.entry) {
            const dist = calculateDistance(currentPrice, altScenario.entry);
            html += `
                <div class="distance-row ${dist.colorClass}">
                    <span class="distance-label">Entry:</span>
                    <span class="distance-value">${formatNumber(altScenario.entry, 2)}</span>
                    <span class="distance-calc">${dist.formatted}</span>
                    ${dist.status ? `<span class="distance-status">${dist.status}</span>` : ''}
                </div>
            `;
        }

        if (altScenario.stopLoss) {
            const dist = calculateDistance(currentPrice, altScenario.stopLoss);
            html += `
                <div class="distance-row ${dist.colorClass}">
                    <span class="distance-label">Stop Loss:</span>
                    <span class="distance-value">${formatNumber(altScenario.stopLoss, 2)}</span>
                    <span class="distance-calc">${dist.formatted}</span>
                    ${dist.status ? `<span class="distance-status">${dist.status}</span>` : ''}
                </div>
            `;
        }

        if (altScenario.targets && altScenario.targets.length > 0) {
            altScenario.targets.forEach((target, index) => {
                const dist = calculateDistance(currentPrice, target.level);
                html += `
                    <div class="distance-row ${dist.colorClass}">
                        <span class="distance-label">Target ${index + 1}:</span>
                        <span class="distance-value">${formatNumber(target.level, 2)}</span>
                        <span class="distance-calc">${dist.formatted}</span>
                        ${dist.status ? `<span class="distance-status">${dist.status}</span>` : ''}
                        <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 0.25rem; grid-column: 1 / -1;">
                            ${target.description} (R/R: ${target.rr})
                        </div>
                    </div>
                `;
            });
        }

        html += `</div></div>`;
    }

    // Niveles Técnicos Clave
    if (levels && (levels.resistances || levels.supports)) {
        html += `
            <div>
                <strong style="color: var(--accent); font-size: 1.1rem; display: block; margin-bottom: 1rem;">🎯 NIVELES TÉCNICOS CLAVE</strong>
                <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px;">
        `;

        // Resistencias
        if (levels.resistances && levels.resistances.length > 0) {
            html += `<div style="margin-bottom: 1rem;"><strong style="color: rgba(235, 87, 87, 1);">Resistencias:</strong></div>`;
            levels.resistances.forEach((res, index) => {
                const dist = calculateDistance(currentPrice, res.level);
                html += `
                    <div class="distance-row ${dist.colorClass}">
                        <span class="distance-label">R${index + 1}:</span>
                        <span class="distance-value">${formatNumber(res.level, 2)}</span>
                        <span class="distance-calc">${dist.formatted}</span>
                        ${dist.status ? `<span class="distance-status">${dist.status}</span>` : ''}
                        <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 0.25rem; grid-column: 1 / -1;">
                            ${res.type} - ${res.strength}
                        </div>
                    </div>
                `;
            });
        }

        // Soportes
        if (levels.supports && levels.supports.length > 0) {
            html += `<div style="margin-top: 1rem; margin-bottom: 1rem;"><strong style="color: rgba(39, 174, 96, 1);">Soportes:</strong></div>`;
            levels.supports.forEach((sup, index) => {
                const dist = calculateDistance(currentPrice, sup.level);
                html += `
                    <div class="distance-row ${dist.colorClass}">
                        <span class="distance-label">S${index + 1}:</span>
                        <span class="distance-value">${formatNumber(sup.level, 2)}</span>
                        <span class="distance-calc">${dist.formatted}</span>
                        ${dist.status ? `<span class="distance-status">${dist.status}</span>` : ''}
                        <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 0.25rem; grid-column: 1 / -1;">
                            ${sup.type} - ${sup.strength}
                        </div>
                    </div>
                `;
            });
        }

        html += `</div></div>`;
    }

    html += `
            </div>
        </div>`;

    return html;
}

function renderDetail(data) {
    currentData = data;
    console.log(">>>>> current data set to:", currentData);
    const container = document.getElementById('detailContent');

    if (!data || !data.price || !data.instrument) {
        container.innerHTML = '<div class="error-message">Error: Estructura de datos inválida. Por favor revisa la consola.</div>';
        return;
    }

    const priceChangeClass = data.price.change >= 0 ? 'positive' : 'negative';
    const priceChangeSymbol = data.price.change >= 0 ? '▲' : '▼';

    container.innerHTML = `
        <div class="disclaimer">
            <div class="disclaimer-icon"><i data-lucide="alert-triangle" style="width:24px;height:24px;color:#f59e0b;"></i></div>
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

        <div id="realtimePriceContainer" class="realtime-price-box" style="margin-bottom: 1.5rem;">
            <div class="realtime-price-header">
                <h3 style="margin: 0; font-size: 1.2rem; color: var(--accent);"><i data-lucide="activity" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;"></i>Precio Actual</h3>
                <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 0.25rem;">
                    Obteniendo...
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
                    <p style="font-weight: 600; color: var(--accent); margin-bottom: 0.75rem;"><i data-lucide="gauge" style="width:16px;height:16px;margin-right:6px;vertical-align:middle;"></i>Contexto Fear & Greed</p>
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
                            <strong><i data-lucide="alert-triangle" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;color:#f59e0b;"></i>Divergencia:</strong> ${data.fearGreedContext.divergenceDescription}
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
                    <p style="font-weight: 600; color: var(--accent); margin-bottom: 0.75rem;"><i data-lucide="globe" style="width:16px;height:16px;margin-right:6px;vertical-align:middle;"></i>Contexto Geopolítico</p>
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
                        <strong>${data.geopoliticalContext.confluentWithTechnicals ? '<i data-lucide="check" style="width:12px;height:12px;margin-right:4px;vertical-align:middle;color:#22c55e;"></i>' : '<i data-lucide="alert-triangle" style="width:12px;height:12px;margin-right:4px;vertical-align:middle;color:#f59e0b;"></i>'} Análisis Técnico:</strong> ${data.geopoliticalContext.confluentWithTechnicals ? 'Confluente' : 'Divergente'}
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

            ${generateProgressBar(data.analysis.mainScenario, data.price.current, data.analysis.mainScenario.direction, 'main')}

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

                ${generateProgressBar(data.analysis.alternativeScenario, data.price.current, data.analysis.alternativeScenario.direction, 'alternative')}

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
                <h2><i data-lucide="chart-line" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;"></i>Análisis de Swing</h2>

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
                        <strong style="color: var(--accent); margin-bottom: 0.75rem; display: block;"><i data-lucide="bar-chart-2" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;"></i>Métricas del Swing</strong>

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
                        <strong style="color: rgba(147, 51, 234, 1); margin-bottom: 0.75rem; display: block;"><i data-lucide="lightbulb" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;"></i>Recomendación de Entrada</strong>

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

        ${renderScenarioValidation(data.price.current, data.analysis, data.riskManagement)}

        ${renderTrackingStatus(data)}

        ${renderEvents(data)}

        ${renderPriceDistances(data.price.current, data.analysis, data.levels, data.riskManagement)}

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
                <h2><i data-lucide="layers" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;"></i>Tendencia Multi-Temporal</h2>
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
                <h2><i data-lucide="trending-up" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;"></i>Medias Móviles (EMA)</h2>
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
                <h2><i data-lucide="activity" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;"></i>Indicadores Técnicos</h2>
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
                <h2><i data-lucide="globe" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;"></i>Correlaciones Macro</h2>
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
            <h2><i data-lucide="shield" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;"></i>Gestión de Riesgo</h2>
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

        <div class="ask-question-container">
            <div class="ask-question-title">
                <span>💬</span> Pregunta sobre este análisis
            </div>
            <div class="ask-question-form">
                <textarea
                    id="askQuestionTextarea"
                    class="ask-question-textarea"
                    placeholder="Escribe tu pregunta sobre este instrumento (máx. 200 caracteres)..."
                    maxlength="200"
                    oninput="updateQuestionCounter()"
                    onkeydown="handleQuestionKeydown(event)"
                ></textarea>
                <div class="ask-question-footer">
                    <span id="askQuestionCounter" class="ask-question-counter">0/200</span>
                    <button id="askQuestionBtn" class="ask-question-btn" onclick="submitQuestion('${data._id}')">
                        Enviar
                    </button>
                </div>
            </div>
            <div id="askQuestionResponse" class="ask-question-response">
                <div class="ask-question-response-text"></div>
            </div>
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

// ========== ASK QUESTION FUNCTIONS ==========

function updateQuestionCounter() {
    const textarea = document.getElementById('askQuestionTextarea');
    const counter = document.getElementById('askQuestionCounter');
    const length = textarea.value.length;

    counter.textContent = `${length}/200`;

    if (length >= 200) {
        counter.classList.add('limit-reached');
    } else {
        counter.classList.remove('limit-reached');
    }
}

function handleQuestionKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const btn = document.getElementById('askQuestionBtn');
        if (!btn.disabled) {
            btn.click();
        }
    }
}

async function submitQuestion(recordId) {
    const textarea = document.getElementById('askQuestionTextarea');
    const btn = document.getElementById('askQuestionBtn');
    const responseContainer = document.getElementById('askQuestionResponse');
    const responseText = responseContainer.querySelector('.ask-question-response-text');

    const question = textarea.value.trim();

    if (!question) {
        return;
    }

    // Deshabilitar el botón y mostrar loading
    btn.disabled = true;
    btn.innerHTML = 'Enviando...';

    // Mostrar spinner en la respuesta
    responseContainer.classList.remove('error');
    responseContainer.classList.add('visible', 'loading');
    responseText.innerHTML = '<div class="spinner" style="width: 30px; height: 30px; margin: 0;"></div>';

    try {
        const encodedQuestion = encodeURIComponent(question);
        const response = await fetch(`${API_BASE_URL}/ask/${recordId}?q=${encodedQuestion}`);

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Mostrar la respuesta formateada
        responseContainer.classList.remove('loading', 'error');

        const responseData = data.data;
        const answer = responseData?.answer || data.answer || data.response;

        if (answer) {
            // Formatear la respuesta de manera legible
            const instrument = responseData?.instrument;
            const questionAsked = responseData?.question || question;

            let formattedHTML = `
                <div class="ask-response-question">
                    <strong>Tu pregunta:</strong>
                    <p>${escapeHtml(questionAsked)}</p>
                </div>
                <div class="ask-response-answer">
                    <strong>Respuesta:</strong>
                    <p>${formatAnswerText(answer)}</p>
                </div>
            `;

            // Agregar información del instrumento si está disponible
            if (instrument) {
                formattedHTML += `
                    <div class="ask-response-instrument">
                        <span class="ask-response-badge">${instrument.symbol || ''}</span>
                        <span class="ask-response-timeframe">${instrument.timeframe || ''}</span>
                    </div>
                `;
            }

            responseText.innerHTML = formattedHTML;
        } else {
            responseText.innerHTML = '<p class="ask-response-error">No se recibió una respuesta válida.</p>';
        }

    } catch (error) {
        console.error('[Ask Question] Error:', error);
        responseContainer.classList.remove('loading');
        responseContainer.classList.add('error');
        responseText.innerHTML = `<p class="ask-response-error">Error al obtener respuesta: ${escapeHtml(error.message)}</p>`;
    } finally {
        // Rehabilitar el botón
        btn.disabled = false;
        btn.innerHTML = 'Enviar';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatAnswerText(text) {
    if (!text) return '';

    // Escapar HTML primero
    let formatted = escapeHtml(text);

    // Convertir saltos de línea en párrafos
    formatted = formatted.split('\n\n').map(para => `<p>${para}</p>`).join('');
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
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

    // Conectar al WebSocket para precios en tiempo real
    connectWebSocket();
}

document.addEventListener('DOMContentLoaded', init);
