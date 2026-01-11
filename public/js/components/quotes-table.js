// ========== QUOTES TABLE COMPONENT ==========
import { formatNumber, formatPercent, formatSignal, formatConfidence, getChangeClass, getTradingIcon } from '../utils/formatters.js';

export class QuotesTable {
    constructor(container, options = {}) {
        this.container = container;
        this.tbody = container.querySelector('tbody') || container;
        this.data = [];
        this.sortColumn = 'symbol';
        this.sortDirection = 'asc';
        this.selectedCode = null;
        this.onSelect = options.onSelect || (() => {});
        this.sparklines = new Map();

        this.bindEvents();
    }

    setData(data) {
        this.data = data;
        this.render();
    }

    updatePrice(wsSymbol, priceData) {
        console.log('[QuotesTable] ======== updatePrice START ========');
        console.log('[QuotesTable] wsSymbol recibido:', wsSymbol);
        console.log('[QuotesTable] wsSymbol type:', typeof wsSymbol);
        console.log('[QuotesTable] wsSymbol length:', wsSymbol.length);

        // DEBUG: Log all available wsSymbols in table con detalles
        const allRows = Array.from(this.tbody.querySelectorAll('.quote-row'));
        console.log('[QuotesTable] Total rows in table:', allRows.length);

        allRows.forEach((row, index) => {
            const wsSymbolAttr = row.dataset.wsSymbol;
            const code = row.dataset.code;
            console.log(`[QuotesTable] Row ${index}: code="${code}", wsSymbol="${wsSymbolAttr}", type=${typeof wsSymbolAttr}, length=${wsSymbolAttr?.length}`);
        });

        // Buscar por data-ws-symbol que contiene el símbolo del WebSocket (GOLD, BTCUSD, etc.)
        const selector = `.quote-row[data-ws-symbol="${wsSymbol}"]`;
        console.log('[QuotesTable] Selector usado:', selector);

        const row = this.tbody.querySelector(selector);
        console.log('[QuotesTable] Row encontrado:', row ? 'SI' : 'NO');

        if (!row) {
            console.log('[QuotesTable] NO ROW FOUND for wsSymbol:', wsSymbol);
            console.log('[QuotesTable] ======== updatePrice END (NO MATCH) ========');
            return;
        }
        const code = row.dataset.code;

        const priceCell = row.querySelector('.col-price');
        const changeCell = row.querySelector('.col-change');

        // Get current values from DOM (trim to remove whitespace)
        const currentPriceText = priceCell ? priceCell.textContent.trim().replace(/,/g, '') : '';
        const currentChangeText = changeCell ? changeCell.textContent.trim() : '';

        // Format new values
        const newPriceFormatted = formatNumber(priceData.price, 2);
        const newChangeFormatted = formatPercent(priceData.changePercent);

        console.log('[QuotesTable] updatePrice:', {
            wsSymbol,
            code,
            currentPriceText,
            currentChangeText,
            newPriceFormatted,
            newChangeFormatted
        });

        // Only update if values actually changed (compare formatted strings)
        // Empty current value means first render, so update
        let hasChanged = false;

        if (priceCell) {
            // Compare numeric values, not formatted strings
            const currentPrice = parseFloat(currentPriceText.replace(/,/g, ''));
            const newPrice = priceData.price;

            // Update if: empty, placeholder '--', or different numeric value
            if (!currentPriceText || currentPriceText === '--' || currentPrice !== newPrice) {
                console.log('[QuotesTable] Updating price:', currentPrice, '->', newPrice);
                priceCell.textContent = newPriceFormatted;
                hasChanged = true;
            } else {
                console.log('[QuotesTable] Price unchanged:', currentPrice, '===', newPrice);
            }
        }

        if (changeCell) {
            // Compare numeric values for change percent
            const currentChangePercent = parseFloat(currentChangeText.replace(/[%+\s]/g, ''));
            const newChangePercent = priceData.changePercent;

            // Update if: empty, placeholder '--', or different numeric value
            if (!currentChangeText || currentChangeText === '--' || currentChangePercent !== newChangePercent) {
                console.log('[QuotesTable] Updating change:', currentChangePercent, '->', newChangePercent);
                changeCell.textContent = newChangeFormatted;
                changeCell.classList.remove('bullish', 'bearish');
                changeCell.classList.add(getChangeClass(priceData.changePercent));
                hasChanged = true;
            } else {
                console.log('[QuotesTable] Change unchanged:', currentChangePercent, '===', newChangePercent);
            }
        }

        // Only apply flash animation if something changed AND it's not the first update
        if (hasChanged) {
            // Only animate if there was a previous value (not first load)
            if (currentPriceText && currentChangeText && currentPriceText !== '--' && currentChangeText !== '--') {
                row.style.animation = 'none';
                row.offsetHeight;
                row.style.animation = priceData.changePercent >= 0 ? 'priceFlash 0.3s ease' : 'priceFlashDown 0.3s ease';
            }

            // Update data
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

        this.tbody.innerHTML = sorted.map(row => this.renderRow(row)).join('');

        // Debug: Log wsSymbol mapping for all rows
        console.log('[QuotesTable] Rendered rows with wsSymbol mapping:',
            sorted.map(d => ({ code: d.code, wsSymbol: d.wsSymbol || d.symbol || d.code }))
        );

        // Refresh Lucide icons
        if (window.refreshLucideIcons) window.refreshLucideIcons();

        // Initialize sparklines after render
        this.initSparklines();
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

        return `
            <tr class="quote-row ${selected}" data-code="${data.code}" data-ws-symbol="${wsSymbol}">
                <td class="col-symbol">
                    <span class="symbol-emoji">${getTradingIcon(data.code, data.type, 16)}</span>
                    ${data.symbol || data.code}
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
