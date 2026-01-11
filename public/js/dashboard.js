// ========== KTI PROFESSIONAL TRADING DASHBOARD ==========
// Main application orchestrator

import * as API from './core/api.js';
import { askQuestion } from './core/api.js';
import { connectWebSocket, onPriceUpdate, onConnectionStatusChange, realtimePrices } from './core/websocket.js';
import { Storage, Preferences, STORAGE_KEYS } from './core/storage.js';
import { getState, setState, subscribe, APP_VERSION } from './core/state.js';
import { formatNumber, formatPercent, formatDate, formatRelativeTime } from './utils/formatters.js';

import { TickerTape } from './components/ticker-tape.js';
import { Watchlist } from './components/watchlist.js';
import { QuotesTable } from './components/quotes-table.js';
import { HeatMap } from './components/heatmap.js';
import { AlertManager } from './components/alerts.js';
import { Screener } from './components/screener.js';
import { setupDefaultShortcuts } from './utils/keyboard.js';

class DashboardApp {
    constructor() {
        this.tickerTape = null;
        this.watchlist = null;
        this.quotesTable = null;
        this.heatmap = null;
        this.alertManager = null;
        this.screener = null;
        this.keyboard = null;

        this.allSymbols = [];
        this.symbolTypes = [];
        this.opportunities = [];
        this.marketIndexes = null;
        this.symbolsData = []; // Símbolos únicos desde /symbols/data
        this.symbolReports = {}; // Cache de reportes por símbolo

        this.activeTab = 'overview';
        this.selectedSymbol = null;
        this.expandedSymbol = null; // Símbolo expandido para mostrar reportes
    }

    async init() {
        console.log('[KTI] Initializing Dashboard v' + APP_VERSION);

        // Check version
        this.checkVersion();

        // Show splash
        await this.showSplash();

        // Initialize components
        this.initComponents();

        // Setup keyboard shortcuts
        this.keyboard = setupDefaultShortcuts(this);

        // Load data
        await this.loadInitialData();

        // Connect WebSocket
        this.initWebSocket();

        // Setup event listeners
        this.setupEventListeners();

        // Update time
        this.startTimeUpdater();

        // Request notification permission
        if (this.alertManager) {
            this.alertManager.requestNotificationPermission();
        }

        console.log('[KTI] Dashboard ready');
    }

    checkVersion() {
        const storedVersion = Storage.get(STORAGE_KEYS.VERSION);
        if (storedVersion !== APP_VERSION) {
            console.log('[KTI] Version updated, clearing caches...');
            Storage.set(STORAGE_KEYS.VERSION, APP_VERSION);
        }
    }

    // Mapeo de símbolos de instrumentos a símbolos del WebSocket
    extractWsSymbol(instrumentSymbol) {
        if (!instrumentSymbol) return null;

        const symbol = instrumentSymbol.toUpperCase();

        // Mapeo de símbolos forex/commodities a códigos WS
        if (symbol.includes('XAU') || symbol === 'GOLD') return 'GOLD';
        if (symbol.includes('XAG') || symbol === 'SILVER') return 'SILVER';
        if (symbol.includes('XCU') || symbol === 'COPPER') return 'COPPER';
        if (symbol.includes('XPT') || symbol === 'PLATINUM') return 'PLATINUM';
        if (symbol.includes('XPD') || symbol === 'PALLADIUM') return 'PALLADIUM';

        // Para otros símbolos (crypto, indices, etc.), usar el símbolo base
        // Remover sufijos comunes como .P, _PERP, etc.
        let wsSymbol = symbol
            .replace(/\.P$/, '')
            .replace(/_PERP$/, '')
            .replace(/USDT$/, 'USD'); // BTCUSDT -> BTCUSD

        return wsSymbol;
    }

    async showSplash() {
        const splash = document.getElementById('splash');
        if (splash) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            splash.style.opacity = '0';
            splash.style.transition = 'opacity 0.5s ease';
            await new Promise(resolve => setTimeout(resolve, 500));
            splash.style.display = 'none';
        }
    }

    initComponents() {
        // Ticker Tape
        const tickerContainer = document.getElementById('ticker-tape-container');
        if (tickerContainer) {
            this.tickerTape = new TickerTape(tickerContainer);
        }

        // Watchlist
        const watchlistContent = document.getElementById('watchlist-content');
        if (watchlistContent) {
            this.watchlist = new Watchlist(watchlistContent, {
                onSelect: (code) => this.selectSymbol(code),
                onRemove: (code) => this.onWatchlistRemove(code)
            });
        }

        // Quotes Table
        const quotesTable = document.getElementById('quotes-table');
        if (quotesTable) {
            this.quotesTable = new QuotesTable(quotesTable, {
                onSelect: (code) => this.selectSymbol(code)
            });
        }

        // Heat Map
        const heatmapContainer = document.getElementById('heatmap-container');
        if (heatmapContainer) {
            this.heatmap = new HeatMap(heatmapContainer, {
                onSelect: (code) => this.selectSymbol(code)
            });
        }

        // Alerts
        const alertsPanel = document.getElementById('alerts-panel');
        if (alertsPanel) {
            this.alertManager = new AlertManager(alertsPanel, {
                onTrigger: (alert, value) => this.onAlertTrigger(alert, value)
            });
        }

        // Screener
        const screenerContainer = document.getElementById('tab-screener');
        if (screenerContainer) {
            this.screener = new Screener(screenerContainer, {
                onSelect: (code) => this.selectSymbol(code)
            });
        }

        // Apply saved preferences
        const prefs = Preferences.get();
        if (prefs.compactMode) {
            document.getElementById('dashboard-grid')?.classList.add('compact');
        }
    }

    async loadInitialData() {
        try {
            // Load symbols data (unique symbols)
            const symbolsResponse = await API.fetchSymbolsData();
            this.symbolsData = symbolsResponse.symbols || [];
            this.symbolTypes = symbolsResponse.symbolTypes || [];
            console.log('[KTI] Loaded unique symbols:', this.symbolsData.length);
            console.log('[KTI] Loaded symbol types:', this.symbolTypes.length);

            // Build allSymbols from unique symbols data
            this.allSymbols = this.symbolsData.map(sym => {
                const wsSymbol = this.extractWsSymbol(sym.code);
                return {
                    code: sym.code,
                    symbol: sym.code,
                    wsSymbol: wsSymbol,
                    name: sym.name,
                    fullName: sym.fullName,
                    emoji: sym.emoji || sym.icon,
                    type: sym.type,
                    category: sym.category,
                    color: sym.color,
                    tradingCode: sym.tradingCode,
                    appSymbolCode: sym.appSymbolCode,
                    price: null,
                    change: null,
                    changePercent: null
                };
            });

            // Load market indexes
            this.marketIndexes = await API.fetchMarketIndexes();
            console.log('[KTI] Loaded market indexes:', this.marketIndexes);

            // Update components
            this.updateComponents();

        } catch (error) {
            console.error('[KTI] Error loading data:', error);
        }
    }

    updateComponents() {
        // Update Ticker Tape
        if (this.tickerTape) {
            this.tickerTape.setSymbols(this.allSymbols);
        }

        // Update Quotes Table
        if (this.quotesTable) {
            this.quotesTable.setData(this.allSymbols);
        }

        // Update Heat Map
        if (this.heatmap && this.symbolTypes.length > 0) {
            const sectors = this.symbolTypes.map(type => ({
                code: type.code,
                name: type.name,
                emoji: type.icon,
                symbols: this.allSymbols.filter(s => {
                    // Match symbols to types (simplified matching)
                    return true; // For now, show all in each sector
                })
            }));
            console.log('[KTI] HeatMap sectors sample - full object:', JSON.stringify(sectors[0]?.symbols?.slice(0, 2), null, 2));
            console.log('[KTI] allSymbols sample:', JSON.stringify(this.allSymbols.slice(0, 2), null, 2));
            this.heatmap.setData(sectors);
        }

        // Update Screener
        if (this.screener) {
            this.screener.setData(this.opportunities);
        }

        // Update Market Summary
        this.updateMarketSummary();

        // Update Top Movers
        this.updateTopMovers();

        // Update alerts count
        this.updateAlertsCount();
    }

    updateMarketSummary() {
        if (!this.marketIndexes) return;

        const fearGreedData = this.marketIndexes.fearGreedIndex;
        const defconData = this.marketIndexes.pentagonPizzaIndex;

        // Fear & Greed - Stock Market
        if (fearGreedData?.markets?.stock) {
            const stockData = fearGreedData.markets.stock;
            const fgStockValue = document.getElementById('fg-stock-value');
            const fgStockStatus = document.getElementById('fg-stock-status');
            const fgStock = document.getElementById('fg-stock');

            if (fgStockValue) {
                fgStockValue.textContent = stockData.value || '--';
                fgStockValue.className = `fg-market-value ${this.getFearGreedClass(stockData.value)}`;
            }
            if (fgStockStatus) {
                fgStockStatus.textContent = stockData.label || '';
                fgStockStatus.className = `fg-market-status ${this.getFearGreedClass(stockData.value)}`;
            }
        }

        // Fear & Greed - Crypto Market
        if (fearGreedData?.markets?.crypto) {
            const cryptoData = fearGreedData.markets.crypto;
            const fgCryptoValue = document.getElementById('fg-crypto-value');
            const fgCryptoStatus = document.getElementById('fg-crypto-status');

            if (fgCryptoValue) {
                fgCryptoValue.textContent = cryptoData.value || '--';
                fgCryptoValue.className = `fg-market-value ${this.getFearGreedClass(cryptoData.value)}`;
            }
            if (fgCryptoStatus) {
                fgCryptoStatus.textContent = cryptoData.label || '';
                fgCryptoStatus.className = `fg-market-status ${this.getFearGreedClass(cryptoData.value)}`;
            }
        }

        // Fear & Greed - Divergence
        if (fearGreedData?.divergence?.isDivergent) {
            const divergenceEl = document.getElementById('fg-divergence');
            const divergenceText = document.getElementById('fg-divergence-text');
            if (divergenceEl && divergenceText) {
                divergenceEl.style.display = 'flex';
                const diff = fearGreedData.divergence.divergence;
                divergenceText.textContent = `Divergencia: ${diff} pts entre Stock y Crypto`;
            }
        }

        // DEFCON Level
        if (defconData) {
            const level = defconData.defconLevel || defconData.geopoliticalContext?.defconLevel || '--';
            const defconValue = document.getElementById('defcon-value');
            const defconCircle = document.getElementById('defcon-circle');
            const defconStatus = document.getElementById('defcon-status');
            const defconRisk = document.getElementById('defcon-risk');
            const defconAnomaly = document.getElementById('defcon-anomaly');

            if (defconValue) defconValue.textContent = level;
            if (defconCircle) defconCircle.className = `defcon-level-circle defcon-${level}`;
            if (defconStatus) {
                defconStatus.textContent = defconData.status || 'UNKNOWN';
                defconStatus.className = `defcon-badge status-${(defconData.status || '').toLowerCase()}`;
            }
            if (defconRisk) {
                defconRisk.textContent = defconData.riskClassification || '--';
                defconRisk.className = `defcon-badge risk-${(defconData.riskClassification || '').toLowerCase()}`;
            }
            if (defconAnomaly && defconData.anomalyDetected) {
                defconAnomaly.style.display = 'flex';
            }
        }
    }

    getFearGreedClass(value) {
        if (value >= 75) return 'extreme-greed';
        if (value >= 55) return 'greed';
        if (value >= 45) return 'neutral';
        if (value >= 25) return 'fear';
        return 'extreme-fear';
    }

    updateTopMovers() {
        const sorted = [...this.allSymbols].sort((a, b) =>
            Math.abs(b.changePercent || 0) - Math.abs(a.changePercent || 0)
        );

        const gainers = sorted.filter(s => (s.changePercent || 0) > 0).slice(0, 5);
        const losers = sorted.filter(s => (s.changePercent || 0) < 0).slice(0, 5);

        const gainersList = document.getElementById('gainers-list');
        const losersList = document.getElementById('losers-list');

        if (gainersList) {
            gainersList.innerHTML = gainers.map(g => `
                <div class="mover-item" data-code="${g.code}">
                    <span class="mover-symbol">${g.symbol || g.code}</span>
                    <span class="mover-change gain">+${(g.changePercent || 0).toFixed(2)}%</span>
                </div>
            `).join('') || '<div class="no-data">No gainers</div>';
        }

        if (losersList) {
            losersList.innerHTML = losers.map(l => `
                <div class="mover-item" data-code="${l.code}">
                    <span class="mover-symbol">${l.symbol || l.code}</span>
                    <span class="mover-change loss">${(l.changePercent || 0).toFixed(2)}%</span>
                </div>
            `).join('') || '<div class="no-data">No losers</div>';
        }
    }

    initWebSocket() {
        connectWebSocket();

        onPriceUpdate((wsSymbol, priceData) => {
            // Update all components with new price (usan data-ws-symbol para el mapeo)
            if (this.tickerTape) this.tickerTape.updatePrice(wsSymbol, priceData);
            if (this.watchlist) this.watchlist.updatePrice(wsSymbol, priceData);
            if (this.quotesTable) this.quotesTable.updatePrice(wsSymbol, priceData);
            if (this.heatmap) this.heatmap.updatePrice(wsSymbol, priceData);

            // Check alerts
            if (this.alertManager) {
                this.alertManager.checkPrice(wsSymbol, priceData.price);
            }

            // Update local data - buscar por wsSymbol
            const matchingSymbols = this.allSymbols.filter(s => s.wsSymbol === wsSymbol);
            matchingSymbols.forEach(symbolData => {
                symbolData.price = priceData.price;
                symbolData.change = priceData.change;
                symbolData.changePercent = priceData.changePercent;
            });

            // Update details if viewing a symbol that matches this wsSymbol
            const selectedData = this.allSymbols.find(s => s.code === this.selectedSymbol);
            if (selectedData && selectedData.wsSymbol === wsSymbol) {
                this.updateDetailsPrice(priceData);
            }
        });

        onConnectionStatusChange((status) => {
            const dot = document.getElementById('ws-status-dot');
            const text = document.getElementById('ws-status-text');

            if (dot) {
                dot.className = 'status-dot';
                if (status === 'connected') dot.classList.add('connected');
                else if (status === 'connecting') dot.classList.add('connecting');
            }

            if (text) {
                text.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            }
        });
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // Modal close buttons
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Modal overlays
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeModal();
            });
        });

        // Add to watchlist button
        document.getElementById('btn-add-watchlist')?.addEventListener('click', () => {
            this.openModal('modal-add-watchlist');
        });

        // Browse symbols button
        document.getElementById('btn-browse-symbols')?.addEventListener('click', () => {
            this.openModal('modal-add-watchlist');
        });

        // New alert button
        document.getElementById('btn-new-alert')?.addEventListener('click', () => {
            this.openModal('modal-create-alert');
        });

        // Close details button
        document.getElementById('btn-close-details')?.addEventListener('click', () => {
            this.toggleDetails();
        });

        // Symbol search
        const searchInput = document.getElementById('search-symbol');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchSymbols(e.target.value);
            });
        }

        // Create alert form
        document.getElementById('btn-create-alert')?.addEventListener('click', () => {
            this.createAlertFromModal();
        });

        // Top movers click
        document.getElementById('top-movers')?.addEventListener('click', (e) => {
            const item = e.target.closest('.mover-item');
            if (item) this.selectSymbol(item.dataset.code);
        });
    }

    // ========== TAB MANAGEMENT ==========

    switchTab(tabId) {
        this.activeTab = tabId;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });
    }

    // ========== PANEL MANAGEMENT ==========

    toggleWatchlist() {
        const grid = document.getElementById('dashboard-grid');
        grid?.classList.toggle('hide-watchlist');
    }

    toggleDetails() {
        const panel = document.getElementById('details-panel');
        panel?.classList.toggle('open');
    }

    toggleCompactMode() {
        const grid = document.getElementById('dashboard-grid');
        grid?.classList.toggle('compact');

        const isCompact = grid?.classList.contains('compact');
        Preferences.set({ compactMode: isCompact });
    }

    // ========== SYMBOL SELECTION ==========

    async selectSymbol(code) {
        console.log('[KTI] selectSymbol called with code:', code);

        // Toggle expanded symbol - if clicking same symbol, collapse it
        if (this.expandedSymbol === code) {
            this.expandedSymbol = null;
            this.hideReportsPanel();
            return;
        }

        this.selectedSymbol = code;
        this.expandedSymbol = code;

        // Update watchlist selection
        if (this.watchlist) this.watchlist.selectSymbol(code);

        // Update table selection
        if (this.quotesTable) this.quotesTable.selectRow(code);

        // Load and show reports for this symbol
        await this.loadSymbolReports(code);
    }

    async loadSymbolReports(code) {
        const detailsContent = document.getElementById('details-content');
        const detailsTitle = document.getElementById('details-title');
        const detailsEmpty = document.getElementById('details-empty');
        const panel = document.getElementById('details-panel');

        if (!detailsContent || !panel) return;

        // Open panel and show loading
        panel.classList.add('open');
        if (detailsEmpty) detailsEmpty.style.display = 'none';

        const symbolData = this.allSymbols.find(s => s.code === code);
        if (detailsTitle) {
            detailsTitle.textContent = `${symbolData?.emoji || ''} ${symbolData?.name || code}`;
        }

        detailsContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando reportes...</p></div>';

        try {
            // Check cache first
            if (!this.symbolReports[code]) {
                const reports = await API.fetchSymbolResults(code);
                this.symbolReports[code] = reports;
            }

            const reports = this.symbolReports[code];
            console.log('[KTI] Loaded reports for', code, ':', reports.length);

            detailsContent.innerHTML = this.renderReportsList(code, reports, symbolData);

            // Add click handlers for report items
            this.setupReportClickHandlers();

        } catch (error) {
            console.error('[KTI] Error loading reports:', error);
            detailsContent.innerHTML = '<div class="empty-state"><p>Error al cargar reportes</p></div>';
        }
    }

    renderReportsList(code, reports, symbolData) {
        if (!reports || reports.length === 0) {
            return `
                <div class="reports-header">
                    <div class="symbol-info">
                        <span class="symbol-emoji">${symbolData?.emoji || ''}</span>
                        <div class="symbol-details">
                            <h4>${symbolData?.name || code}</h4>
                            <span class="symbol-fullname">${symbolData?.fullName || ''}</span>
                        </div>
                    </div>
                </div>
                <div class="empty-state">
                    <p>No hay reportes disponibles para este símbolo</p>
                </div>
            `;
        }

        const reportsHTML = reports.map((report, index) => {
            const date = report.date || report._processing?.processedAt;
            const formattedDate = date ? new Date(date).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'Sin fecha';

            const timeframe = report.instrument?.timeframe || '--';
            const assetType = report.instrument?.assetType || '--';

            return `
                <div class="report-item" data-report-id="${report._id}" data-index="${index}">
                    <div class="report-main">
                        <div class="report-timeframe">${timeframe}</div>
                        <div class="report-info">
                            <span class="report-date">${formattedDate}</span>
                            <span class="report-type">${assetType}</span>
                        </div>
                    </div>
                    <div class="report-arrow">→</div>
                </div>
            `;
        }).join('');

        return `
            <div class="reports-header">
                <div class="symbol-info">
                    <span class="symbol-emoji">${symbolData?.emoji || ''}</span>
                    <div class="symbol-details">
                        <h4>${symbolData?.name || code}</h4>
                        <span class="symbol-fullname">${symbolData?.fullName || ''}</span>
                        <span class="symbol-type">${symbolData?.type || ''}</span>
                    </div>
                </div>
                <div class="reports-count">${reports.length} reporte${reports.length !== 1 ? 's' : ''}</div>
            </div>
            <div class="reports-list">
                ${reportsHTML}
            </div>
        `;
    }

    setupReportClickHandlers() {
        const reportItems = document.querySelectorAll('.report-item');
        reportItems.forEach(item => {
            item.addEventListener('click', () => {
                const reportId = item.dataset.reportId;
                this.openReportDetail(reportId);
            });
        });
    }

    async openReportDetail(reportId) {
        console.log('[KTI] Opening report detail:', reportId);
        try {
            const detail = await API.fetchSymbolDetail(reportId);
            if (detail) {
                // Show detailed view
                this.showReportDetailModal(detail);
            }
        } catch (error) {
            console.error('[KTI] Error loading report detail:', error);
        }
    }

    showReportDetailModal(detail) {
        const detailsContent = document.getElementById('details-content');
        if (!detailsContent) return;

        const signal = detail.analysis?.mainScenario;
        const altSignal = detail.analysis?.alternativeScenario;
        const price = detail.price;
        const trend = detail.trend;
        const indicators = detail.indicators;
        const levels = detail.levels;
        const correlations = detail.correlations;
        const patterns = detail.patterns;
        const swing = detail.swingAnalysis;
        const fearGreed = detail.fearGreedContext;
        const geopolitical = detail.geopoliticalContext;
        const risk = detail.riskManagement;
        const summary = detail.summary;

        detailsContent.innerHTML = `
            <div class="report-detail">
                <button class="btn-back" onclick="app.loadSymbolReports('${this.expandedSymbol}')">← Volver a reportes</button>

                <!-- Header con precio -->
                <div class="detail-section">
                    <div class="detail-header">
                        <span class="detail-emoji">${detail.instrument?.emoji || ''}</span>
                        <div class="detail-info">
                            <h4>${detail.instrument?.name || detail.instrument?.symbol}</h4>
                            <span class="detail-timeframe">${detail.instrument?.timeframe || ''} • ${detail.instrument?.assetType || ''}</span>
                        </div>
                        ${detail.status ? `<span class="status-badge status-${detail.status.toLowerCase()}">${detail.status}</span>` : ''}
                    </div>

                    ${price ? `
                    <div class="detail-price" id="detail-price-container">
                        <div class="price-main">${formatNumber(price?.current, 2)}</div>
                        <div class="price-change ${(price?.changePercent || 0) >= 0 ? 'bullish' : 'bearish'}">
                            ${formatPercent(price?.changePercent)} (${formatNumber(price?.change, 2)})
                        </div>
                        <div class="price-range">
                            <span>L: ${formatNumber(price?.low, 2)}</span>
                            <span>H: ${formatNumber(price?.high, 2)}</span>
                            <span>O: ${formatNumber(price?.open, 2)}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Summary -->
                ${summary ? `
                <div class="detail-section summary-section">
                    <h5>Resumen</h5>
                    <p class="summary-text">${summary.currentSituation || ''}</p>
                    ${summary.macroContext ? `<p class="summary-macro"><strong>Contexto Macro:</strong> ${summary.macroContext}</p>` : ''}
                    ${summary.mainRecommendation ? `<p class="summary-recommendation"><strong>Recomendación:</strong> ${summary.mainRecommendation}</p>` : ''}
                    ${summary.keyLevels ? `<p class="summary-levels"><strong>Niveles clave:</strong> ${summary.keyLevels}</p>` : ''}
                </div>
                ` : ''}

                <!-- Main Scenario -->
                ${signal ? `
                <div class="detail-section">
                    <h5>Escenario Principal</h5>
                    <div class="scenario-info">
                        <span class="signal-badge ${signal.direction?.toLowerCase()}">${signal.direction}</span>
                        <span class="probability">${signal.probability}%</span>
                    </div>
                    ${signal.reasoning ? `<p class="scenario-reasoning">${signal.reasoning}</p>` : ''}
                    <div class="scenario-levels">
                        <div class="level-row">
                            <span class="level-label">Entry</span>
                            <span class="level-value">${formatNumber(signal.entry, 2)}</span>
                        </div>
                        <div class="level-row">
                            <span class="level-label">Stop Loss</span>
                            <span class="level-value stop">${formatNumber(signal.stopLoss, 2)}</span>
                        </div>
                        ${signal.targets?.map((t, i) => `
                            <div class="level-row">
                                <span class="level-label">Target ${i + 1}</span>
                                <span class="level-value target">${formatNumber(t.level, 2)} <small>(${t.rr})</small></span>
                            </div>
                        `).join('') || ''}
                    </div>
                </div>
                ` : ''}

                <!-- Alternative Scenario -->
                ${altSignal ? `
                <div class="detail-section alt-scenario">
                    <h5>Escenario Alternativo</h5>
                    <div class="scenario-info">
                        <span class="signal-badge ${altSignal.direction?.toLowerCase()}">${altSignal.direction}</span>
                        <span class="probability">${altSignal.probability}%</span>
                    </div>
                    ${altSignal.condition ? `<p class="scenario-condition"><strong>Condición:</strong> ${altSignal.condition}</p>` : ''}
                    <div class="scenario-levels">
                        <div class="level-row">
                            <span class="level-label">Entry</span>
                            <span class="level-value">${formatNumber(altSignal.entry, 2)}</span>
                        </div>
                        <div class="level-row">
                            <span class="level-label">Stop Loss</span>
                            <span class="level-value stop">${formatNumber(altSignal.stopLoss, 2)}</span>
                        </div>
                        ${altSignal.targets?.map((t, i) => `
                            <div class="level-row">
                                <span class="level-label">Target ${i + 1}</span>
                                <span class="level-value target">${formatNumber(t.level, 2)} <small>(${t.rr})</small></span>
                            </div>
                        `).join('') || ''}
                    </div>
                </div>
                ` : ''}

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
                            <div class="ind-row"><span>RSI</span><span class="${this.getRsiClass(indicators.momentum.rsi)}">${formatNumber(indicators.momentum.rsi, 1)}</span></div>
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
                        ${indicators.srsi ? `
                        <div class="indicator-card">
                            <span class="ind-title">Stochastic RSI</span>
                            <div class="ind-row"><span>%K</span><span>${formatNumber(indicators.srsi.k, 1)}</span></div>
                            <div class="ind-row"><span>%D</span><span>${formatNumber(indicators.srsi.d, 1)}</span></div>
                            <div class="ind-row"><span>RSI Base</span><span>${formatNumber(indicators.srsi.rsiBase, 1)}</span></div>
                            <div class="ind-row"><span>Señal</span><span>${indicators.srsi.signal}</span></div>
                        </div>
                        ` : ''}
                        ${indicators.volume ? `
                        <div class="indicator-card">
                            <span class="ind-title">Volumen</span>
                            <div class="ind-row"><span>Actual</span><span>${this.formatVolume(indicators.volume.current)}</span></div>
                            <div class="ind-row"><span>Promedio</span><span>${this.formatVolume(indicators.volume.average)}</span></div>
                            <div class="ind-row"><span>Ratio</span><span>${indicators.volume.ratio}x</span></div>
                            ${indicators.volume.obv ? `<div class="ind-row"><span>OBV</span><span>${this.formatVolume(indicators.volume.obv)}</span></div>` : ''}
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
                        <span class="pivot-main">P: ${formatNumber(levels.pivots.pivot, 2)}</span>
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
                    ${patterns.candlePattern ? `<div class="pattern-item"><span class="pattern-label">Vela:</span> ${patterns.candlePattern}</div>` : ''}
                    ${patterns.chartPatterns?.length ? `
                    <div class="pattern-list">
                        <span class="pattern-label">Chart:</span>
                        ${patterns.chartPatterns.map(p => `<span class="pattern-tag">${p}</span>`).join('')}
                    </div>
                    ` : ''}
                    ${patterns.keyObservations?.length ? `
                    <div class="observations-list">
                        <span class="pattern-label">Observaciones:</span>
                        <ul>
                            ${patterns.keyObservations.map(o => `<li>${o}</li>`).join('')}
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
                                <div class="fg-item">
                                    <span>Stocks</span>
                                    <span class="fg-value fg-${this.getFearGreedLevel(fearGreed.stockValue)}">${fearGreed.stockValue} - ${fearGreed.stockLabel}</span>
                                </div>
                                <div class="fg-item">
                                    <span>Crypto</span>
                                    <span class="fg-value fg-${this.getFearGreedLevel(fearGreed.cryptoValue)}">${fearGreed.cryptoValue} - ${fearGreed.cryptoLabel}</span>
                                </div>
                            </div>
                            ${fearGreed.divergenceDetected ? `<p class="fg-divergence">${fearGreed.divergenceDescription}</p>` : ''}
                            <span class="sentiment-impact impact-${fearGreed.sentimentImpact?.toLowerCase()}">${fearGreed.sentimentImpact}</span>
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
                            <p class="geo-assessment">${geopolitical.riskAssessment}</p>
                            <div class="geo-footer">
                                <span class="geo-impact impact-${geopolitical.geopoliticalImpact?.toLowerCase()}">${geopolitical.geopoliticalImpact}</span>
                                ${geopolitical.confluentWithTechnicals !== undefined ? `
                                <span class="geo-confluence ${geopolitical.confluentWithTechnicals ? 'confluent' : 'divergent'}">
                                    ${geopolitical.confluentWithTechnicals ? '<i data-lucide="check" style="width:12px;height:12px;margin-right:2px;vertical-align:middle;"></i>Confluente' : '<i data-lucide="x" style="width:12px;height:12px;margin-right:2px;vertical-align:middle;"></i>Divergente'}
                                </span>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- Risk Management -->
                ${risk ? `
                <div class="detail-section risk-section">
                    <h5>Gestión de Riesgo</h5>
                    ${risk.positionSize ? `<div class="risk-item"><strong>Tamaño de posición:</strong> ${risk.positionSize}</div>` : ''}
                    ${risk.invalidationLong ? `<div class="risk-item invalidation"><strong>Invalidación Long:</strong> ${risk.invalidationLong}</div>` : ''}
                    ${risk.invalidationShort ? `<div class="risk-item invalidation"><strong>Invalidación Short:</strong> ${risk.invalidationShort}</div>` : ''}
                    ${risk.specialRisks?.length ? `
                    <div class="special-risks">
                        <strong>Riesgos especiales:</strong>
                        <ul>
                            ${risk.specialRisks.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
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

                <!-- Targets Achieved -->
                ${detail.targetsAchieved ? `
                <div class="detail-section">
                    <h5>Progreso de Targets</h5>
                    <div class="targets-progress">
                        <div class="targets-bar">
                            <div class="targets-fill" style="width: ${detail.targetsAchieved.percentage}%"></div>
                        </div>
                        <span>${detail.targetsAchieved.count} / ${detail.targetsAchieved.total} targets alcanzados</span>
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
                            <span class="tracking-value">${this.formatVolume(detail.tracking.currentVolume)}</span>
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

                <!-- Metadata -->
                <div class="detail-footer">
                    <span>Procesado: ${formatRelativeTime(detail._processing?.processedAt)}</span>
                    ${detail.metadata?.session ? `<span>Sesión: ${detail.metadata.session}</span>` : ''}
                    ${detail.metadata?.marketCondition ? `<span>${detail.metadata.marketCondition}</span>` : ''}
                </div>

                <!-- Ask Question Section -->
                <div class="ask-question-section">
                    <div class="ask-question-header">
                        <span class="ask-icon">💬</span>
                        <span>Pregunta sobre este análisis</span>
                    </div>
                    <div class="ask-question-form">
                        <textarea
                            id="askQuestionTextarea"
                            class="ask-textarea"
                            placeholder="Escribe tu pregunta (máx. 100 caracteres)..."
                            maxlength="100"
                        ></textarea>
                        <div class="ask-question-actions">
                            <span id="askQuestionCounter" class="char-counter">0/100</span>
                            <button id="askQuestionBtn" class="btn-ask" data-report-id="${detail._id}">
                                Enviar
                            </button>
                        </div>
                    </div>
                    <div id="askQuestionResponse" class="ask-response"></div>
                </div>
            </div>
        `;

        // Setup ask question handlers
        this.setupAskQuestionHandlers(detail._id);
    }

    // Helper methods for report detail
    getRsiClass(rsi) {
        if (rsi >= 70) return 'overbought';
        if (rsi <= 30) return 'oversold';
        return '';
    }

    getFearGreedLevel(value) {
        if (value >= 75) return 'extreme-greed';
        if (value >= 55) return 'greed';
        if (value >= 45) return 'neutral';
        if (value >= 25) return 'fear';
        return 'extreme-fear';
    }

    formatVolume(vol) {
        if (!vol) return '--';
        if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M';
        if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
        return vol.toString();
    }

    // ========== ASK QUESTION HANDLERS ==========

    setupAskQuestionHandlers(reportId) {
        const textarea = document.getElementById('askQuestionTextarea');
        const counter = document.getElementById('askQuestionCounter');
        const btn = document.getElementById('askQuestionBtn');

        if (!textarea || !btn) return;

        // Character counter
        textarea.addEventListener('input', () => {
            const length = textarea.value.length;
            counter.textContent = `${length}/100`;
            counter.classList.toggle('limit-reached', length >= 100);
        });

        // Enter to submit (without shift)
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!btn.disabled) {
                    this.submitQuestion(reportId);
                }
            }
        });

        // Button click
        btn.addEventListener('click', () => {
            this.submitQuestion(reportId);
        });
    }

    async submitQuestion(reportId) {
        const textarea = document.getElementById('askQuestionTextarea');
        const btn = document.getElementById('askQuestionBtn');
        const responseContainer = document.getElementById('askQuestionResponse');

        const question = textarea.value.trim();
        if (!question) return;

        // Disable button and show loading
        btn.disabled = true;
        btn.textContent = 'Enviando...';

        // Show loading in response area
        responseContainer.className = 'ask-response visible loading';
        responseContainer.innerHTML = '<div class="spinner"></div>';

        try {
            const data = await askQuestion(reportId, question);

            // Format and display response
            responseContainer.className = 'ask-response visible';
            const answer = data?.answer || 'No se recibió una respuesta válida.';
            const instrument = data?.instrument;
            const questionAsked = data?.question || question;

            let html = `
                <div class="response-question">
                    <strong>Tu pregunta:</strong>
                    <p>${this.escapeHtml(questionAsked)}</p>
                </div>
                <div class="response-answer">
                    <strong>Respuesta:</strong>
                    <div class="answer-text">${this.formatAnswerText(answer)}</div>
                </div>
            `;

            if (instrument) {
                html += `
                    <div class="response-instrument">
                        <span class="instrument-badge">${instrument.symbol || ''}</span>
                        <span class="instrument-timeframe">${instrument.timeframe || ''}</span>
                    </div>
                `;
            }

            responseContainer.innerHTML = html;

        } catch (error) {
            console.error('[KTI] Error submitting question:', error);
            responseContainer.className = 'ask-response visible error';
            responseContainer.innerHTML = `<p class="error-text">Error al obtener respuesta: ${this.escapeHtml(error.message)}</p>`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Enviar';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatAnswerText(text) {
        if (!text) return '';
        let formatted = this.escapeHtml(text);
        // Convert double line breaks to paragraphs
        formatted = formatted.split('\n\n').map(para => `<p>${para}</p>`).join('');
        // Convert single line breaks to <br>
        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    }

    hideReportsPanel() {
        const panel = document.getElementById('details-panel');
        if (panel) {
            panel.classList.remove('open');
        }
    }

    async loadSymbolDetails(code) {
        const detailsContent = document.getElementById('details-content');
        const detailsTitle = document.getElementById('details-title');
        const detailsEmpty = document.getElementById('details-empty');

        if (!detailsContent) return;

        // Show loading
        if (detailsEmpty) detailsEmpty.style.display = 'none';
        detailsContent.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            // Find the opportunity data - buscar por instrument.symbol
            console.log('[KTI] Looking for opportunity with symbol:', code);
            let opportunity = this.opportunities.find(o => o.instrument?.symbol === code);

            // Si no se encuentra en opportunities, buscar en allSymbols
            if (!opportunity) {
                const symbolData = this.allSymbols.find(s => s.code === code || s.symbol === code);
                if (symbolData) {
                    // Crear un objeto compatible con renderDetails
                    opportunity = {
                        code: symbolData.code,
                        instrument: {
                            symbol: symbolData.symbol,
                            name: symbolData.name,
                            emoji: symbolData.emoji,
                            timeframe: symbolData.timeframe
                        },
                        price: {
                            current: symbolData.price,
                            change: symbolData.change,
                            changePercent: symbolData.changePercent
                        },
                        analysis: symbolData.analysis,
                        indicators: symbolData.indicators
                    };
                }
            }

            console.log('[KTI] Found opportunity:', opportunity ? 'yes' : 'no');

            if (!opportunity) {
                detailsContent.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
                return;
            }

            if (detailsTitle) {
                detailsTitle.textContent = opportunity.instrument?.symbol || code;
            }

            detailsContent.innerHTML = this.renderDetails(opportunity);

        } catch (error) {
            console.error('[KTI] Error loading details:', error);
            detailsContent.innerHTML = '<div class="empty-state"><p>Error loading details</p></div>';
        }
    }

    renderDetails(data) {
        const signal = data.analysis?.mainScenario;
        const price = data.price;

        return `
            <div class="detail-section">
                <div class="detail-header">
                    <span class="detail-emoji">${data.instrument?.emoji || ''}</span>
                    <div class="detail-info">
                        <h4>${data.instrument?.name || data.code}</h4>
                        <span class="detail-timeframe">${data.instrument?.timeframe || ''}</span>
                    </div>
                </div>

                <div class="detail-price" id="detail-price-container">
                    <div class="price-main">${formatNumber(price?.current, 2)}</div>
                    <div class="price-change ${(price?.changePercent || 0) >= 0 ? 'bullish' : 'bearish'}">
                        ${formatPercent(price?.changePercent)}
                    </div>
                </div>
            </div>

            ${signal ? `
            <div class="detail-section">
                <h5>Main Scenario</h5>
                <div class="scenario-info">
                    <span class="signal-badge ${signal.direction?.toLowerCase()}">${signal.direction}</span>
                    <span class="probability">${signal.probability}%</span>
                </div>
                <div class="scenario-levels">
                    <div class="level-row">
                        <span class="level-label">Entry</span>
                        <span class="level-value">${formatNumber(signal.entry, 2)}</span>
                    </div>
                    <div class="level-row">
                        <span class="level-label">Stop Loss</span>
                        <span class="level-value stop">${formatNumber(signal.stopLoss, 2)}</span>
                    </div>
                    ${signal.targets?.map((t, i) => `
                        <div class="level-row">
                            <span class="level-label">Target ${i + 1}</span>
                            <span class="level-value target">${formatNumber(t.level, 2)}</span>
                        </div>
                    `).join('') || ''}
                </div>
            </div>
            ` : ''}

            ${data.analysis?.confidence ? `
            <div class="detail-section">
                <h5>Analysis</h5>
                <div class="analysis-row">
                    <span>Confidence</span>
                    <span class="confidence-value">${data.analysis.confidence}%</span>
                </div>
                <div class="analysis-row">
                    <span>Bias</span>
                    <span>${data.analysis.bias || '--'}</span>
                </div>
            </div>
            ` : ''}

            ${data.indicators ? `
            <div class="detail-section">
                <h5>Indicators</h5>
                <div class="indicators-grid">
                    <div class="indicator-item">
                        <span class="indicator-label">RSI</span>
                        <span class="indicator-value">${formatNumber(data.indicators.momentum?.rsi, 1)}</span>
                    </div>
                    <div class="indicator-item">
                        <span class="indicator-label">ADX</span>
                        <span class="indicator-value">${formatNumber(data.indicators.momentum?.adx, 1)}</span>
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="detail-section">
                <h5>Actions</h5>
                <div class="detail-actions">
                    <button class="btn-action" onclick="app.addToWatchlist('${data.code}')">
                        ${this.watchlist?.hasSymbol(data.code) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                    </button>
                    <button class="btn-action" onclick="app.createAlert('${data.code}')">
                        Create Alert
                    </button>
                </div>
            </div>

            <div class="detail-footer">
                <span>Last updated: ${formatRelativeTime(data._processing?.processedAt)}</span>
            </div>
        `;
    }

    updateDetailsPrice(priceData) {
        const container = document.getElementById('detail-price-container');
        if (!container) return;

        const priceMain = container.querySelector('.price-main');
        const priceChange = container.querySelector('.price-change');

        if (priceMain) priceMain.textContent = formatNumber(priceData.price, 2);
        if (priceChange) {
            priceChange.textContent = formatPercent(priceData.changePercent);
            priceChange.className = `price-change ${priceData.changePercent >= 0 ? 'bullish' : 'bearish'}`;
        }
    }

    // ========== WATCHLIST ==========

    addToWatchlist(code) {
        const symbolData = this.allSymbols.find(s => s.code === code);
        if (symbolData && this.watchlist) {
            if (this.watchlist.hasSymbol(code)) {
                this.watchlist.removeSymbol(code);
            } else {
                this.watchlist.addSymbol(symbolData);
            }
            // Refresh details to update button text
            if (this.selectedSymbol === code) {
                this.loadSymbolDetails(code);
            }
        }
    }

    onWatchlistRemove(code) {
        // Refresh details if viewing this symbol
        if (this.selectedSymbol === code) {
            this.loadSymbolDetails(code);
        }
    }

    // ========== ALERTS ==========

    createAlert(code) {
        // Pre-fill modal with symbol
        const symbolSelect = document.getElementById('alert-symbol');
        if (symbolSelect) {
            symbolSelect.innerHTML = this.allSymbols.map(s =>
                `<option value="${s.code}" ${s.code === code ? 'selected' : ''}>${s.symbol || s.code}</option>`
            ).join('');
        }
        this.openModal('modal-create-alert');
    }

    createAlertFromModal() {
        const symbol = document.getElementById('alert-symbol')?.value;
        const type = document.getElementById('alert-type')?.value;
        const condition = document.getElementById('alert-condition')?.value;
        const value = document.getElementById('alert-price-value')?.value;
        const message = document.getElementById('alert-message')?.value;

        if (!symbol || !type) return;

        const symbolData = this.allSymbols.find(s => s.code === symbol);

        if (this.alertManager) {
            this.alertManager.createAlert({
                symbol,
                symbolName: symbolData?.symbol || symbol,
                type,
                condition,
                value: parseFloat(value),
                message
            });
        }

        this.closeModal();
        this.updateAlertsCount();
    }

    onAlertTrigger(alert, value) {
        console.log('[KTI] Alert triggered:', alert, value);
        this.updateAlertsCount();
    }

    updateAlertsCount() {
        const count = this.alertManager?.getActiveCount() || 0;
        const el = document.getElementById('active-alerts-count');
        if (el) el.textContent = `${count} active alert${count !== 1 ? 's' : ''}`;
    }

    // ========== MODALS ==========

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('visible');
            // Focus first input
            const input = modal.querySelector('input, select');
            if (input) setTimeout(() => input.focus(), 100);
        }
    }

    closeModal() {
        document.querySelectorAll('.modal-overlay.visible').forEach(modal => {
            modal.classList.remove('visible');
        });

        // Also close details panel on mobile
        const detailsPanel = document.getElementById('details-panel');
        if (detailsPanel?.classList.contains('open') && window.innerWidth < 1200) {
            detailsPanel.classList.remove('open');
        }
    }

    // ========== SEARCH ==========

    focusSearch() {
        const input = document.getElementById('search-symbol');
        if (input) {
            this.openModal('modal-add-watchlist');
            setTimeout(() => input.focus(), 100);
        }
    }

    searchSymbols(query) {
        const resultsEl = document.getElementById('symbol-search-results');
        if (!resultsEl) return;

        if (!query || query.length < 1) {
            resultsEl.innerHTML = this.allSymbols.slice(0, 20).map(s => this.renderSearchResult(s)).join('');
            return;
        }

        const q = query.toLowerCase();
        const filtered = this.allSymbols.filter(s =>
            s.code?.toLowerCase().includes(q) ||
            s.symbol?.toLowerCase().includes(q) ||
            s.name?.toLowerCase().includes(q)
        );

        resultsEl.innerHTML = filtered.length > 0
            ? filtered.slice(0, 20).map(s => this.renderSearchResult(s)).join('')
            : '<div class="no-results">No symbols found</div>';
    }

    renderSearchResult(symbol) {
        const inWatchlist = this.watchlist?.hasSymbol(symbol.code);
        return `
            <div class="search-result-item" data-code="${symbol.code}">
                <div class="search-result-info">
                    <span class="search-result-symbol">${symbol.emoji || ''} ${symbol.symbol || symbol.code}</span>
                    <span class="search-result-name">${symbol.name || ''}</span>
                </div>
                <button class="btn-add-to-watchlist ${inWatchlist ? 'added' : ''}"
                        onclick="app.addToWatchlist('${symbol.code}'); event.stopPropagation();">
                    ${inWatchlist ? '<i data-lucide="check" style="width:14px;height:14px;"></i>' : '<i data-lucide="plus" style="width:14px;height:14px;"></i>'}
                </button>
            </div>
        `;
    }

    // ========== SHORTCUTS ==========

    showShortcuts() {
        this.openModal('modal-shortcuts');
    }

    openCommandPalette() {
        // Could implement a command palette here
        this.focusSearch();
    }

    // ========== TIME UPDATER ==========

    startTimeUpdater() {
        const updateTime = () => {
            const el = document.getElementById('market-time');
            if (el) {
                const now = new Date();
                el.textContent = now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
            }
        };

        updateTime();
        setInterval(updateTime, 1000);
    }
}

// Initialize app
const app = new DashboardApp();
window.app = app; // Make available globally for onclick handlers

document.addEventListener('DOMContentLoaded', () => {
    app.init().catch(console.error);
});
