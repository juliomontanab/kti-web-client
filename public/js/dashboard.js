// ========== KTI PROFESSIONAL TRADING DASHBOARD ==========
// Main application orchestrator

import * as API from './core/api.js';
import { askQuestion } from './core/api.js';
import { connectWebSocket, onPriceUpdate, onConnectionStatusChange, realtimePrices } from './core/websocket.js';
import { Storage, Preferences, STORAGE_KEYS } from './core/storage.js';
import { getState, setState, subscribe, APP_VERSION } from './core/state.js';
import { formatNumber, formatPercent, formatDate, formatRelativeTime, getTradingIcon } from './utils/formatters.js';

import { TickerTape } from './components/ticker-tape.js';
import { Watchlist } from './components/watchlist.js';
import { QuotesTable } from './components/quotes-table.js';
import { HeatMap } from './components/heatmap.js';
import { AlertManager } from './components/alerts.js';
import { Screener } from './components/screener.js';
import { setupDefaultShortcuts } from './utils/keyboard.js';
import { renderExecutiveView, renderInvestmentCardView, renderTechnicalView } from './narrative-views.js';

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
            this.quotesTable.setData(this.allSymbols, this.symbolTypes);
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

            // Update tooltip content
            this.updateDefconTooltip(defconData, level);
        }
    }

    updateDefconTooltip(data, level) {
        const geoContext = data.geopoliticalContext || {};

        // Level
        const tooltipLevel = document.querySelector('#tooltip-defcon-level .tooltip-value');
        if (tooltipLevel) {
            tooltipLevel.textContent = `DEFCON ${level}`;
            tooltipLevel.style.color = this.getDefconColor(level);
        }

        // Status
        const tooltipStatus = document.querySelector('#tooltip-defcon-status .tooltip-value');
        if (tooltipStatus) {
            tooltipStatus.textContent = data.status || '--';
        }

        // Risk Classification
        const tooltipRisk = document.querySelector('#tooltip-defcon-risk .tooltip-value');
        if (tooltipRisk) {
            tooltipRisk.textContent = data.riskClassification || '--';
        }

        // Geopolitical Risk Level
        const tooltipGeoRisk = document.getElementById('tooltip-geo-risk');
        if (tooltipGeoRisk && geoContext.riskLevel) {
            tooltipGeoRisk.style.display = 'flex';
            const geoRiskValue = tooltipGeoRisk.querySelector('.tooltip-value');
            if (geoRiskValue) geoRiskValue.textContent = geoContext.riskLevel;
        }

        // Anomaly
        const tooltipAnomaly = document.getElementById('tooltip-anomaly');
        const tooltipAnomalyDesc = document.getElementById('tooltip-anomaly-desc');
        if (tooltipAnomaly && data.anomalyDetected) {
            tooltipAnomaly.style.display = 'block';
            if (tooltipAnomalyDesc && data.anomalyDescription) {
                tooltipAnomalyDesc.textContent = data.anomalyDescription;
            }
        }

        // Recommendation
        const tooltipRecommendation = document.getElementById('tooltip-recommendation');
        const tooltipRecommendationText = document.getElementById('tooltip-recommendation-text');
        if (tooltipRecommendation && data.recommendation) {
            tooltipRecommendation.style.display = 'block';
            if (tooltipRecommendationText) {
                tooltipRecommendationText.textContent = data.recommendation;
            }
        }

        // Re-initialize Lucide icons in tooltip
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    getDefconColor(level) {
        const colors = {
            1: '#ef4444',
            2: '#e67e22',
            3: '#ffa600',
            4: '#3498db',
            5: '#00d26a'
        };
        return colors[level] || '#888888';
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
            console.log('[Dashboard] onPriceUpdate recibido - wsSymbol:', wsSymbol, 'priceData:', priceData);

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
            console.log('[Dashboard] Símbolo seleccionado:', this.selectedSymbol, 'selectedData:', selectedData);

            if (selectedData && selectedData.wsSymbol === wsSymbol) {
                console.log('[Dashboard] MATCH! Actualizando precio del panel de detalles');
                this.updateDetailsPrice(priceData);
            } else {
                console.log('[Dashboard] No match - selectedData.wsSymbol:', selectedData?.wsSymbol, 'vs wsSymbol:', wsSymbol);
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
                        <span class="symbol-emoji">${getTradingIcon(code, symbolData?.type, 40)}</span>
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
                    <span class="symbol-emoji">${getTradingIcon(code, symbolData?.type, 40)}</span>
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

        // Debug: Log detail structure to console
        console.log('[KTI] Report detail structure:', {
            hasExecutive: !!detail.executive,
            hasInvestmentCard: !!detail.investmentCard,
            hasTechnical: !!detail.technical,
            detailKeys: Object.keys(detail)
        });

        const price = detail.technical?.price || detail.price;

        detailsContent.innerHTML = `
            <div class="report-detail">
                <button class="btn-back" onclick="app.loadSymbolReports('${this.expandedSymbol}')">← Volver a reportes</button>

                <!-- Header con precio -->
                <div class="detail-section">
                    <div class="detail-header">
                        <span class="detail-emoji">${getTradingIcon(detail.instrument?.symbol || this.expandedSymbol, detail.instrument?.assetType, 32)}</span>
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

                <!-- Tab Navigation -->
                <nav class="detail-tabs" id="detail-tabs">
                    <button class="detail-tab-btn active" data-detail-tab="executive">
                        <span class="tab-icon">👔</span>
                        <span class="tab-label">Ejecutivo</span>
                    </button>
                    <button class="detail-tab-btn" data-detail-tab="investment">
                        <span class="tab-icon">📋</span>
                        <span class="tab-label">Resumen</span>
                    </button>
                    <button class="detail-tab-btn" data-detail-tab="technical">
                        <span class="tab-icon">📊</span>
                        <span class="tab-label">Técnico</span>
                    </button>
                </nav>

                <!-- Tab Content Container -->
                <div class="detail-tab-content-container">
                    <!-- CAPA 1: EJECUTIVO (Default View) -->
                    <div class="detail-tab-content active" id="detail-tab-executive">
                        ${renderExecutiveView(detail)}
                    </div>

                    <!-- CAPA 2: INVESTMENT CARD -->
                    <div class="detail-tab-content" id="detail-tab-investment">
                        ${renderInvestmentCardView(detail)}
                    </div>

                    <!-- CAPA 3: TECHNICAL -->
                    <div class="detail-tab-content" id="detail-tab-technical">
                        ${renderTechnicalView(detail)}
                    </div>
                </div>

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

        // Setup tab switching for detail tabs
        this.setupDetailTabSwitching();
    }

    setupDetailTabSwitching() {
        const tabButtons = document.querySelectorAll('.detail-tab-btn');
        const tabContents = document.querySelectorAll('.detail-tab-content');

        console.log('[KTI] Setup detail tabs - buttons:', tabButtons.length, 'contents:', tabContents.length);

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.detailTab;
                console.log('[KTI] Tab clicked:', tabId);

                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                const targetContent = document.getElementById(`detail-tab-${tabId}`);
                if (targetContent) {
                    targetContent.classList.add('active');
                    console.log('[KTI] Tab activated:', tabId);
                } else {
                    console.warn('[KTI] Tab content not found:', `detail-tab-${tabId}`);
                }
            });
        });
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
                    <span class="detail-emoji">${getTradingIcon(data.instrument?.symbol || data.code, data.instrument?.assetType, 32)}</span>
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
        if (!container) {
            return;
        }

        const priceMain = container.querySelector('.price-main');
        const priceChange = container.querySelector('.price-change');

        if (!priceMain) return;

        // Get current price from DOM (remove formatting and trim)
        const currentPriceText = priceMain.textContent.trim().replace(/,/g, '');
        const currentPrice = parseFloat(currentPriceText);
        const newPrice = priceData.price;

        // Format both prices to 2 decimals for comparison (same as display format)
        const currentPriceFormatted = formatNumber(currentPrice, 2);
        const newPriceFormatted = formatNumber(newPrice, 2);

        // Only update if the formatted price is different
        // Empty or NaN current value means first render, so update without animation
        if (!currentPriceText || isNaN(currentPrice) || currentPriceFormatted !== newPriceFormatted) {
            const isFirstUpdate = !currentPriceText || isNaN(currentPrice);

            if (!isFirstUpdate) {
                console.log('[Dashboard] Precio cambiado de', currentPriceFormatted, 'a', newPriceFormatted);
            }

            // Update price
            priceMain.textContent = newPriceFormatted;

            // Only add blink animation if it's not the first update
            if (!isFirstUpdate) {
                container.classList.remove('price-update-blink');
                // Force reflow to restart animation
                void container.offsetWidth;
                container.classList.add('price-update-blink');

                // Remove animation class after it completes
                setTimeout(() => {
                    container.classList.remove('price-update-blink');
                }, 600);
            }
        }

        // Update the change percentage only if it changed
        if (priceChange) {
            const currentChangeText = priceChange.textContent.trim();
            const newChangeText = formatPercent(priceData.changePercent);
            const newClassName = `price-change ${priceData.changePercent >= 0 ? 'bullish' : 'bearish'}`;

            if (!currentChangeText || currentChangeText !== newChangeText || priceChange.className !== newClassName) {
                priceChange.textContent = newChangeText;
                priceChange.className = newClassName;
            }
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
