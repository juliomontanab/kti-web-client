// ========== QUOTES TABLE COMPONENT ==========
import { formatNumber, formatPercent, formatSignal, formatConfidence, getChangeClass, getTradingIcon } from '../utils/formatters.js';

export class QuotesTable {
    constructor(container, options = {}) {
        this.container = container;
        this.tbody = container.querySelector('tbody') || container;
        this.data = [];
        this.symbolTypes = [];
        this.sortColumn = 'symbol';
        this.sortDirection = 'asc';
        this.selectedCode = null;
        this.onSelect = options.onSelect || (() => {});
        this.sparklines = new Map();

        // Orden predefinido de tipos
        this.typeOrder = ['INDEX', 'STOCK', 'FUTURES', 'CRYPTO', 'FOREX'];

        this.bindEvents();
    }

    setData(data, symbolTypes = []) {
        this.data = data;
        this.symbolTypes = symbolTypes;
        this.render();
    }

    updatePrice(wsSymbol, priceData) {
        const row = this.tbody.querySelector(`.quote-row[data-ws-symbol="${wsSymbol}"]`);
        if (!row) return;

        const code = row.dataset.code;
        const priceCell = row.querySelector('.col-price');
        const changeCell = row.querySelector('.col-change');
        if (!priceCell || !changeCell) return;

        // Get current values from DOM
        const currentPriceText = priceCell.textContent.trim();
        const currentChangeText = changeCell.textContent.trim();

        // Check if this is first render (empty or placeholder)
        const isFirstRender = !currentPriceText || currentPriceText === '--' || !currentChangeText || currentChangeText === '--';

        // Format new values
        const newPriceFormatted = formatNumber(priceData.price, 2);
        const newChangeFormatted = formatPercent(priceData.changePercent);

        // Compare formatted strings (what user sees) instead of numbers
        const priceChanged = currentPriceText !== newPriceFormatted;
        const changeChanged = currentChangeText !== newChangeFormatted;

        // Debug logging for the 3 instruments that are blinking
        if (['GOLD', 'SILVER', 'COPPER'].includes(wsSymbol)) {
            console.log(`[${wsSymbol}] Current: "${currentPriceText}" / "${currentChangeText}"`);
            console.log(`[${wsSymbol}] New: "${newPriceFormatted}" / "${newChangeFormatted}"`);
            console.log(`[${wsSymbol}] Changed? price=${priceChanged}, change=${changeChanged}`);
        }

        // Update if first render OR if formatted values changed
        if (isFirstRender) {
            // First render: just update, no animation
            priceCell.textContent = newPriceFormatted;
            changeCell.textContent = newChangeFormatted;
            changeCell.classList.remove('bullish', 'bearish');
            changeCell.classList.add(getChangeClass(priceData.changePercent));
        } else if (priceChanged || changeChanged) {
            // Subsequent update with actual change: update with animation
            console.log(`[${wsSymbol}] ANIMATING - values changed`);
            priceCell.textContent = newPriceFormatted;
            changeCell.textContent = newChangeFormatted;
            changeCell.classList.remove('bullish', 'bearish');
            changeCell.classList.add(getChangeClass(priceData.changePercent));

            // Apply flash animation and remove it after completion
            row.style.animation = 'none';
            row.offsetHeight;
            row.style.animation = priceData.changePercent >= 0 ? 'priceFlash 0.3s ease' : 'priceFlashDown 0.3s ease';

            // Remove animation style after it completes to prevent re-triggering
            setTimeout(() => {
                row.style.animation = '';
            }, 300);
        }

        // Update internal data if changed
        if (!isFirstRender && (priceChanged || changeChanged)) {
            const item = this.data.find(d => d.code === code);
            if (item) {
                item.price = priceData.price;
                item.change = priceData.change;
                item.changePercent = priceData.changePercent;
            }
        }
    }

    sort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.render();
        this.updateSortIndicators();
    }

    selectRow(code, triggerCallback = false) {
        this.selectedCode = code;
        this.tbody.querySelectorAll('.quote-row').forEach(row => {
            row.classList.toggle('selected', row.dataset.code === code);
        });
        // Solo llamar onSelect si se solicita explícitamente (ej: click directo en la tabla)
        if (triggerCallback) {
            this.onSelect(code);
        }
    }

    render() {
        const sorted = this.getSortedData();
        const grouped = this.groupByType(sorted);

        let html = '';
        for (const group of grouped) {
            // Render section header
            html += this.renderSectionHeader(group.type, group.typeName);
            // Render rows for this type
            html += group.symbols.map(row => this.renderRow(row)).join('');
        }

        this.tbody.innerHTML = html;

        // Debug: Log wsSymbol mapping for all rows
        console.log('[QuotesTable] Rendered rows with wsSymbol mapping:',
            sorted.map(d => ({ code: d.code, wsSymbol: d.wsSymbol || d.symbol || d.code }))
        );

        // Refresh Lucide icons
        if (window.refreshLucideIcons) window.refreshLucideIcons();

        // Initialize sparklines after render
        this.initSparklines();
    }

    groupByType(data) {
        // Agrupar símbolos por tipo
        const groups = {};

        for (const symbol of data) {
            const type = (symbol.type || 'OTHER').toUpperCase();
            if (!groups[type]) {
                groups[type] = {
                    type: type,
                    typeName: this.getTypeName(type),
                    symbols: []
                };
            }
            groups[type].symbols.push(symbol);
        }

        // Ordenar grupos según el orden predefinido
        const sortedGroups = [];
        for (const type of this.typeOrder) {
            if (groups[type]) {
                sortedGroups.push(groups[type]);
                delete groups[type];
            }
        }
        // Agregar tipos que no están en el orden predefinido al final
        for (const type of Object.keys(groups)) {
            sortedGroups.push(groups[type]);
        }

        return sortedGroups;
    }

    getTypeName(type) {
        // Buscar el nombre del tipo en symbolTypes
        const typeInfo = this.symbolTypes.find(t => t.code?.toUpperCase() === type);
        if (typeInfo) return typeInfo.name;

        // Nombres por defecto
        const defaultNames = {
            'INDEX': 'Indices',
            'STOCK': 'Stocks',
            'FUTURES': 'Futures',
            'CRYPTO': 'Crypto',
            'FOREX': 'Forex',
            'OTHER': 'Other'
        };
        return defaultNames[type] || type;
    }

    renderSectionHeader(type, typeName) {
        return `
            <tr class="section-header" data-type="${type}">
                <td colspan="6">
                    <span class="section-title">${typeName.toUpperCase()}</span>
                </td>
            </tr>
        `;
    }

    getSortedData() {
        return [...this.data].sort((a, b) => {
            let aVal = a[this.sortColumn];
            let bVal = b[this.sortColumn];

            // Handle nested properties
            if (this.sortColumn === 'confidence') {
                aVal = a.analysis?.confidence || 0;
                bVal = b.analysis?.confidence || 0;
            } else if (this.sortColumn === 'signal') {
                aVal = a.analysis?.mainScenario?.direction || '';
                bVal = b.analysis?.mainScenario?.direction || '';
            }

            // Handle strings
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            const dir = this.sortDirection === 'asc' ? 1 : -1;
            if (aVal < bVal) return -1 * dir;
            if (aVal > bVal) return 1 * dir;
            return 0;
        });
    }

    renderRow(data) {
        const selected = data.code === this.selectedCode ? 'selected' : '';
        const price = formatNumber(data.price, data.decimals || 2);
        const changeClass = getChangeClass(data.changePercent);
        const change = formatPercent(data.changePercent);
        const confidence = formatConfidence(data.analysis?.confidence);
        const signal = formatSignal(data.analysis?.mainScenario?.direction);
        // Usar wsSymbol para el mapeo con WebSocket (GOLD, BTCUSD, etc.)
        const wsSymbol = data.wsSymbol || data.symbol || data.code;
        const type = (data.type || 'OTHER').toUpperCase();

        return `
            <tr class="quote-row ${selected}" data-code="${data.code}" data-ws-symbol="${wsSymbol}" data-type="${type}">
                <td class="col-symbol">
                    <span class="symbol-emoji">${getTradingIcon(data.code, data.type, 16)}</span>
                    ${data.fullName || data.symbol || data.code}
                </td>
                <td class="col-price">${price}</td>
                <td class="col-change ${changeClass}">${change}</td>
                <td class="col-confidence">
                    <span class="confidence-badge ${confidence.class}">${confidence.text}</span>
                </td>
                <td class="col-spark">
                    <div class="spark-container" id="spark-table-${data.code}"></div>
                </td>
                <td class="col-signal">
                    <span class="signal-badge ${signal.class}">${signal.text}</span>
                </td>
            </tr>
        `;
    }

    updateSortIndicators() {
        const headers = this.container.querySelectorAll('th[data-sort]');
        headers.forEach(th => {
            th.classList.remove('sorted', 'asc', 'desc');
            const sortIcon = th.querySelector('.sort-icon');

            if (th.dataset.sort === this.sortColumn) {
                th.classList.add('sorted', this.sortDirection);
                if (sortIcon) sortIcon.textContent = this.sortDirection === 'asc' ? '▲' : '▼';
            } else {
                if (sortIcon) sortIcon.textContent = '';
            }
        });
    }

    initSparklines() {
        // Clear existing sparklines
        this.sparklines.forEach(chart => chart.remove());
        this.sparklines.clear();

        // Create new sparklines for visible rows
        this.data.forEach(item => {
            const container = document.getElementById(`spark-table-${item.code}`);
            if (container && item.ohlcData && typeof LightweightCharts !== 'undefined') {
                this.createSparkline(container, item);
            }
        });
    }

    createSparkline(container, item) {
        const chart = LightweightCharts.createChart(container, {
            width: 80,
            height: 30,
            handleScroll: false,
            handleScale: false,
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: 'transparent',
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { visible: false },
            },
            rightPriceScale: { visible: false },
            timeScale: { visible: false },
            crosshair: { mode: 0 },
        });

        const isBullish = (item.changePercent || 0) >= 0;
        const series = chart.addAreaSeries({
            lineColor: isBullish ? '#00d26a' : '#ff3b3b',
            topColor: isBullish ? 'rgba(0, 210, 106, 0.3)' : 'rgba(255, 59, 59, 0.3)',
            bottomColor: 'transparent',
            lineWidth: 1,
        });

        if (item.ohlcData) {
            const lineData = item.ohlcData.map(d => ({
                time: d.time,
                value: d.close
            }));
            series.setData(lineData);
        }

        this.sparklines.set(item.code, chart);
    }

    updateSparkline(code, ohlcData) {
        const chart = this.sparklines.get(code);
        if (chart && ohlcData) {
            const series = chart.getSeries()[0];
            if (series) {
                const lineData = ohlcData.map(d => ({
                    time: d.time,
                    value: d.close
                }));
                series.setData(lineData);
            }
        }
    }

    bindEvents() {
        // Sort on header click
        this.container.addEventListener('click', (e) => {
            const th = e.target.closest('th[data-sort]');
            if (th) {
                this.sort(th.dataset.sort);
                return;
            }

            const row = e.target.closest('.quote-row');
            if (row) {
                this.selectRow(row.dataset.code, true); // true = trigger callback para click directo
            }
        });
    }

    destroy() {
        this.sparklines.forEach(chart => chart.remove());
        this.sparklines.clear();
    }
}
